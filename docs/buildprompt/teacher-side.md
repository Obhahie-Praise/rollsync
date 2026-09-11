# Roll SYNC — Teacher Workspace & Complete Teacher Attendance Infrastructure

## Objective

Build the complete teacher-facing experience for Roll SYNC.

There are two important product decisions for this implementation:

1. The organization's internal CUID must NEVER be used as the human-facing organization ID.
2. Teachers need a dedicated teacher workspace that is functionally separate from the owner/admin workspace.

The underlying data infrastructure remains shared.

The teacher workspace should use the existing:

- Better Auth
- Organization
- Membership
- Person
- Class
- Class Membership
- Subject
- Teacher Assignment
- Room/Venue
- Timetable
- Attendance Session
- Attendance Record
- audit infrastructure
- authorization infrastructure

Do not create duplicate versions of these systems.

The goal is to make the teacher experience fully functional from login through taking attendance.

---

# 1. HUMAN-FACING ORGANIZATION ID

Inspect the current Organization model.

The database CUID remains the internal primary key.

Do NOT expose it as the organization's human-facing identifier.

Add/reuse a separate organization identifier such as:

```text
organizationId
````

or an appropriate existing field, but avoid naming conflicts with the internal database ID.

The important distinction is:

```text
Organization.id
= internal database identifier

Organization.publicId / orgId / alias
= human-facing organization identifier
```

Example:

```text
Internal:
clx8x3.......

Human-facing:
RLS-ACME-001
```

The exact format should follow the existing architecture and naming conventions.

---

# 2. ORGANIZATION ID REQUIREMENTS

The human-facing organization ID must be:

* unique
* stable
* safe to display
* independent from the database CUID
* easy to type
* suitable for future teacher/member login/access flows

Do not derive it directly from the CUID.

Prefer an admin-defined alias where the architecture allows it.

For example:

```text
Organization:
Acme Secondary School

Organization ID:
ACME-001
```

The organization ID may represent or act as an alias for the organization's employment/member identification system.

Do not force a specific Nigerian employment-ID format.

Keep it generic enough for:

* schools
* companies
* events
* organizations

---

# 3. ADD MEMBER

Update the existing Add Member flow.

When an admin creates a member, the flow should establish:

```text
Person
+
User
+
Membership
```

The member should have access to the organization through the official Roll SYNC account.

For teacher accounts, ensure the account has the organization context necessary to use the teacher login/access flow.

The organization CUID must not be shown or used as the human-facing organization ID.

Use the new organization identifier.

---

# 4. ONE ROLL SYNC ACCOUNT SYSTEM

Do NOT create:

```text
Teacher Authentication
Owner Authentication
Admin Authentication
```

There is still one Better Auth authentication system.

The difference is what happens AFTER authentication.

Conceptually:

```text
User logs into Roll SYNC
        ↓
Better Auth session
        ↓
Resolve memberships
        ↓
Resolve organization
        ↓
Resolve linked Person
        ↓
Determine permissions/person type
        ↓
Route to appropriate workspace
```

---

# 5. OWNER / ADMIN VS TEACHER WORKSPACE

This is a deliberate product separation.

Do not simply reuse the owner dashboard and hide a few links.

Create a teacher-focused workspace experience.

Owner/admin workspace:

```text
/[slug]/overview
/[slug]/people
/[slug]/organization
/[slug]/reports
/[slug]/developers
/[slug]/timetable
/[slug]/settings
```

Teacher workspace should have its own focused navigation.

Prefer a structure consistent with the existing route architecture, for example:

```text
/[slug]/teacher
/[slug]/teacher/today
/[slug]/teacher/classes
/[slug]/teacher/attendance
/[slug]/teacher/timetable
/[slug]/teacher/profile
```

However, inspect the current routing architecture first.

If a better existing route structure is already present, use it rather than blindly creating these exact routes.

The important requirement is:

> Teacher navigation and page composition must be separate from owner/admin navigation.

---

# 6. TEACHER WORKSPACE DESIGN

Reuse the existing visual language.

Do not redesign Roll SYNC from scratch.

The teacher experience should feel like the same product but optimized for the teacher's actual job.

Teacher navigation should focus on:

```text
Today
My Classes
Attendance
Timetable
Profile
```

Do not show:

* Developers
* Billing
* organization administration
* global reports
* dangerous settings
* membership management
* organization configuration

unless the existing permission system explicitly allows them.

---

# 7. TEACHER HOME / TODAY

Build the teacher's main page around:

> What do I need to do today?

Display real data only.

Example:

```text
Good morning, Jane

Tuesday, September 11

NEXT CLASS

Mathematics
SS2A
Room 12
08:00 – 08:40

[ Sign in ]

TODAY

08:00  Mathematics   SS2A   Room 12
10:00  Physics       SS2B   Lab
12:00  Chemistry     SS1A   Room 4
```

Statuses should come from the existing timetable/session data.

Possible states:

```text
Upcoming
Ready
Signed in
In progress
Completed
Late
Missed / Needs review
Cancelled
```

Do not invent fake data.

---

# 8. TEACHER'S CLASSES

Build:

```text
My Classes
```

using the teacher's existing timetable/teaching assignments.

Show:

* class
* subject
* room
* next scheduled occurrence
* attendance status where real data exists

A teacher must only see classes they are actually assigned to.

Never rely on a client-supplied teacher ID.

Resolve the teacher from:

```text
Better Auth User
→ Membership
→ Person
→ Person.type = Teacher
```

---

# 9. TEACHER TIMETABLE

Create a teacher-specific timetable view.

It should show:

* daily schedule
* weekly schedule
* class
* subject
* room
* start/end
* status/exceptions

Use the existing timetable infrastructure.

Do not duplicate timetable records.

Filter by the authenticated teacher's Person identity on the server.

---

# 10. STARTING ATTENDANCE

This is where the teacher experience becomes fully functional.

Teacher sees:

```text
Mathematics
SS2A
08:00 – 08:40
Room 12

[ Sign in ]
```

When they click:

```text
Sign in
```

open the existing QR scanner experience or implement the smallest scanner UI necessary.

Do not create a second QR system.

---

# 11. CLASS QR

The class QR must contain ONLY the stable Class identifier.

For example:

```text
classId
```

or the appropriate safe public class identifier if the architecture already uses one.

Do NOT put this inside the QR:

* teacher ID
* subject ID
* organization CUID
* timetable ID
* attendance session ID
* attendance records
* sensitive organization data

The QR identifies the class.

The server determines the rest.

---

# 12. QR → TIMETABLE VALIDATION

After scanning:

```text
QR
 ↓
classId
 ↓
server
```

The server resolves:

```text
authenticated User
        ↓
organization membership
        ↓
linked Teacher Person
        ↓
Class
        ↓
Teacher's timetable
        ↓
current scheduled occurrence
        ↓
Subject
        ↓
Room
```

The teacher should NOT manually select the subject.

The timetable determines it.

---

# 13. VALIDATION RULES

Before creating an Attendance Session, verify:

### Authentication

The user is authenticated.

### Organization

The user belongs to the organization.

### Teacher identity

The user is linked to a Person whose type/category is Teacher.

### Class

The scanned class belongs to the current organization.

### Assignment

The teacher is assigned to the class/subject through the existing timetable infrastructure.

### Time

The current time is valid for the scheduled occurrence according to the existing attendance settings.

### Exceptions

Respect existing timetable exceptions:

* cancelled
* rescheduled
* substitute
* room change
* blocked period

Do not create a second exception system.

---

# 14. ARRIVAL STATUS

Use the organization's existing attendance settings.

Do not hard-code:

```text
Early = 15 minutes
Late = 10 minutes
```

unless those values already exist in the existing architecture.

The server should derive the appropriate status.

Possible statuses:

```text
Early
On time
Late
Very late
```

Use only statuses supported by the current schema.

---

# 15. ATTENDANCE SESSION

After successful validation:

```text
Teacher
+
Class
+
Timetable occurrence
+
Subject
+
Actual start time
```

should create or retrieve the appropriate Attendance Session.

The operation must be idempotent.

If the teacher scans the same class twice:

Do not create duplicate sessions.

Return the existing active session where appropriate.

The session should preserve:

* organization
* teacher Person
* class
* subject
* timetable context
* actual start
* arrival status
* session status

Use the existing Attendance Session model.

Do not create a new attendance architecture.

---

# 16. TEACHER ATTENDANCE SESSION

Once the session is created:

```text
Mathematics
SS2A
08:00 – 08:40

Teacher:
Jane Smith

Status:
In progress
```

The teacher should be able to enter the attendance-taking interface.

---

# 17. STUDENT ROLL CALL

Implement the actual student attendance experience.

The students displayed must come from:

```text
Class
→ Class Membership
→ active Student Persons
```

Do not query arbitrary organization people and call them students.

Example:

```text
SS2A
Mathematics

Search students...

John Doe              Present
Sarah Smith           Present
David Adams           Absent
Michael Brown         Unmarked
```

Provide fast attendance actions.

At minimum support whatever statuses already exist in the attendance schema, such as:

```text
Present
Absent
Late
Excused
```

Do not invent statuses if the schema does not support them.

---

# 18. FAST ROLL CALL UX

Optimize the teacher interface for real classroom use.

Important:

* large touch targets
* quick status changes
* minimal navigation
* fast search
* clear current state
* obvious save/submit behavior
* useful student count
* progress indicator where appropriate
* mobile-first interaction

A teacher should be able to mark attendance quickly without navigating through several screens.

Do not over-design it.

---

# 19. ATTENDANCE PERSISTENCE

Attendance records must reference:

```text
Person
```

not:

```text
User
```

The authenticated User is the operator.

The Student Person is the attendance identity.

Conceptually:

```text
Attendance Session
      │
      ├── teacherPersonId
      │
      └── Attendance Records
              │
              └── personId
```

Preserve historical attendance if:

* Person is deactivated
* membership is removed
* User account changes
* teacher leaves the organization

---

# 20. SAVE / RESUME

Teachers should be able to safely continue an active attendance session.

If the page refreshes:

```text
Existing active session
        ↓
Reload
        ↓
Resume attendance
```

Do not create a duplicate session.

Use the existing persistence model.

If offline support already exists, integrate with it.

Do NOT create a new offline architecture.

---

# 21. SESSION COMPLETION

When attendance is complete, allow the teacher to finish the session using the existing session lifecycle.

Example:

```text
Attendance complete

38 / 40 students marked

[ Finish attendance ]
```

Respect the existing session status model.

Do not invent a second lifecycle.

After completion:

```text
Session → Completed
```

and return the teacher to their daily schedule.

---

# 22. NO CHECK-IN ≠ ABSENT

Do NOT automatically mark a teacher absent merely because they have not started a session.

The timetable represents:

```text
EXPECTED
```

Attendance represents:

```text
ACTUAL
```

If a teacher has not checked in:

```text
Expected
→ No check-in
→ Needs review
```

where appropriate.

Respect:

* cancellation
* substitute
* timetable changes
* network failure
* manual admin correction

---

# 23. TEACHER'S DAY

The completed experience should look conceptually like:

```text
LOGIN
 ↓
Teacher Workspace
 ↓
TODAY
 ↓
08:00 Mathematics — SS2A
 ↓
Sign in
 ↓
Scan Class QR
 ↓
Server validates teacher + class + timetable + time
 ↓
Session created
 ↓
Open Roll Call
 ↓
Mark students
 ↓
Finish attendance
 ↓
Return to TODAY
 ↓
10:00 Physics — SS2B
 ↓
Repeat
```

This is the core teacher workflow.

---

# 24. OWNER/ADMIN EXPERIENCE REMAINS SEPARATE

Do not break the existing owner/admin workspace.

Owners/admins should continue to use:

```text
Overview
People
Organization
Reports
Developers
Timetable
Settings
```

Teachers should not automatically inherit these pages.

An admin who is ALSO a teacher may have both capabilities.

In that case, the application should determine access from existing Membership + permission architecture.

Do not make Person type the sole authorization mechanism.

---

# 25. ROLE SWITCHING

If a User belongs to multiple organizations:

```text
User
 ├── Organization A
 │      └── Teacher
 │
 └── Organization B
        └── Admin
```

their workspace must change according to the selected organization and their permissions there.

Never assume one global role.

Roles are organization-specific.

---

# 26. MOBILE-FIRST TEACHER EXPERIENCE

This is especially important.

The teacher will likely use the attendance experience on a phone.

Audit the existing design before modifying it.

Do not redesign the visual identity.

Make the teacher workspace work at:

```text
320px
375px
390px
430px
tablet
desktop
```

Attendance should prioritize mobile.

Avoid unnecessary horizontal scrolling.

Tables should become useful mobile lists/cards where appropriate.

QR scanning should fit naturally into a mobile viewport.

Roll call controls should be easy to use with one hand.

Dialogs should fit small screens.

---

# 27. ORGANIZATION SECURITY

Every teacher request must be scoped to the selected organization.

Never trust organization IDs supplied by the client.

Resolve organization membership server-side.

Prevent:

```text
Teacher from Organization A
        ↓
requesting
        ↓
Class from Organization B
```

Likewise prevent cross-organization:

* timetable access
* people access
* attendance session access
* attendance record access
* class access

---

# 28. HUMAN-FACING ORGANIZATION ID SECURITY

The public organization ID is an identifier, not a secret.

Do not treat it as a password.

Do not log or expose internal CUIDs unnecessarily.

Do not use:

```text
Organization.id
```

as the human-facing org ID.

---

# 29. ACCOUNT CREATION

Preserve the previous Add Member protocol:

```text
Add Member
 ↓
User
+
Person
+
Membership
```

No email invitation system should be required for this flow.

If the organization ID is required during initial member account setup, use the human-facing organization identifier.

Do not require the user to know the internal database CUID.

---

# 30. Cleanup / Bloat Removal

While implementing this feature, audit the existing teacher/authentication infrastructure.

Remove genuinely obsolete:

* invitation/claim code
* duplicate teacher authentication
* duplicate teacher dashboard
* duplicate timetable queries
* duplicate attendance flows
* unused teacher helpers
* unused role checks
* obsolete organization ID handling
* internal CUID exposed as public organization ID
* duplicate User/Person linking logic
* unused components
* unused routes
* unused types
* unused imports
* dead comments
* abandoned experiments
* dependencies used only by removed code

Do not delete anything still used elsewhere.

Do not perform unrelated refactors.

The objective is:

> fewer abstractions, fewer duplicate flows, clearer ownership of each piece of logic.

---

# 31. Server / Client Boundaries

Keep:

### Server-side

* authentication
* membership lookup
* permissions
* Person resolution
* teacher authorization
* timetable validation
* QR validation
* session creation
* attendance persistence

### Client-side

* teacher interactions
* QR scanner UI
* timetable display
* roll call interactions
* loading states
* animations
* local UI state

Never use client state as the source of authorization truth.

---

# 32. Performance

Audit queries for:

* N+1 queries
* unnecessary includes
* duplicate timetable queries
* duplicate Person lookups
* duplicate membership lookups
* unnecessary client fetching

Use server-side aggregation where appropriate.

Only select the fields required.

Keep the teacher dashboard fast because it will be opened repeatedly throughout the day.

---

# 33. Accessibility / Reduced Motion

Respect:

```text
prefers-reduced-motion
```

Ensure:

* keyboard accessibility
* visible focus
* semantic buttons
* accessible form labels
* sufficient touch targets
* screen-reader-friendly status indicators

Do not sacrifice usability for animation.

---

# 34. Validation

Run:

```bash
pnpm install
pnpm lint
pnpm run build
```

Fix every introduced error.

Do not suppress errors.

---

# 35. Definition of Done

The implementation is complete only when:

## Organization identity

* [ ] Organization internal CUID remains internal
* [ ] Human-facing organization ID/alias exists
* [ ] Human-facing ID is unique
* [ ] Human-facing ID is stable
* [ ] CUID is not used as the teacher-facing organization ID

## Account provisioning

* [ ] Add Member creates/reuses User
* [ ] Add Member creates/reuses Person
* [ ] Add Member creates/reuses Membership
* [ ] Person.linkedUserId is populated
* [ ] Existing Users are reused
* [ ] Existing Persons are reused
* [ ] Duplicate memberships are prevented
* [ ] No invitation/claim flow is required

## Teacher workspace

* [ ] Teacher has a separate workspace
* [ ] Teacher navigation is separate from owner/admin navigation
* [ ] Teacher sees today's schedule
* [ ] Teacher sees only assigned classes
* [ ] Teacher timetable works
* [ ] Teacher identity is derived server-side
* [ ] Teacher permissions are enforced server-side

## Attendance

* [ ] Teacher can select a scheduled class
* [ ] Teacher can scan the class QR
* [ ] QR contains only class identity
* [ ] Server validates class ownership
* [ ] Server validates teacher assignment
* [ ] Server validates timetable context
* [ ] Server validates time
* [ ] Subject is resolved automatically
* [ ] Arrival status is derived from existing settings
* [ ] Attendance Session is created/retrieved idempotently
* [ ] Teacher can enter the session
* [ ] Student list comes from class membership
* [ ] Teacher can mark student attendance
* [ ] Attendance records reference Person
* [ ] Teacher can complete the session
* [ ] Session can be resumed safely
* [ ] Duplicate sessions/records are prevented
* [ ] Historical attendance remains intact

## Security

* [ ] Organization isolation enforced
* [ ] Teacher cannot impersonate another teacher
* [ ] Teacher cannot access another teacher's classes
* [ ] Teacher cannot access another organization's data
* [ ] Client-supplied IDs are validated server-side

## UX

* [ ] Teacher workspace is responsive
* [ ] Attendance works well on mobile
* [ ] QR scanner works on mobile
* [ ] Roll call is fast and touch-friendly
* [ ] Loading/empty/error/success states exist
* [ ] Reduced motion is respected

## Cleanup

* [ ] Obsolete teacher/invitation infrastructure removed
* [ ] Duplicate code removed
* [ ] Unused imports/components/helpers removed
* [ ] No unnecessary dependencies added
* [ ] No abandoned architecture remains

## Quality

* [ ] `pnpm lint` passes
* [ ] `pnpm run build` passes

---

# Final Report

At the end, report:

1. Existing teacher/authentication infrastructure discovered.
2. Organization ID changes.
3. Add Member changes.
4. Teacher workspace routes/components created.
5. Teacher authentication → Person → timetable flow.
6. Attendance QR → validation → session → roll call flow.
7. Security/authorization implemented.
8. Obsolete code removed.
9. Schema changes, if any.
10. Files changed.
11. `pnpm lint` result.
12. `pnpm run build` result.
13. Any remaining limitations.

````

### One architectural point I'd keep very firm

Don't make the teacher system a **second backend** or duplicate attendance system.

It's better understood as:

```text
              SHARED CORE
                  │
      ┌───────────┴───────────┐
      │                       │
OWNER/ADMIN               TEACHER
WORKSPACE                 WORKSPACE
      │                       │
      └───────────┬───────────┘
                  │
          SAME DATA/DOMAIN
                  │
        ┌─────────┼─────────┐
        │         │         │
      People  Timetable  Attendance
````

The **experience is separate; the infrastructure is shared**.

That gives you the cleanest path to the actual product behavior: a teacher can log in, immediately see **“what am I teaching today?”**, walk into SS2A, scan the class QR, have Roll SYNC automatically validate that they're supposed to be there, start the session, take roll call, finish it, and move on to their next class.
