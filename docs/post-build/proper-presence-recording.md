# ROLL SYNC — AUDIT, IMPLEMENT & HARDEN AUTOMATIC TEACHER ABSENCE

## Context

Roll SYNC now has an existing school attendance infrastructure and a functioning teacher check-in workflow.

The database already contains real test organization data, including:

- TEST International Academy
- existing teachers
- existing subjects
- SS3 Platinum
- existing timetable schedules
- Class QR identities
- teacher QR check-in
- Attendance Sessions
- organization dashboard/reporting

The timetable has now been populated with realistic schedules.

A critical piece of attendance logic has been identified as missing:

> When a scheduled teaching period has completely passed for the day and the assigned teacher did not check in, that teacher/class occurrence should automatically be recorded as absent/missed for that period and become visible in the organization dashboard/reporting.

This is NOT simply a UI change.

Before implementing anything, you MUST understand how Roll SYNC currently defines, collects, stores, resolves, and displays attendance.

---

# 1. DO NOT CODE IMMEDIATELY

Your first task is to reverse-engineer the current application.

Read the relevant source code, Prisma schema, actions, queries, dashboard aggregation, timetable logic, attendance logic, QR check-in flow, and existing migrations.

Do not assume the architecture.

Understand the existing implementation as it actually exists.

At minimum inspect:

### Authentication / identity
- Better Auth configuration
- User
- Membership
- Person
- Person types
- teacher identity resolution
- organization authorization

### Organization
- Organization
- organization settings
- organization dashboard
- organization-level statistics

### People
- Person
- linked User
- teacher/member relationships
- active/inactive state

### Classes
- Class
- Class membership
- Class publicCode
- QR generation

### Subjects
- Subject
- teacher/subject/class relationships

### Timetable
- timetable models
- timetable assignments
- weekday schedules
- start/end times
- effective dates
- exceptions
- cancelled/rescheduled/substitute logic
- conflict detection

### Attendance
Inspect EVERY existing attendance-related model and flow.

Determine:

- What represents expected attendance?
- What represents an actual attendance occurrence?
- What represents teacher check-in?
- What represents an attendance session?
- What represents an attendance record?
- What statuses currently exist?
- Where are timestamps stored?
- How is arrival status calculated?
- How does QR check-in create/update attendance data?
- How does manual sign-in behave?
- How are duplicate sessions prevented?
- How is attendance queried for dashboards?
- How are reports generated?
- What data is currently shown to organization admins?

### Dashboard
Trace the organization dashboard from database → server action/query → aggregation → UI.

Determine exactly how the dashboard currently calculates:

- scheduled classes
- started sessions
- completed sessions
- teacher check-ins
- late check-ins
- missed/unconfirmed classes
- attendance
- trends
- daily statistics

Do not create a parallel dashboard data system.

---

# 2. BUILD A MENTAL MODEL BEFORE CHANGING CODE

Before implementation, establish the existing lifecycle:

```text
Organization
    ↓
Teacher Person
    ↓
Teacher ↔ Subject ↔ Class
    ↓
Timetable Schedule
    ↓
Expected class occurrence
    ↓
Teacher check-in
    ↓
Attendance Session
    ↓
Attendance outcome
    ↓
Dashboard / Reports
````

Determine exactly where the new automatic absence resolution belongs.

The important conceptual distinction is:

> A timetable describes what SHOULD happen.
>
> A teacher check-in records what ACTUALLY happened.
>
> The system must resolve an expected occurrence that never received a check-in.

Do not confuse:

* timetable
* attendance session
* attendance record
* teacher arrival status
* student attendance

Student attendance is NOT the focus of this task.

---

# 3. DEFINE THE AUTOMATIC ABSENCE RULE

For every scheduled teacher timetable occurrence:

### Before the period starts

Status should remain something equivalent to:

```text
EXPECTED
```

or whatever equivalent status already exists.

Do NOT mark the teacher absent early.

---

### During the period

If the teacher has not checked in:

```text
EXPECTED / PENDING
```

or the existing equivalent.

Do not prematurely mark absent.

---

### After the scheduled period ends

If:

```text
current server time > scheduled end time
```

AND

```text
no valid teacher check-in/session exists
```

then the occurrence must be automatically resolved as:

```text
ABSENT / MISSED
```

Use the application's existing terminology if it already has an appropriate status.

Do NOT invent a second competing status system if one already exists.

---

# 4. IMPORTANT: ABSENCE MUST BE OCCURRENCE-SPECIFIC

This is critical.

A teacher being absent from one period does NOT mean the teacher is absent for the entire day.

Example:

```text
Monday

08:00–09:00 Mathematics
Charles → checked in

09:00–10:00 Biology
Peculiar → DID NOT CHECK IN

10:00–11:00 Chemistry
Francis → checked in
```

Only the Biology occurrence should become absent.

The system must identify the specific:

* organization
* timetable occurrence
* date
* teacher
* class
* subject
* scheduled period

Do not create a generic "teacher absent today" record.

---

# 5. USE SERVER TIME

Automatic absence resolution must use authoritative server/database time.

Do NOT rely on:

* browser clock
* client timestamp
* local JavaScript time supplied by the browser
* user-provided timestamp

The server should determine whether the period has actually ended.

Also correctly handle:

* organization timezone
* current date
* weekday
* schedule effective dates

If the application already has an organization timezone mechanism, reuse it.

If it does not, inspect the existing date/time conventions before introducing anything new.

Do not introduce a large timezone system unless genuinely required.

---

# 6. DO NOT USE A BROWSER TIMER AS THE SOURCE OF TRUTH

Do NOT implement this as:

```text
setTimeout(...)
→ mark teacher absent
```

That would fail when:

* nobody has the dashboard open
* browser closes
* deployment restarts
* user loses connection
* server restarts
* page is backgrounded

The absence resolution must be server-side and durable.

---

# 7. CHOOSE THE SMALLEST CORRECT SERVER-SIDE MECHANISM

Inspect the existing architecture before choosing how automatic resolution runs.

The project already has BullMQ available for asynchronous jobs.

Determine whether the existing worker/queue infrastructure can safely support scheduled attendance resolution.

Prefer reusing existing infrastructure.

Possible architecture:

```text
BullMQ / existing worker
        ↓
Attendance resolution job
        ↓
Find ended timetable occurrences
        ↓
Check whether valid teacher attendance exists
        ↓
Resolve missing occurrence
        ↓
Persist absence/missed outcome
        ↓
Dashboard queries naturally include it
```

But DO NOT blindly add a new queue or worker.

First inspect whether the current project already has:

* worker infrastructure
* repeatable jobs
* scheduled jobs
* cron mechanisms
* attendance workers
* Vercel cron support
* existing background processing

Use the smallest architecture consistent with the current application.

---

# 8. IDEMPOTENCY IS REQUIRED

Automatic absence resolution must be safe to run repeatedly.

For example:

```text
Job runs at 09:05
→ resolves Monday 08:00 class as absent

Job runs again at 09:10
→ does NOT create another absence

Job runs again at 10:00
→ does NOT create another absence
```

There must be one canonical attendance outcome for a specific occurrence.

Use existing database constraints where possible.

If the current schema already has a unique occurrence/session identity, reuse it.

Do not create duplicate absence records.

Handle concurrent execution safely.

---

# 9. DO NOT CREATE ABSENCE IF A VALID CHECK-IN EXISTS

This must be authoritative.

Example:

```text
08:00 class
Teacher checks in at 07:56
Attendance Session exists
```

After 09:00:

```text
Do NOT mark absent.
```

Likewise:

```text
Teacher checks in at 08:17
```

After the period ends:

```text
Do NOT mark absent.
```

Instead preserve the existing late/arrival status.

Automatic absence is only for:

> expected occurrence + period ended + no valid teacher attendance.

---

# 10. HANDLE TIMETABLE EXCEPTIONS

Before marking absent, verify the occurrence was not:

* cancelled
* rescheduled
* substituted
* otherwise disabled by an existing timetable exception
* affected by an organization-wide blocked period/event if the current system supports this

If the period was cancelled:

```text
DO NOT mark teacher absent.
```

If the teacher was legitimately substituted:

```text
DO NOT mark the original teacher absent
```

unless the existing application's business rules explicitly say otherwise.

Reuse the existing exception logic.

Do not create a second exception system.

---

# 11. HANDLE FUTURE / INACTIVE SCHEDULES

Only resolve schedules that are actually active for the current date.

Respect:

* effectiveStart
* effectiveEnd
* active/inactive status
* weekday
* exceptions

Do not mark historical or future schedules incorrectly.

---

# 12. DASHBOARD INTEGRATION

The absence must appear naturally in the existing organization dashboard.

Do NOT create a second dashboard aggregation system.

Trace how the dashboard currently collects data and modify the existing aggregation/query layer where necessary.

For example, the organization dashboard should be able to show something conceptually like:

```text
Today's Classes

08:00  Mathematics       Charles     Checked in
09:00  Biology           Peculiar     Absent
10:00  Chemistry         Francis      Checked in
11:00  Physics Mechanics Seriki       Late
12:00  BREAK
12:30  Physics Electricity Ayo        Checked in
```

Use the actual existing dashboard design and terminology.

Do not force this exact UI if the current dashboard has a different presentation.

The important thing is that the absence is based on real persisted attendance state.

---

# 13. REPORTING

Inspect `/[slug]/reports`.

Ensure the automatically resolved absence is reflected in existing reporting.

For example:

```text
Teacher
Scheduled
Checked In
Late
Absent/Missed
```

Only expose metrics the existing reporting model supports.

Do not fabricate analytics.

Do not add fake trends.

---

# 14. DATA MODEL

Do NOT immediately add a new database table.

First determine whether the current attendance model can represent:

```text
EXPECTED
CHECKED_IN
LATE
ABSENT/MISSED
CANCELLED
```

or equivalent states.

If the existing schema already supports the necessary state, use it.

If a schema change is genuinely required:

1. explain why
2. make the smallest possible change
3. add the migration
4. preserve all existing attendance data
5. do not redesign unrelated tables

The existing attendance architecture is the source of truth.

---

# 15. IMPORTANT: CLEAN UP THE DATABASE FROM THE LAST BUILD

The previous timetable/QR/testing work created data specifically for development and testing.

Before adding or changing automatic absence resolution:

AUDIT the existing database for test bloat.

Identify:

* duplicate timetable entries
* duplicate schedule rows
* obsolete test schedules
* duplicate attendance sessions
* abandoned test records
* duplicate classes
* duplicate subjects
* duplicate rooms
* orphaned relationships
* stale development records
* obsolete migration artifacts
* data created by previous failed implementations

DO NOT blindly delete data.

First determine which records are:

### Legitimate existing organization data

versus

### Test/build artifacts

Only clean records that are clearly associated with previous development/testing and are safe to remove.

The existing real organization structure must remain intact.

Especially preserve:

* TEST International Academy
* existing teachers
* existing People
* existing Users
* existing Memberships
* existing Class records
* existing Subjects that are legitimately in use
* existing class QR identities

Do not recreate these.

---

# 16. DATABASE CLEANUP MUST BE SAFE

Before destructive cleanup:

* inspect relationships
* inspect foreign keys
* inspect attendance dependencies
* inspect timetable dependencies
* inspect class membership dependencies
* inspect QR/publicCode references

Prefer targeted deletion of clearly identified test artifacts.

If something cannot be confidently classified as disposable:

DO NOT DELETE IT.

Instead report it.

Never use:

```text
TRUNCATE
```

or:

```text
delete everything and reseed
```

for this task.

Do not reset the database.

---

# 17. REMOVE CODE BLOAT FROM THE LAST BUILD

Audit the codebase for leftovers from previous iterations.

Look for:

* duplicate attendance actions
* obsolete teacher sign-in logic
* duplicate timetable resolution
* unused QR scanner code
* obsolete invitation/claim flows
* unused components
* dead server actions
* unused imports
* duplicated validation
* duplicated organization authorization
* old experimental routes
* temporary debug logging
* console logs
* commented-out implementations
* abandoned UI
* unused dependencies

Do not remove anything merely because it looks unused.

Confirm it is genuinely obsolete first.

The goal is:

> one canonical implementation for each responsibility.

---

# 18. QR CHECK-IN MUST REMAIN INTACT

Do not regress the recently fixed Class QR check-in flow.

The existing flow must remain:

```text
Class QR
 ↓
publicCode
 ↓
resolve class
 ↓
authenticated teacher
 ↓
organization membership
 ↓
teacher/class relationship
 ↓
today's timetable occurrence
 ↓
time/exception validation
 ↓
preview
 ↓
explicit teacher confirmation
 ↓
Attendance Session
```

Automatic absence must integrate with this system.

It must not create a competing teacher attendance mechanism.

---

# 19. ATTENDANCE SEMANTICS

Be careful with terminology.

A teacher who never checked in should not necessarily be treated as a generic "absent person" record if the current architecture distinguishes:

* attendance session
* expected occurrence
* attendance status
* missed session

Use the existing semantic model.

The important business meaning is:

> The scheduled teacher did not check in before the scheduled period ended.

Preserve the ability to distinguish this from:

* teacher arrived late
* class was cancelled
* class was rescheduled
* substitute teacher handled it
* session is still upcoming
* session is currently active
* no check-in yet but period has not ended

---

# 20. TEST THE FULL STATE MACHINE

Create tests for:

### Upcoming

```text
08:00 class
Current time: 07:30

→ NOT absent
```

### Active / not yet checked in

```text
08:00–09:00
Current time: 08:30
No check-in

→ NOT absent yet
```

### Checked in

```text
Teacher checked in at 08:10

At 09:01:

→ NOT absent
→ preserve arrival status
```

### Late check-in

```text
Teacher checks in at 08:20

At 09:01:

→ NOT absent
→ preserve late status
```

### Missed

```text
08:00–09:00
No check-in

At 09:01:

→ resolve as absent/missed
```

### Cancelled

```text
08:00–09:00
Cancelled

At 09:01:

→ NOT absent
```

### Substitute

```text
Original teacher replaced by substitute

→ original teacher should not incorrectly become absent
```

### Duplicate execution

Run resolver twice:

```text
→ exactly one attendance outcome
```

### Different weekdays

Verify:

```text
Monday 08:00 Mathematics
Wednesday 10:30 Biology
```

are treated as completely separate occurrences.

---

# 21. ORGANIZATION ISOLATION

All resolution queries must be organization-scoped.

A job resolving:

```text
TEST International Academy
```

must never touch another organization.

Verify:

* organization ID is explicit
* timetable belongs to organization
* teacher belongs to organization
* class belongs to organization
* subject belongs to organization
* attendance belongs to organization
* no cross-org updates are possible

Do not infer organization from client input.

---

# 22. RLS / AUTHORIZATION

Respect the application's existing security model.

Do not:

* disable RLS
* weaken RLS
* bypass organization authorization
* expose internal CUIDs to clients unnecessarily
* trust client-supplied teacher IDs
* trust client-supplied organization IDs
* trust client timestamps

If background workers require privileged database access, ensure the job itself performs explicit organization-scoped authorization/ownership checks before mutation.

Document this clearly in the implementation.

---

# 23. PERFORMANCE

Optimize the resolver for production.

Do NOT:

```text
load every timetable row
→ loop through everything
→ query attendance individually
```

Avoid N+1 queries.

Prefer:

* targeted date/window query
* active schedules only
* relevant ended occurrences only
* efficient relation loading
* indexed fields
* batch resolution where appropriate

Inspect existing indexes before adding new ones.

Only add indexes if the actual query pattern requires them.

---

# 24. DO NOT OVERBUILD

Do not introduce:

* a new calendar engine
* a new attendance service
* realtime
* WebSockets
* Socket.IO
* new authentication
* new organization system
* new reporting system
* duplicate timetable system
* unnecessary dependencies

Reuse the existing architecture.

---

# 25. PRODUCTION CLEANUP

After implementation:

```bash
pnpm install
pnpm lint
pnpm run build
```

Also run relevant tests.

Fix all errors introduced by this task.

Remove debug output.

Ensure there are no accidental development-only paths.

---

# 26. FINAL REPORT

When finished, report:

## A. Architecture understanding

Explain briefly:

* how timetable data becomes an expected occurrence
* how teacher attendance is currently recorded
* how QR check-in creates attendance
* how dashboard data is currently collected
* where automatic absence resolution now fits

## B. Automatic absence

Explain:

* trigger mechanism
* exact condition for absence
* status used
* idempotency strategy
* exception handling
* timezone/time source

## C. Dashboard

Explain how the automatically resolved absence appears in the existing organization dashboard.

## D. Reports

Explain how it appears in existing reports.

## E. Database cleanup

Report:

* what test/bloat data was identified
* what was removed
* what was intentionally preserved
* any uncertain records that were NOT deleted

## F. Code cleanup

Report:

* obsolete code removed
* duplicate logic consolidated
* dependencies removed, if any
* dead code removed

## G. Security

Confirm:

* organization isolation
* authorization
* RLS compatibility
* server-side time
* no client-controlled attendance identity
* no cross-org mutation

## H. Validation

Report:

```text
pnpm install
pnpm lint
pnpm run build
tests
```

with results.

## IMPORTANT

Do NOT seed new timetable data in this task.

The current database already contains the timetable data required for testing.

Do NOT recreate the organization, teachers, classes, subjects, or memberships.

The objective is to understand the existing system, clean up development bloat, implement automatic teacher absence resolution correctly, integrate it with the existing dashboard/reporting, and leave the application lean and production-ready.

```

### The one thing I really want the agent to avoid

Don't let it interpret **"automatic absence" as "create a cron that inserts an absent row every minute."**

The underlying concept is **resolving an expected timetable occurrence**.

That distinction matters because your system already has the pieces:

**Timetable → expected occurrence → teacher check-in → Attendance Session → dashboard.**

We're simply adding the missing transition:

**expected occurrence + end time passed + no check-in → resolved missed/absent occurrence.**

And because you've already seeded the real `TEST International Academy` timetable, this is now something we can test against **real data rather than fabricated demo data**.

Also, I intentionally told the agent **not to seed anything and not to reset the DB**. Cleanup should happen *before* it starts changing attendance behavior, and only clearly identified test artifacts should be removed.
```
