# ROLL SYNC — PATCH: CLASS QR + TEACHER CLASS CHECK-IN

## Objective

Implement and integrate the complete **teacher class check-in flow**.

This is a PATCH to the existing Roll SYNC infrastructure.

The goal is:

```text
Admin creates Class
        ↓
Class receives stable unique public code
        ↓
QR is generated from that code
        ↓
Admin can download QR as PNG
        ↓
Teacher easily accesses "Scan Class QR / Check in"
        ↓
Teacher scans classroom QR
        ↓
Roll SYNC resolves the Class
        ↓
Server cross-references:
  authenticated teacher
  organization membership
  teacher Person
  Class
  today's timetable
  teacher assignment
  current time
  attendance settings
  timetable exceptions
        ↓
Teacher sees exactly what they are checking into
        ↓
Teacher explicitly clicks "Check in"
        ↓
Attendance Session is created/retrieved idempotently
        ↓
Teacher arrival/check-in is recorded
````

Student attendance is NOT part of this task.

Do not implement student QR attendance.

---

# 1. IMPORTANT: INSPECT THE EXISTING APP FIRST

Before changing anything, inspect the existing implementation and understand:

* Prisma schema
* Class model
* Class creation flow
* Class details UI
* People
* Person
* Membership
* Teacher assignment
* Subject
* Room
* Timetable
* timetable exceptions
* attendance session
* attendance record
* teacher workspace
* teacher Today page
* teacher My Classes page
* teacher Timetable page
* attendance settings
* existing QR/scanner infrastructure
* existing upload/download utilities
* existing auth/authorization
* existing UI components
* existing route conventions

Reuse existing infrastructure wherever possible.

Do NOT create duplicate:

* authentication
* teacher identity
* timetable
* attendance session
* QR system
* class identity
* organization authorization
* services
* database models
* dependencies

This is an integration patch, not a rewrite.

---

# 2. CLASS IDENTITY + PUBLIC CLASS CODE

Every Class must have:

```text
Class.id
Class.code
```

`Class.id` remains the internal database identity.

`Class.code` is the stable public identity used by the QR.

Example:

```text
Class.id
cl_cuid_internal_value

Class.code
RS-7K4M9Q2X
```

Requirements for `Class.code`:

* unique
* stable
* generated automatically
* generated server-side
* collision-resistant
* safe to expose
* QR-friendly
* reasonably short
* no sensitive information
* does not expose the Prisma CUID
* does not contain teacher/student/timetable information
* does not change when the class name changes

The database must enforce uniqueness.

Do NOT let the client choose the code.

---

# 3. EXISTING CLASSES

If existing classes do not already have a code:

* create the required Prisma migration
* safely generate codes for existing classes
* preserve all existing Class IDs
* preserve class memberships
* preserve timetable relationships
* preserve attendance relationships
* preserve organization relationships
* enforce uniqueness after backfill

Never delete/recreate existing classes.

---

# 4. QR GENERATION

When a Class exists, its QR should be derived from its stable public code.

Prefer a canonical Roll SYNC class payload/URL such as:

```text
https://rollsync.app/c/RS-7K4M9Q2X
```

or the existing project QR convention if one already exists.

The QR must identify the Class only.

Do NOT encode:

* teacher
* subject
* timetable
* attendance session
* students
* organization authorization
* credentials

The server resolves all of that information.

Do not introduce a second QR identity system.

---

# 5. AUTOMATIC QR AVAILABILITY

After creating a Class, the resulting Class should immediately have access to its QR.

The Class details page should clearly show:

```text
Class name

Class code
RS-7K4M9Q2X

[ QR CODE ]

[ Download QR ]
```

The QR should be downloadable as a PNG.

Example filename:

```text
SS2A-class-qr.png
```

Use the existing project dependencies/utilities if available.

If no QR generation dependency exists, add the smallest appropriate dependency necessary.

Do not add unnecessary packages.

---

# 6. DOWNLOAD QR AS PNG

Implement:

```text
Download QR
```

Requirements:

* produces a real PNG
* good enough resolution for printing
* contains only the canonical Class QR payload
* works on desktop
* works on mobile
* uses the existing Roll SYNC visual language
* does not expose internal database IDs

Do not store the generated PNG in the database unless existing architecture specifically requires persisted assets.

The QR is deterministic from the Class code, so it can be generated when needed.

---

# 7. MAKE TEACHER CHECK-IN EXTREMELY ACCESSIBLE

This is important.

A teacher should NOT have to navigate through several admin-style pages to start a class.

The primary teacher action should be obvious from the teacher workspace.

The existing teacher navigation is:

```text
Today
My Classes
Timetable
```

Keep that structure.

Do not redesign the teacher workspace.

Add an obvious primary action:

```text
Scan Class QR
```

or:

```text
Check in to class
```

Use whichever wording fits the existing UI best.

The action should be accessible from at least:

### Teacher Today page

Prominently surface:

```text
Next class
Mathematics
SS2A
08:00 – 08:40
Room 12

[ Scan Class QR ]
```

If there is an imminent/current class, the check-in action should be visually prominent.

### Teacher My Classes

Provide an obvious check-in action for a relevant scheduled/current class.

### Teacher attendance/check-in area

If an attendance route already exists, make:

```text
Scan Class QR
```

the primary action.

Do NOT create five different implementations of check-in.

All entry points should call the same underlying flow.

---

# 8. SCANNER UX

The teacher flow should be:

```text
Teacher
 ↓
Scan Class QR
 ↓
Camera/scanner opens
 ↓
Scan classroom QR
 ↓
QR resolves Class
 ↓
Server validates context
 ↓
Check-in preview
```

The scanner should:

* request camera permission properly
* handle permission denial cleanly
* support mobile
* give clear scanning feedback
* prevent accidental duplicate submissions
* provide a fallback/manual option only if appropriate
* handle invalid QR codes cleanly
* handle non-Roll SYNC QR codes cleanly
* support reduced motion
* use existing UI components/design language

Do not build a giant scanner framework.

Keep it focused.

---

# 9. QR RESOLUTION

The scanner should extract the Class code from the QR.

The client should send the code to the server.

Do NOT send arbitrary teacher/class/timetable IDs supplied by the client.

Conceptually:

```text
QR
 ↓
classCode
 ↓
server
 ↓
Class
```

The server resolves:

```text
Class.code → Class.id
```

using the database's unique/indexed field.

---

# 10. SERVER-SIDE CHECK-IN RESOLUTION

After scanning, the server must determine whether the teacher can actually check into that class.

The server knows the authenticated teacher through:

```text
Better Auth session
 ↓
User
 ↓
Organization Membership
 ↓
linked Teacher Person
```

Do not trust a teacher ID from the client.

The server then resolves:

```text
Authenticated Teacher
+
Class
+
Current date/time
+
Timetable
+
Teacher assignment
+
Attendance settings
+
Timetable exceptions
```

---

# 11. FIND THE CORRECT TIMETABLE SLOT

The scanned Class is only the Class identity.

Find the teacher's expected timetable occurrence for that Class.

Example:

```text
Teacher:
Jane Smith

Class:
SS2A

Today's timetable:

08:00–08:40
Mathematics
SS2A
Room 12
Jane Smith
```

The server should resolve this exact occurrence.

Do not allow the client to choose:

```text
subjectId
timetableEntryId
roomId
teacherId
organizationId
```

The server derives them.

---

# 12. TIMETABLE EXCEPTIONS

Respect existing timetable exception infrastructure.

Examples:

* cancelled class
* rescheduled class
* substitute teacher
* room change
* blocked period

Do not check a teacher into a cancelled occurrence.

If there is a substitute teacher, follow the existing architecture for determining who is authorized to check in.

Do not invent a second exception system.

---

# 13. CHECK-IN PREVIEW

Scanning must NOT automatically check the teacher in.

After a successful scan, show a confirmation screen.

Example:

```text
Check in to class

Mathematics
SS2A

Today
08:00 – 08:40

Room 12

Teacher
Jane Smith

Arrival
On time

[ Check in ]
```

The purpose is to let the teacher verify:

> "Yes, this is the class I'm supposed to be teaching."

The preview is NOT the final attendance write.

---

# 14. ARRIVAL STATUS

Use the existing organization attendance settings.

Determine:

* Early
* On time
* Late
* Very late

or whatever statuses already exist in the current schema.

Do not hard-code thresholds if the existing settings already define them.

Do not create a new attendance-settings system.

The status must be calculated server-side.

The client must never decide:

```text
arrivalStatus = "on_time"
```

---

# 15. FINAL CHECK-IN

Only when the teacher presses:

```text
Check in
```

perform the authoritative server-side check again.

Verify:

```text
authenticated session
        ↓
organization membership
        ↓
Teacher Person
        ↓
Class code
        ↓
Class
        ↓
teacher assignment
        ↓
current timetable occurrence
        ↓
timetable exceptions
        ↓
attendance settings
        ↓
arrival status
```

Then create or retrieve the Attendance Session.

---

# 16. IDEMPOTENCY

This is mandatory.

A teacher must never accidentally create multiple Attendance Sessions for the same timetable occurrence.

Example:

```text
Teacher scans
 ↓
Preview
 ↓
Check in
 ↓
network delay
 ↓
teacher taps again
```

The backend must safely return/reuse the existing Attendance Session.

Use the existing schema's unique constraints/identifiers if available.

Do not invent duplicate sessions.

Do not create unbounded retry loops.

---

# 17. ATTENDANCE SESSION

Reuse the existing Attendance Session model.

The session should reference the correct existing entities, such as:

```text
Class
Teacher Person
Subject
Timetable occurrence
scheduled time
actual check-in/start time
arrival status
```

Use the exact existing schema rather than creating duplicate fields/models.

The resulting session represents:

> the actual occurrence of the scheduled class.

---

# 18. SUCCESS STATE

After successful check-in, show a clear confirmation.

Example:

```text
You're checked in

Mathematics
SS2A

08:00 – 08:40
Room 12

Checked in at 07:56
On time

[ Enter class ]
```

If the existing attendance flow already has a session screen, route into it rather than creating another session UI.

---

# 19. WRONG CLASS

If the teacher scans a valid Roll SYNC Class QR but it is not their scheduled class:

```text
This class isn't on your timetable right now.
```

Do not create an Attendance Session.

Do not allow the teacher to manually override this unless the existing permission architecture explicitly supports authorized overrides.

---

# 20. WRONG TIME

If the class is correct but the teacher scans outside the allowed check-in window:

Show an appropriate message based on existing attendance settings.

Do not create a session if the server determines the check-in is invalid.

Do not rely on client time.

Use server time.

---

# 21. SECURITY

QR possession is NOT authorization.

Knowing:

```text
RS-7K4M9Q2X
```

must not give someone access to the organization's data.

Every server operation must validate:

```text
authenticated user
+
organization membership
+
teacher Person
+
permission
+
class relationship
+
timetable relationship
+
time
```

Prevent:

* cross-organization access
* arbitrary class selection
* arbitrary teacher selection
* arbitrary timetable selection
* unauthorized attendance creation

Never expose internal Prisma CUIDs unnecessarily.

---

# 22. ROUTING

Follow the existing route architecture.

Do not blindly create new routes if an appropriate teacher attendance route already exists.

The important UX is:

```text
Teacher workspace
 ↓
Scan Class QR / Check in
```

The exact URL should fit the existing implementation.

Possible structure:

```text
/[slug]/teacher/attendance
/[slug]/teacher/attendance/scan
```

but inspect the existing routes first and use the cleanest existing convention.

---

# 23. MOBILE-FIRST

This flow is primarily for a teacher standing in a classroom with a phone.

Prioritize:

* large scan button
* large Check in button
* clear information
* minimal navigation
* fast loading
* obvious current state
* camera experience
* good error messages
* accessible touch targets

Do not turn this into a desktop-heavy admin workflow.

---

# 24. NO STUDENT ATTENDANCE

Do NOT implement:

* student QR attendance
* student scanner
* student check-in
* student attendance automation
* student-facing attendance UI

Student attendance will be integrated later using the same Class/Person/Attendance infrastructure.

---

# 25. NO ARCHITECTURAL CHANGES

Do NOT:

* migrate away from Next.js
* introduce NestJS
* introduce a separate API
* introduce realtime/WebSockets
* introduce Socket.IO
* introduce another database
* replace Better Auth
* upgrade Prisma
* introduce Prisma 8
* create a second attendance system
* create a second teacher identity system
* create a second timetable system

Use:

* Next.js App Router
* existing server actions/route handlers
* Prisma 7.10.0
* Better Auth 1.7.3
* existing PostgreSQL
* existing UI
* existing authorization
* existing attendance/timetable infrastructure

---

# 26. ERROR STATES

Handle cleanly:

* camera permission denied
* camera unavailable
* invalid QR
* malformed Roll SYNC QR
* class not found
* class belongs to another organization
* teacher not linked to a Person
* teacher not authorized for class
* class not on today's timetable
* class cancelled
* class rescheduled
* too early
* too late
* attendance session already exists
* database failure
* network failure

Do not show raw database/Prisma errors to users.

---

# 27. IMPORTANT: DO NOT DUPLICATE LOGIC

There must be one canonical server-side check-in operation.

For example:

```text
resolveClassCheckIn(...)
confirmClassCheckIn(...)
```

or whatever naming fits the existing architecture.

The following should all use the same backend logic:

```text
Today → Scan Class QR
My Classes → Check in
Attendance → Scan Class QR
```

Do not implement separate versions.

---

# 28. DATABASE EFFICIENCY

Optimize normal operations.

Class resolution:

```text
Class.code
```

must use a unique/indexed database lookup.

Do not:

```text
fetch all classes
filter in JavaScript
```

Do not perform unnecessary sequential queries.

Use Prisma relations/selects efficiently.

Only retrieve the fields needed for the check-in preview.

The final confirmation should perform authoritative validation server-side.

Do not sacrifice correctness for premature abstraction.

---

# 29. CLASS CODE + QR DOWNLOAD VERIFICATION

Test:

```text
Create Class
→ unique code generated
→ QR available
→ Download QR
→ valid PNG
```

Then:

```text
Create second Class
→ different code
```

Then:

```text
Rename Class
→ code unchanged
→ QR identity unchanged
```

Then:

```text
Scan QR
→ correct Class resolved
```

---

# 30. END-TO-END TEST

Test the complete happy path:

```text
Admin creates:

Mathematics
SS2A
Room 12

↓

Class code generated

↓

QR displayed

↓

QR downloaded as PNG

↓

Teacher has:

Mathematics
SS2A
08:00–08:40
Room 12

↓

Teacher opens Today

↓

Teacher sees:

Mathematics
SS2A
08:00–08:40

[ Scan Class QR ]

↓

Teacher scans QR

↓

Server resolves SS2A

↓

Server verifies teacher

↓

Server finds today's Mathematics timetable occurrence

↓

Server calculates arrival status

↓

Preview appears

↓

Teacher clicks:

[ Check in ]

↓

Attendance Session created

↓

Teacher sees:

Checked in
Mathematics
SS2A
On time
```

Then test failure paths:

```text
Wrong class
Wrong teacher
Wrong organization
Wrong time
Cancelled class
Duplicate check-in
Invalid QR
```

No invalid Attendance Session should be created.

---

# 31. PRODUCTION VALIDATION

Run:

```bash
pnpm install
pnpm lint
pnpm run build
```

Run relevant Prisma generation/migration commands required by the existing project.

Fix every error introduced by the implementation.

Do not ignore lint/build failures.

---

# 32. FINAL IMPLEMENTATION PRINCIPLE

The final architecture should remain conceptually:

```text
CLASS
 ├── id
 └── code
      ↓
     QR
      ↓
TEACHER SCANS
      ↓
SERVER RESOLVES CLASS
      ↓
AUTHENTICATED TEACHER
      +
CLASS
      +
TODAY'S TIMETABLE
      +
TEACHER ASSIGNMENT
      +
CURRENT TIME
      +
ATTENDANCE SETTINGS
      ↓
CHECK-IN PREVIEW
      ↓
TEACHER CONFIRMS
      ↓
ATTENDANCE SESSION
```

The QR identifies the classroom.

The timetable identifies what should be happening.

The authenticated teacher identifies who is checking in.

The server determines whether those things legitimately match.

The teacher's explicit confirmation creates the actual check-in.

Keep the implementation minimal, secure, efficient, and fully integrated with the existing Roll SYNC architecture.

---

## FINAL RESPONSE FROM AGENT

After implementation, report:

1. Files changed
2. Class code implementation
3. QR generation/download implementation
4. Teacher check-in entry points
5. Scanner implementation
6. Server-side validation flow
7. Attendance Session integration
8. Idempotency handling
9. Migration/backfill details
10. `pnpm lint` result
11. `pnpm run build` result
12. Any remaining limitations

Do not report unrelated refactors.

```

### One thing I particularly want the agent to get right

The **QR is not the check-in**.

The QR says:

> **"This is Class X."**

Then Roll SYNC asks:

> **"Is this teacher actually supposed to be teaching Class X right now?"**

Only after that does the teacher see the details and explicitly press **Check in**.

That separation is what makes the system reliable rather than just a QR scanner bolted onto the app.
```
