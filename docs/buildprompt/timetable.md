Absolutely. And I’d make this prompt **broader than just “build a timetable page.”** The agent needs to establish the school infrastructure underneath it first, then expose the right UI.

This should be the prompt you give the coding agent **before we touch the People redesign**:

````md id="rollsync-school-infrastructure"
# Roll SYNC — Build the School Infrastructure Foundation

Implement the core school infrastructure that will power People, Classes, Timetable, Teacher Check-In, and the upcoming Attendance system.

This is a foundational implementation.

Do NOT treat this as a simple timetable CRUD feature.

The goal is to establish the relationships that allow Roll SYNC to understand:

- who belongs to the school
- who is a teacher
- who is a student
- which students belong to which class
- which teachers teach which classes/subjects
- where classes happen
- what should happen at a particular time
- which teacher is expected to teach a class
- whether that teacher actually checked in
- which students should be available for attendance
- how future QR, roll-call, and ID-based attendance methods resolve to the same Person identity

---

# 1. INSPECT THE EXISTING PROJECT FIRST

Before changing anything, inspect the entire existing architecture relevant to this feature.

Inspect:

- Prisma 7 schema
- Better Auth configuration
- User model
- Organization model
- Membership model
- existing authorization/permissions
- Person/People models
- existing attendance models
- existing onboarding/data model
- workspace routes/layout
- existing settings
- existing navigation/sidebar
- existing UI components
- existing UploadThing setup if relevant
- existing audit infrastructure
- existing organization terminology/type system

Do not guess.

Do not create duplicate models or infrastructure when the architecture already contains the necessary concept.

The project currently uses:

- Next.js App Router
- Prisma 7
- PostgreSQL
- Better Auth
- TypeScript
- existing Roll SYNC workspace architecture

Keep those decisions.

Do not introduce:

- NestJS
- Socket.IO
- WebSockets
- realtime infrastructure
- another authentication system
- another authorization system
- another backend
- another database layer

Do not upgrade dependencies.

---

# 2. CORE ARCHITECTURAL PRINCIPLE

Lock this principle into the implementation:

> The timetable describes what should happen. Attendance records what actually happened. People and Classes provide the identities that connect the two.

Conceptually:

People
→ Who?

Classes
→ Who belongs together?

Subjects
→ What is being taught?

Timetable
→ What should happen, when and where?

Attendance Session
→ What actually started?

Attendance Record
→ Who was actually present?

---

# 3. PERSON IS NOT THE SAME AS USER

Maintain this distinction.

A Person is an organization identity.

A User is a Roll SYNC authentication identity.

A Membership connects a User to an Organization and provides authorization.

Example:

Person:
Jane Smith
Type: Teacher

may optionally be linked to:

User:
Jane Smith
Roll SYNC account

which has:

Membership:
Jane Smith → School
Role: Member/Admin/etc.

Students may exist entirely as Persons without Roll SYNC accounts.

Therefore:

- adding a Person must NOT automatically create a Better Auth User
- adding a Person must NOT automatically grant workspace access
- attendance subjects should reference Person
- authenticated Users are normally the operators performing attendance actions
- Membership determines whether the User is authorized to perform those actions

Use the existing architecture for this.

---

# 4. SCHOOL PEOPLE

The organization directory must eventually support simple categories such as:

- Student
- Teacher
- Staff
- Administrator
- Director

Do not create an excessive taxonomy.

Person category and authorization role are separate concepts.

For example:

Student
→ no Roll SYNC account

Teacher
→ User + Membership
→ allowed to take attendance

Administrator
→ User + Membership
→ manages school infrastructure

Director
→ User + Membership
→ potentially Owner/Admin depending on existing authorization

Do not create a new role system.

Use the existing authorization architecture.

---

# 5. CLASS

Establish a proper Class concept if it does not already exist.

A Class represents a group/cohort of people.

Examples:

- SS2A
- SS2B
- JSS1A
- Grade 10 Blue
- Year 11
- Computer Science Cohort

Do NOT hard-code Nigerian school terminology.

The system should allow a school to name classes however they want.

A Class should be organization-scoped.

It should support:

- name
- optional code/identifier
- organization
- active/inactive state where appropriate
- class members
- class identity required for future QR functionality

Do not implement the QR scanner yet.

Do not make the QR itself the canonical class identity.

The QR should ultimately resolve to the Class.

---

# 6. CLASS MEMBERSHIP

Students must be related to Classes through an explicit relationship.

Conceptually:

Person
→ Class Membership
→ Class

Example:

John Doe
→ Student
→ SS2A

Class membership should preserve enough information to support historical changes.

A student may move:

SS1A
→ 2025–2026

then:

SS2A
→ 2026–2027

Do not destroy historical relationships when a student changes class.

Attendance records must remain historically correct.

Use the existing schema if this relationship already exists.

Only make the minimal schema addition necessary if it does not.

---

# 7. SUBJECTS

Establish a reusable Subject concept where appropriate.

Examples:

- Mathematics
- Physics
- English
- Biology
- Computer Science

Do not assume every organization uses the word "Subject" internally.

Keep the underlying model generic enough that future terminology can be adapted.

Subjects should be reusable across classes and timetable assignments.

---

# 8. TEACHER ASSIGNMENTS

Do not simply attach a teacher directly to a Class.

The important relationship is:

Teacher
→ teaches
→ Subject
→ to
→ Class

Example:

Jane Smith
→ Mathematics
→ SS2A

Jane Smith
→ Mathematics
→ SS2B

Jane Smith
→ Further Mathematics
→ SS3A

These relationships should ultimately be represented through the timetable/scheduled teaching structure.

Use the existing architecture where possible.

---

# 9. ROOMS / VENUES

Establish a lightweight Room/Venue concept if one does not already exist.

Do NOT build a facilities-management system.

We only need enough information to represent locations such as:

- Room 12
- Science Lab
- Computer Lab
- Hall
- Field
- Online

A timetable assignment may reference a location.

This is useful for:

- timetable display
- QR/classroom context
- conflict detection
- future attendance verification

---

# 10. TIMETABLE IS A CORE PRODUCT MODULE

Create a dedicated route:

/[slug]/timetable

Add it to the workspace navigation using the existing sidebar system.

Do not hide timetable inside Settings.

Timetable is part of the core school workflow.

---

# 11. TIMETABLE DATA MODEL

A timetable entry should conceptually describe:

- organization
- teacher
- class
- subject
- room/venue
- start time
- end time
- recurrence/days
- effective start date
- effective end date
- status
- optional period identifier

Do NOT make "Period 1", "Period 2", etc. mandatory.

Some schools use fixed periods.

Others use arbitrary time blocks.

Therefore the actual source of truth should be:

Teacher + Class + Subject + Time

with period labels being optional metadata.

---

# 12. RECURRING TIMETABLES

Administrators should NOT have to create hundreds of individual timetable rows.

Support recurring schedules.

Example:

Mathematics
Teacher: Jane Smith
Class: SS2A
Room: 12

Every Monday
08:00–08:40

Effective:
September 2026 → July 2027

The system should be able to derive expected class occurrences from this schedule.

Use the simplest production-safe implementation compatible with the existing architecture.

Do not build an unnecessarily complex scheduling engine.

---

# 13. TIMETABLE EXCEPTIONS

Real schools change schedules.

The infrastructure must allow exceptions without destroying the recurring timetable.

Support the conceptual ability to represent:

### Cancelled class

Normally:
Monday 08:00

This week:
Cancelled

### Rescheduled class

Normally:
Monday 08:00

This week:
Tuesday 10:00

### Substitute teacher

Normally:
Jane Smith

Today:
Michael Adams

### Room change

Normally:
Room 12

Today:
Room 8

### School-wide event / blocked period

Example:

Assembly
08:00–09:00

Normal timetable should not blindly treat that period as an expected class.

Use the existing architecture where possible.

Do not overbuild a complex calendar system.

---

# 14. TIMETABLE PAGE

The timetable page should be dynamic.

Do NOT build a static Monday-Friday table and stop there.

Support at least:

### Weekly view

For administrators:

Monday → Friday
with scheduled classes displayed by time.

### Daily view

Useful for teachers:

Monday, September 10

08:00
Mathematics
SS2A
Room 12

09:00
Physics
SS2B
Lab 1

11:00
Free period

### My Timetable

For a teacher:

Only show their scheduled classes.

### Class Timetable

For a selected class:

Show that class's schedule.

Use the same underlying timetable data.

Do not create separate timetable systems for each view.

---

# 15. DYNAMIC SCHOOL SUPPORT

Do NOT hard-code:

- Monday–Friday only
- 40-minute periods
- 8 periods per day
- specific school levels
- specific class naming conventions
- specific subjects
- specific room structures

At minimum, allow the organization configuration/timetable data to determine:

- active days
- class times
- recurring schedule
- effective dates
- classes
- teachers
- subjects
- locations

If the existing school settings architecture already contains these concepts, reuse it.

---

# 16. TEACHER'S TIMETABLE

A teacher's timetable is not just a display.

It will become the source of truth for teacher attendance.

For example:

MONDAY

08:00–08:40
Mathematics
SS2A
Room 12

09:00–09:40
Physics
SS2B
Lab 1

When the authenticated teacher opens Roll SYNC, the system should know what classes they are expected to teach.

This will later allow the system to determine:

- upcoming class
- current class
- completed class
- missed class
- late arrival
- early arrival

Do not implement all attendance behavior yet unless the existing attendance infrastructure already supports it.

Build the data relationships that make it possible.

---

# 17. CLASS QR FOUNDATION

Each Class should eventually be identifiable by a QR code.

For now:

- create the stable class identity required for this
- make the class resolvable by an internal identifier
- do not build QR scanning yet
- do not duplicate class information inside the QR

The future flow will be:

Class QR
→ resolves Class
→ current authenticated User
→ current time
→ timetable lookup
→ validate teacher/class relationship
→ identify expected class
→ create/confirm Attendance Session

This implementation must make that future flow possible.

---

# 18. FUTURE TEACHER CHECK-IN

Design the infrastructure for this future flow:

Teacher logs in
↓
Roll SYNC knows their User
↓
Membership resolves organization
↓
Person resolves teacher identity
↓
Current time
↓
Timetable lookup
↓
Find expected class
↓
Teacher scans Class QR
↓
QR resolves Class
↓
Cross-reference Teacher + Class + Time
↓
Class confirmed
↓
Teacher check-in recorded
↓
Attendance Session opened

Do not implement a second identity system for teacher attendance.

---

# 19. TEACHER ARRIVAL STATUS

The future system should be able to calculate:

- Early
- On time
- Late
- Very late
- Missed
- Unconfirmed

Do NOT hard-code final thresholds unless the existing architecture already defines them.

Prefer configurable organization-level attendance settings later.

Most importantly:

Do NOT immediately classify a teacher as absent solely because no scan occurred.

The absence workflow must account for:

- cancelled classes
- substitutions
- timetable changes
- network failure
- manual corrections
- emergencies

The underlying state should be capable of distinguishing:

EXPECTED
→ NO CHECK-IN
→ NEEDS REVIEW

rather than blindly declaring absence.

---

# 20. ATTENDANCE SESSION

The future attendance architecture should distinguish:

### Timetable

What should happen.

### Attendance Session

The actual class session that took place.

### Attendance Record

Who attended that session.

Conceptually:

Timetable
→ expected Mathematics SS2A at 08:00

Teacher check-in
→ actual session begins

Attendance Session
→ Mathematics / SS2A / Jane / actual start time

Attendance Records
→ John Present
→ Sarah Present
→ David Absent

Do not make User the attendance subject.

Attendance subjects are Persons.

The authenticated User is the operator.

---

# 21. SUPPORT MULTIPLE ATTENDANCE METHODS

Everything must be designed so future attendance methods resolve into the same canonical objects.

### QR

Class QR
→ Class
→ Timetable
→ Attendance Session
→ Person attendance

### Roll Call

Teacher
→ current Attendance Session
→ selects Person
→ Attendance Record

### Student QR

Student identity
→ Person
→ active Attendance Session
→ Attendance Record

### ID Scan

ID
→ Person
→ Attendance Session
→ Attendance Record

Do NOT create separate attendance identities for each method.

The canonical identity remains:

Person.

---

# 22. TEACHER ACCESS

A teacher should eventually be able to use Roll SYNC because they are an authorized member of the organization.

The conceptual chain is:

Person
→ linked User
→ Organization Membership
→ existing role/permissions
→ Teacher capabilities

Do NOT require the teacher to manually select their identity every time.

Do NOT create a special "Teacher Auth" system.

Do NOT make every Person a User.

---

# 23. AUTHORIZATION

Use the existing authorization architecture.

For protected operations:

1. authenticate User
2. resolve organization from slug
3. verify Membership
4. verify required permission
5. resolve Person if necessary
6. verify Person belongs to organization
7. validate the operation
8. perform the mutation

Never rely on client-side checks.

A teacher must not be able to:

- modify another organization's timetable
- assign themselves to arbitrary classes
- access another organization's students
- start unauthorized attendance sessions
- modify classes they don't have permission to manage

UI visibility is not security.

---

# 24. TIMETABLE CONFLICTS

Where practical, detect obvious conflicts.

Examples:

Teacher:

08:00–08:40
SS2A

and simultaneously:

08:00–08:40
SS3B

should be flagged.

Likewise, if the same physical room is assigned to two classes simultaneously, flag it where the existing architecture supports room tracking.

Do not build an elaborate optimization engine.

Simple validation is enough.

---

# 25. PEOPLE PAGE MUST EVENTUALLY REFLECT THIS

Do not redesign the People UI extensively in this task.

But structure the data so People can later show:

Name
Type
Roll SYNC Access
Role
Class
Status
Attendance

For example:

Jane Smith
Teacher
Active
Member
Teaches SS2A, SS2B

John Doe
Student
No access
—
SS2A

This is why People, Membership, Classes, and Timetable must be connected.

---

# 26. SCHOOL ADMIN WORKFLOW

The intended school setup should eventually be:

Create School
↓
Add People
↓
Create Classes
↓
Assign Students to Classes
↓
Add Subjects
↓
Assign Teachers
↓
Add Rooms/Venues
↓
Build Timetable
↓
Assign Class QR identities
↓
Teachers use their timetable
↓
Attendance begins

Make the underlying infrastructure support this progression.

Do not force administrators to enter duplicate information.

---

# 27. UX

Follow the existing Roll SYNC application visual language.

Keep the UI:

- clean
- modern
- fast
- practical
- spacious
- professional

Use subtle animations only where useful.

For Timetable:

- smooth view switching
- responsive timetable cells
- hover/selection feedback
- clear current-time indicator where appropriate
- loading states
- empty states
- mobile-friendly layout
- reduced-motion support

Do not redesign the entire workspace shell.

Do not introduce unnecessary cards, gradients, or decorative dashboards.

---

# 28. MOBILE CONSIDERATION

The underlying infrastructure must work for both web and mobile clients.

Do not design the data model around web-only assumptions.

The eventual mobile flow must be able to:

- authenticate a teacher
- fetch their timetable
- identify the current class
- scan a Class QR
- submit teacher check-in
- work with the existing offline-first strategy where appropriate

Do not implement the mobile attendance flow yet.

Just ensure the backend/data architecture does not prevent it.

---

# 29. OFFLINE-FIRST COMPATIBILITY

Roll SYNC is intended to support offline attendance.

Do not make the timetable or class identity dependent on a live connection for every basic operation.

The eventual mobile client should be able to cache enough timetable/class information to determine the current context.

Do not implement a new offline system.

Use the existing offline architecture.

---

# 30. AUDITABILITY

Use the existing audit infrastructure if available.

Important changes should eventually be auditable:

- class creation
- class membership changes
- teacher assignment changes
- timetable changes
- timetable exceptions
- teacher attendance/check-in
- attendance corrections

Do not create a duplicate audit system.

---

# 31. DATABASE CHANGES

Use the existing Prisma 7 schema as the source of truth.

Before adding models:

- check whether the concept already exists
- reuse existing relationships
- avoid duplicate tables
- avoid redundant fields
- keep organization scoping explicit

Only add what is genuinely necessary.

Do not redesign unrelated parts of the schema.

If a migration is required, make the smallest production-safe migration.

---

# 32. ROUTES

At minimum, establish:

/[slug]/timetable

and whatever nested routes are necessary for:

- timetable management
- class management
- class details

Use the existing routing conventions.

Do not create unrelated routes.

The final route structure should remain compatible with:

/[slug]/people
/[slug]/attendance
/[slug]/reports

and the future attendance implementation.

---

# 33. DO NOT BUILD YET

Do NOT implement the full attendance system in this task.

Specifically do not build:

- QR scanning
- student QR scanning
- ID scanner
- full roll call UI
- attendance reports
- teacher absence automation
- realtime
- WebSockets
- Socket.IO
- notification infrastructure
- biometric attendance
- facial recognition
- GPS tracking
- new authentication
- new authorization
- payment infrastructure

The purpose of this task is to establish the infrastructure those features will depend on.

---

# 34. IMPORTANT: DO NOT OVERENGINEER

The goal is a clean foundation, not an enterprise scheduling platform.

Prefer:

- simple relational models
- clear relationships
- organization scoping
- strong constraints
- reusable components
- existing infrastructure
- minimal dependencies
- straightforward server-side operations

Avoid speculative abstractions.

Avoid generic frameworks that solve problems we don't currently have.

---

# 35. VALIDATION

After implementation:

```bash
pnpm lint
pnpm run build
````

Fix all issues caused by the implementation.

Do not:

* use `any`
* disable lint rules unnecessarily
* hide TypeScript errors
* introduce unsafe casts
* upgrade dependencies to solve unrelated issues

---

# FINAL SUCCESS CRITERIA

The infrastructure is successful when:

* People represent organization identities
* Users represent Roll SYNC authentication identities
* Membership represents organization access
* Teachers can be linked to authenticated Users
* Classes are first-class organization entities
* Students can belong to Classes through explicit membership
* Subjects can be associated with teaching assignments
* Teachers can be associated with Classes through timetable assignments
* Rooms/Venues can be associated with timetable entries
* Timetable is a first-class workspace module
* Timetable supports recurring schedules
* Timetable supports practical exceptions
* Timetable supports teacher/class/daily/weekly views
* Timetable is not hard-coded around one school's schedule format
* Class identity is stable and ready for QR integration
* The data model supports teacher check-in against timetable context
* Attendance can later reference Person rather than User
* Attendance Sessions can later represent actual class occurrences
* Future QR, roll-call, and ID methods can resolve to the same Person identity
* People can later reflect both attendance identity and Roll SYNC membership/access
* authorization remains based on the existing User + Membership architecture
* everything remains organization-scoped
* no duplicate infrastructure was introduced
* existing onboarding/workspace/settings remain functional
* `pnpm lint` passes
* `pnpm run build` passes

Build this as the foundation for the next phase:

**People redesign → Teacher timetable → Class QR → Teacher check-in → Attendance Session → Student attendance methods.**

Do not skip the relationships between these systems.

```
```
