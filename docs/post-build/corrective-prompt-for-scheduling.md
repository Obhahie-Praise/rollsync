# Fix Timetable Flexibility — Independent Schedule Per Weekday

We identified a major flaw in the current timetable implementation.

## The problem

The current timetable creation flow allows something like:

Subject: Biology
Teacher: Jane
Class: SS2A
Days: Monday, Wednesday
Start: 08:00
End: 08:45

The implementation currently treats this as:

Monday    08:00–08:45 Biology
Wednesday 08:00–08:45 Biology

That is too rigid for a real school timetable.

A real timetable may be:

Monday    08:00–08:45 Biology
Wednesday 10:30–11:15 Biology

The same teaching assignment can occur on multiple weekdays, but each weekday must be independently configurable.

The desired behavior is:

Biology
  Monday    08:00–08:45
  Wednesday 10:30–11:15

Changing Wednesday must NEVER silently change Monday.

---

# OBJECTIVE

Refactor the timetable scheduling model and UI so that:

> Each weekday schedule is independently configurable.

Still provide a convenient way to apply the same schedule to multiple selected days when desired.

For example:

User selects:

Monday
Wednesday

Sets:

08:00–08:45

The UI may initially apply that schedule to both.

But the user must then be able to edit Wednesday independently:

Monday    08:00–08:45
Wednesday 10:30–11:15

This must be represented correctly in the database and used correctly everywhere else.

---

# FIRST: INSPECT BEFORE CHANGING

Do NOT immediately rewrite the timetable system.

Read and understand:

- prisma/schema.prisma
- prisma migrations related to timetable
- current timetable server actions
- timetable creation form
- timetable edit form
- timetable list/calendar UI
- timetable queries
- teacher timetable queries
- teacher attendance/check-in logic
- attendance-actions.ts
- timetable lookup used by teacher QR check-in
- timetable types/interfaces
- relevant validation schemas

Determine exactly how the current model represents:

- teacher
- class
- subject
- room
- day(s)
- start/end time
- recurrence
- effective dates
- exceptions
- timetable entry identity

Then choose the smallest production-safe architectural change that correctly supports independent weekday schedules.

Do NOT introduce unnecessary abstractions.

---

# CORE DATA MODEL REQUIREMENT

The system must no longer depend on one shared:

days[] + startTime + endTime

combination when different weekdays need different schedules.

The persisted representation must allow:

Monday:
08:00–08:45

Wednesday:
10:30–11:15

as independent schedule records/configurations.

Prefer the simplest normalized model that fits the existing architecture.

Do NOT create a complicated calendar engine.

Do NOT introduce unnecessary recurrence libraries.

Do NOT introduce new dependencies.

Do NOT redesign the existing Organization → Class → Subject → Teacher → Timetable architecture.

---

# IMPORTANT DOMAIN SEPARATION

Preserve the distinction:

Teaching Assignment:
Teacher teaches Subject for Class.

Schedule:
When/where that teaching assignment occurs.

Timetable:
Expected weekly schedule.

Attendance Session:
What actually happened.

Do not turn timetable rows into attendance records.

---

# WEEKDAY MODEL

Support the normal weekdays:

MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
SATURDAY
SUNDAY

Use the existing representation if one already exists.

Do not introduce inconsistent weekday formats.

Avoid locale-dependent date parsing for weekday identity.

---

# SCHEDULE CREATION UX

The creation flow should become flexible without becoming complicated.

Example:

## Step 1

User chooses:

Subject
Teacher
Class

## Step 2

User adds schedule days.

For example:

Monday
Wednesday

Each selected day should have its own schedule configuration.

Example:

Monday
[08:00] → [08:45]
Period [1]
Room [Room 12]

Wednesday
[10:30] → [11:15]
Period [3]
Room [Science Lab]

The user can:

- add another day
- remove a day
- edit a day's start time
- edit a day's end time
- edit a day's optional period
- edit a day's optional room/venue

Do not force all selected days to share the same values.

---

# CONVENIENCE FEATURE

The UI may provide:

"Apply to selected days"

or an equivalent convenience interaction.

For example:

Select:
Monday
Wednesday
Friday

Set:
08:00–08:45

Then apply those values to all selected days.

However, after applying them, each day remains independently editable.

This is a convenience feature only.

It must NOT create shared mutable state between days.

---

# EDITING REQUIREMENT

This is critical.

Suppose the timetable is:

Monday:
08:00–08:45

Wednesday:
08:00–08:45

User edits Wednesday to:

10:30–11:15

The result must be:

Monday:
08:00–08:45

Wednesday:
10:30–11:15

No other weekday may change.

Editing one day must update only that day's persisted schedule.

---

# TIMETABLE DISPLAY

Update the timetable UI so that the weekly view accurately displays different times for different days.

Example:

MONDAY

08:00
Biology
SS2A
Room 12


WEDNESDAY

10:30
Biology
SS2A
Science Lab

Do not group entries in a way that incorrectly implies identical times.

The daily view must also continue working.

Teacher timetable must use the actual weekday-specific schedule.

Class timetable must use the actual weekday-specific schedule.

---

# TEACHER ATTENDANCE / QR CHECK-IN

This is extremely important.

Do NOT break the existing teacher QR check-in flow.

The existing flow is:

Teacher
↓
Scan Class QR
↓
Class identified
↓
Authenticated teacher identified
↓
Today's timetable lookup
↓
Validate teacher + class + assignment + current time + exceptions
↓
Preview
↓
Teacher confirms
↓
Attendance Session

After this timetable change, the lookup must resolve the correct schedule for the CURRENT WEEKDAY.

Example:

Monday:
Biology 08:00–08:45

Wednesday:
Biology 10:30–11:15

On Wednesday at 10:35, the system must find the Wednesday schedule.

It must NOT find the Monday 08:00 schedule merely because Biology is associated with the same teacher/class.

Update all timetable queries used by attendance/check-in accordingly.

---

# TIME VALIDATION

Preserve the existing time semantics.

Use server time for authoritative validation.

Do not trust client-provided:

- teacher ID
- organization ID
- timetable ownership
- attendance status
- session identity
- current timestamp

The server must determine the current weekday and match against the correct persisted schedule.

---

# CONFLICT DETECTION

Preserve existing conflict detection.

At minimum, prevent overlapping schedules for:

- the same teacher
- the same room/venue where applicable
- the same class

But perform conflict detection against the actual weekday + time range.

Example:

Monday:
Teacher Jane
08:00–08:45

Monday:
Teacher Jane
08:30–09:15

=> conflict.

But:

Monday:
08:00–08:45

Wednesday:
08:30–09:15

=> no conflict.

Do not compare schedules across unrelated weekdays.

---

# EFFECTIVE DATES / RECURRENCE

Preserve the existing effective date model if one already exists.

Do not remove:

- effective start
- effective end
- active/inactive
- existing exception handling

If the current system uses a recurring weekly timetable, retain that concept.

The important change is that recurrence must not force identical time/room/period values across different weekdays.

---

# MIGRATION

If the current database stores multiple weekdays in one timetable record, create a safe migration.

Existing data such as:

days = [MONDAY, WEDNESDAY]
start = 08:00
end = 08:45

must become equivalent independent schedules:

MONDAY
08:00–08:45

WEDNESDAY
08:00–08:45

This preserves current behavior while making the entries independently editable.

Do NOT silently change existing timetable meaning.

Review the generated migration carefully.

Do not destroy existing timetable data.

---

# BACKWARD COMPATIBILITY

Audit all code that currently assumes:

one timetable record = multiple identical weekdays.

Update every relevant query and transformation.

Search for patterns such as:

- days arrays
- dayOfWeek
- startTime
- endTime
- recurrence
- weekday filtering
- timetable lookup by date
- timetable lookup by teacher
- timetable lookup by class
- timetable lookup by current time

Do not fix only the creation form.

The entire data flow must agree with the new model.

---

# VALIDATION

Use the existing validation library/pattern.

Validate:

- weekday
- start time
- end time
- start < end
- valid room
- valid teacher
- valid class
- valid subject
- valid assignment
- organization boundaries

Do not duplicate validation logic unnecessarily.

---

# AUTHORIZATION

Preserve current server-side authorization.

Admins/owners should manage timetables according to existing permissions.

Teachers may view only the timetables they are authorized to see.

Never trust organization/class/teacher IDs supplied by the client.

All queries must enforce organization boundaries.

---

# UI / DESIGN

Do NOT redesign the timetable page.

Keep the existing Roll SYNC design language.

Improve only what is necessary to support independent weekday scheduling.

Maintain:

- existing layout
- existing typography
- existing spacing
- existing components where possible
- existing animations
- existing responsive behavior

The result should feel like an evolution of the current timetable UI, not a new feature bolted onto it.

---

# EMPTY / ERROR STATES

Handle:

- no days selected
- no schedule rows
- invalid time range
- conflicting schedule
- failed save
- partial edit failure
- deleted day
- deleted teacher/class/subject/room

Use existing error handling patterns.

Do not add unnecessary toast/modal systems.

---

# DATA INTEGRITY

The implementation must prevent:

- duplicate weekday schedules for the same timetable assignment where inappropriate
- orphaned schedule rows
- cross-organization references
- accidental changes to other weekdays
- duplicate teacher check-in sessions caused by timetable ambiguity

Use appropriate database constraints/indexes where needed.

Do not add constraints blindly; inspect the existing schema first.

---

# IMPORTANT: DON'T OVERENGINEER

Do NOT:

- build Google Calendar
- build a recurrence engine
- add drag-and-drop scheduling unless already present
- add calendar libraries
- add realtime
- add WebSockets
- add new infrastructure
- redesign attendance
- redesign teacher workspace
- redesign the dashboard
- add student attendance
- change Better Auth
- change Prisma version
- replace existing architecture

Use the current stack:

- Next.js 16 App Router
- Prisma 7.10.0
- Better Auth 1.7.3
- PostgreSQL
- TypeScript
- existing UI/animation libraries
- pnpm

---

# TEST THE ACTUAL DOMAIN CASES

Before considering this complete, verify these scenarios.

## Case 1 — Same schedule

Create:

Biology
Monday + Wednesday
08:00–08:45

Expected:

Monday 08:00–08:45
Wednesday 08:00–08:45

## Case 2 — Different times

Edit Wednesday:

10:30–11:15

Expected:

Monday 08:00–08:45
Wednesday 10:30–11:15

## Case 3 — Different rooms

Monday:
Room 12

Wednesday:
Science Lab

Expected to persist independently.

## Case 4 — Different periods

Monday:
Period 1

Wednesday:
Period 3

Expected to persist independently.

## Case 5 — Three days

Monday:
08:00–08:45

Wednesday:
10:30–11:15

Friday:
13:00–13:45

All three must coexist independently.

## Case 6 — Teacher timetable

Teacher should see the correct weekday/time.

## Case 7 — Class timetable

Class should see the correct weekday/time.

## Case 8 — QR teacher check-in

On Monday, the server resolves Monday's schedule.

On Wednesday, the server resolves Wednesday's schedule.

The server must never confuse the two.

## Case 9 — Conflict

Create overlapping Monday schedules for the same teacher.

Expected: rejected.

Create an overlapping Wednesday schedule.

Expected: rejected only if the Wednesday schedule overlaps another Wednesday schedule.

## Case 10 — Existing data

Existing timetable entries must remain valid after migration.

---

# PRODUCTION QUALITY CHECKS

After implementation:

pnpm install
pnpm lint
pnpm run build

If tests exist, run them.

Also inspect:

- migration
- generated Prisma client
- server actions
- timetable queries
- teacher check-in queries
- UI form state
- mobile timetable

Do not declare success merely because lint/build passes.

---

# FINAL REPORT

Report:

1. What the current timetable model was doing.
2. What architectural change was made.
3. Exact schema/model changes.
4. Migration created.
5. How existing timetable data was preserved.
6. How the creation/edit UI now works.
7. How independent weekdays work.
8. How teacher timetable queries were updated.
9. How QR teacher check-in was updated.
10. Conflict detection behavior.
11. Files changed.
12. Tests performed.
13. `pnpm lint` result.
14. `pnpm run build` result.
15. Any remaining limitations.

Most importantly:

DO NOT rewrite working parts of Roll SYNC unnecessarily.

This is a targeted correction to timetable flexibility while preserving the existing product architecture and working teacher attendance flow.