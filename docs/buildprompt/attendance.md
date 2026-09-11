# Implement: Attendance Sessions & Attendance Records

## Goal

Implement the real Roll SYNC attendance workflow across:

- `/[slug]/attendance/session`
- `/[slug]/attendance/record`

The implementation must be role-aware.

The experience must differ appropriately between:

1. Teachers
2. Administrators
3. Other organization members

The existing school infrastructure is already implemented and should be reused:

```text
Organization
  ↓
People
  ↓
Classes
  ↓
Class Membership
  ↓
Subjects
  ↓
Teacher Assignments
  ↓
Timetable
  ↓
Attendance Session
  ↓
Attendance Records
````

Do NOT redesign the existing workspace shell.

Before changing anything, inspect the existing implementation, Prisma schema, authentication, authorization, People, Classes, Timetable, and existing attendance-related code.

Do not create duplicate infrastructure.

---

# 1. Core Attendance Model

Keep this distinction throughout the implementation:

### Timetable

Defines:

> What should happen.

Example:

```text
Monday
08:00–08:40
Jane Smith
SS2A
Mathematics
Room 12
```

### Attendance Session

Defines:

> What actually happened.

Example:

```text
Mathematics
SS2A
Jane Smith
Started 07:56
Early
```

### Attendance Record

Defines:

> Who was actually present.

Example:

```text
John Doe → Present
Sarah Smith → Present
David Adams → Absent
```

Do not collapse these concepts into one model.

Reuse the existing schema.

---

# 2. Teacher Experience

A teacher uses the normal Roll SYNC login.

There is NO separate teacher authentication system.

Resolve the teacher through:

```text
Authenticated User
    ↓
Organization Membership
    ↓
Linked Person
    ↓
Person type = Teacher
    ↓
Teacher timetable / assignments
```

Use the existing authentication and authorization system.

---

# 3. Teacher Session Page

Route:

`/[slug]/attendance/session`

For a teacher, this page should primarily show:

## Today's Classes

Display the teacher's scheduled classes for the current day.

Example:

```text
Today's classes

08:00 – 08:40
Mathematics
SS2A
Room 12

[ Sign in ]

09:00 – 09:40
Physics
SS3B
Science Lab

[ Sign in ]

11:00 – 11:40
Chemistry
SS2A
Room 12

[ Sign in ]
```

Use actual timetable data.

Do NOT show classes that the teacher is not assigned to.

Do NOT fabricate subjects, rooms, or schedules.

---

# 4. Teacher Sign In

When a teacher clicks:

**Sign in**

open the QR scanner.

The QR scanner should be a clean dedicated scanning experience.

The QR contains only the stable **Class ID**.

Do NOT put:

* teacher ID
* subject
* timetable
* room
* attendance status
* timestamp

inside the QR.

The QR identifies the class.

---

# 5. QR Validation

After scanning:

```text
QR
 ↓
Class ID
 ↓
Server
```

The server must determine the rest.

Validate:

### A. Authentication

Who is scanning?

```text
Authenticated User
```

### B. Organization

Which organization are they currently operating in?

```text
/[slug]
```

Verify membership server-side.

### C. Teacher identity

Resolve the user's linked Person.

Verify that the Person is a Teacher where teacher-specific attendance functionality is required.

### D. Class

Resolve the scanned Class ID.

Verify that the class belongs to the current organization.

### E. Teacher assignment

Verify that the teacher is actually assigned to this class.

### F. Timetable

Determine whether the class is scheduled for this teacher on the current day.

### G. Subject

Resolve the subject from the matching timetable/teaching assignment.

The teacher should NOT manually select the subject.

### H. Time

Compare the current time against the scheduled timetable entry.

Determine the appropriate arrival state using the organization's existing attendance settings/rules.

Possible states:

* Early
* On time
* Late
* Very late

Do not hard-code thresholds if the existing attendance settings already define them.

---

# 6. Session Creation

If the scan is valid:

Create or retrieve the appropriate Attendance Session.

Do not create duplicate sessions if the teacher scans the same class again.

The session should connect the actual occurrence to the timetable context.

Example:

```text
Mathematics
SS2A

Scheduled
08:00 – 08:40

Teacher
Jane Smith

Arrival
07:56

Status
Early
```

The actual check-in timestamp must come from the server.

Do NOT trust a client-provided timestamp.

---

# 7. Invalid QR / Invalid Schedule

Handle cases cleanly.

Examples:

### Wrong class

> This class is not assigned to you.

### Not scheduled today

> This class isn't on your timetable today.

### Wrong time

If the existing attendance rules permit early/late sign-in, handle accordingly.

Otherwise:

> This class is not currently available for sign-in.

### Already signed in

> You're already signed in to this class.

Provide an action to continue to the active session.

### Wrong organization

Reject the request server-side.

Never expose another organization's class information.

---

# 8. Teacher Attendance Record Page

Route:

`/[slug]/attendance/record`

Once a teacher has an active/authorized session, this page should show the students belonging to that class.

Example:

```text
Mathematics
SS2A
Today · 08:00–08:40

24 students

Present      21
Absent        2
Unmarked      1

Search students

John Doe                 Present
Sarah Smith              Present
David Adams              Absent
Michael Brown            Unmarked
```

The teacher should only see students who belong to that class according to the existing Class Membership data.

Do NOT allow the teacher to manually select arbitrary students from the organization.

---

# 9. Roll Call

The teacher should be able to mark students:

* Present
* Absent

Use additional statuses only if they already exist in the architecture.

The UI should make roll call extremely fast.

Support:

* search
* quick status changes
* clear visual state
* keyboard-friendly interaction where practical
* save/submit action

Do not require unnecessary forms.

---

# 10. Attendance Persistence

Attendance records must be associated with:

* Organization
* Attendance Session
* Person
* relevant class/session context according to the existing schema

Do NOT associate attendance identity primarily with Better Auth User.

Remember:

```text
Teacher User
→ operates attendance

Student Person
→ receives attendance record
```

A student does not need a Roll SYNC account to have attendance.

---

# 11. Saving Attendance

Saving attendance should be safe and idempotent.

Avoid creating duplicate records if the teacher repeatedly saves.

Use the existing backend/database patterns.

Validate everything server-side.

Do not trust:

* organization ID
* class ID
* person ID
* session ID
* teacher ID

from the client without authorization checks.

---

# 12. Admin Experience

Administrators should NOT receive the exact same experience as teachers.

For an administrator:

`/[slug]/attendance/session`

should provide an organization-wide attendance/session overview.

Example:

```text
Attendance

Today

18 expected sessions
15 started
2 completed
1 needs review

Sessions

08:00  Mathematics · SS2A
       Jane Smith
       Early
       Completed

09:00  Physics · SS3B
       Mike Adams
       Late
       Active
```

Admins should be able to inspect sessions across the organization according to their permissions.

Useful information:

* scheduled class
* subject
* teacher
* class
* scheduled time
* actual start/check-in
* arrival status
* session status

Use real data only.

---

# 13. Admin Attendance Records

On:

`/[slug]/attendance/record`

an authorized administrator should be able to inspect attendance records organization-wide.

Provide useful filtering where supported:

* date
* class
* teacher
* subject
* person
* attendance status

Do not dump the entire organization's data into the browser.

Use server-side filtering/querying.

Admins may be able to correct attendance records only if their existing permissions allow it.

Do not create a new permission system.

---

# 14. Other Organization Members

Do NOT automatically give every member the teacher or admin attendance experience.

Use the existing permission system.

Depending on their permissions, a member may:

### Have attendance.view

Allow:

* viewing permitted attendance information

### Have attendance.take

Allow:

* recording attendance where authorized

### Have no attendance permissions

Show an appropriate restricted/empty state or deny access server-side.

The exact permission names must come from the existing architecture.

Do not invent role-based authorization if the project already has permission-based authorization.

---

# 15. Teacher's Current Session

Once a teacher has successfully signed in, the UI should make the active session obvious.

Example:

```text
Active session

Mathematics
SS2A

08:00 – 08:40
Started 07:56 · Early

24 students

[ Take attendance ]
```

The teacher should be able to move naturally from:

```text
Sign in
 ↓
QR scanner
 ↓
Validated class
 ↓
Attendance session
 ↓
Take attendance
```

---

# 16. Teacher's Day

The teacher should be able to see all of their classes for the day.

Statuses should update according to actual session state.

Example:

```text
08:00 Mathematics · SS2A
✓ Signed in

09:00 Physics · SS3B
● Upcoming

11:00 Chemistry · SS2A
○ Upcoming
```

Use actual session state.

Do not automatically mark a teacher absent merely because they haven't signed in.

A scheduled class without teacher check-in should be treated as something like:

```text
Expected
→ No check-in
→ Needs review
```

unless the existing architecture defines another state.

This matters because:

* classes may be cancelled
* teachers may be substituted
* timetables may change
* devices may be offline
* administrators may need to correct the session

---

# 17. Timetable Integration

Do not duplicate timetable logic inside Attendance.

The timetable remains the source of truth for scheduled classes.

Attendance should query the existing timetable system to determine:

* teacher
* class
* subject
* time
* room
* recurrence/effective date
* relevant exceptions

If timetable exceptions already exist, respect them.

Examples:

* cancelled class
* substitute teacher
* room change
* rescheduled class

Do not build a new scheduling system.

---

# 18. Organization Settings

Respect existing attendance settings for:

* arrival thresholds
* attendance statuses
* session behavior
* organization-specific rules

Do not hard-code school-wide assumptions.

The system must remain compatible with:

* schools
* organizations
* events

where supported by the existing architecture.

---

# 19. Offline Preparation

Do NOT build a second offline architecture.

The existing mobile/offline-sync architecture remains the source of truth.

However, keep the attendance implementation compatible with future offline operation.

The canonical identity remains:

```text
Class ID
Person ID
Timetable context
Attendance Session
Attendance Record
```

Do not introduce a separate offline attendance data model.

---

# 20. Security

All important operations must be validated server-side.

Especially:

* starting a session
* scanning a class
* resolving timetable context
* creating attendance records
* modifying attendance records
* viewing organization-wide attendance

A client must never be able to change:

```text
teacherId
organizationId
classId
subjectId
```

and gain access to another organization's data.

Use authenticated session context and server-side authorization.

---

# 21. UI / UX

Keep the existing Roll SYNC visual language.

The attendance experience should feel:

* extremely fast
* clear
* focused
* professional
* low-friction

For teachers especially, optimize for the reality that they may be standing at a classroom door trying to start attendance quickly.

Use:

* large obvious actions
* clear status feedback
* fast scanner access
* search
* quick Present/Absent controls
* loading states
* success/error states
* empty states
* responsive layout
* accessible controls
* reduced-motion support

Do not over-design it.

No unnecessary:

* gradients
* decorative cards
* AI-style effects
* animations that slow down attendance

---

# 22. Do Not Redesign Existing Systems

Do NOT redesign:

* workspace shell
* sidebar
* People
* Classes
* Timetable
* Organization
* Reports
* Developers
* Settings
* Better Auth
* UploadThing
* BullMQ

Integrate with the existing implementation.

Do not add:

* NestJS
* WebSockets
* Socket.IO
* another realtime system
* another queue
* another authentication system
* duplicate attendance models
* duplicate timetable logic

---

# 23. Production Checks

After implementation:

```bash
pnpm lint
pnpm run build
```

Fix all TypeScript, lint, and build errors.

Do not use:

* `any`
* `@ts-ignore`
* unsafe casts
* unnecessary eslint disables

---

# Definition of Done

The implementation is complete when:

### Teacher

* Teacher sees only their scheduled classes.
* Teacher can select a scheduled class and sign in.
* Sign in opens the QR scanner.
* QR contains only the Class ID.
* Server validates the class against the authenticated teacher.
* Server checks the timetable.
* Server resolves the scheduled subject automatically.
* Server determines the appropriate arrival status.
* A valid scan creates/retrieves the correct Attendance Session.
* Duplicate sessions are prevented.
* Teacher can enter the session's attendance record page.
* Teacher sees only students belonging to that class.
* Teacher can perform fast roll call.
* Attendance records are persisted safely.
* Teacher can see all of their classes for the day.
* Teacher can see which sessions are upcoming, active, completed, or require review.

### Administrator

* Admin sees organization-wide attendance sessions according to permissions.
* Admin can inspect teachers, classes, subjects, and session states.
* Admin can inspect attendance records according to permissions.
* Filtering works where supported.
* Admin does not receive the restricted teacher-only experience.

### Other members

* Access is controlled by the existing authorization system.
* Members only see or modify attendance information they are permitted to access.

### Security

* Organization boundaries are enforced server-side.
* Teacher/class/timetable authorization is enforced server-side.
* QR data is treated only as an identifier.
* Client-provided timestamps and authorization data are not trusted.
* Duplicate attendance/session records are prevented.

### Quality

* No fake data.
* No duplicate infrastructure.
* Existing timetable and school infrastructure is reused.
* UI matches Roll SYNC.
* `pnpm lint` passes.
* `pnpm run build` passes.

Before finishing, provide a short summary of:

1. What was implemented
2. How teacher sign-in and QR validation work
3. How the teacher/admin/member experiences differ
4. Which existing infrastructure was reused
5. Any functionality intentionally left for a later phase
6. Confirmation that lint and build pass

```
```
