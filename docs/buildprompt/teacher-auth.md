# Roll SYNC — Teacher Identity, Access & Attendance Handoff

## Objective

Implement the missing bridge between Roll SYNC authentication, organization membership, Person records, teacher identity, timetable infrastructure, and the existing attendance system.

Do NOT redesign the existing architecture.

Do NOT create a separate teacher authentication system.

Do NOT replace the existing attendance infrastructure.

The goal of this task is to make a real Roll SYNC User capable of becoming/being recognized as a Teacher Person inside an organization and prepare the authenticated teacher to enter the existing attendance flow correctly.

The next phase will build the complete teacher daily attendance experience and student roll call. This task must establish everything that phase depends on.

---

# 1. Inspect the Existing Codebase First

Before writing code, inspect:

- Better Auth configuration
- User model
- Session handling
- Organization model
- Membership model
- Person model
- `Person.linkedUserId`
- Person types/categories
- existing permissions/roles
- invitation-related models if any
- Classes
- Class memberships
- Subjects
- Teacher assignments
- Timetable
- Timetable exceptions
- Attendance Session
- Attendance Records
- existing authorization helpers
- existing organization/slug resolution
- existing audit infrastructure
- existing `/[slug]` workspace
- existing `/[slug]/people`
- existing `/[slug]/attendance/session`
- existing `/[slug]/attendance/record`
- existing `/[slug]/timetable`

Reuse what already exists.

Do not create duplicate models, helpers, authentication systems, permissions, or infrastructure.

---

# 2. Core Identity Model

Preserve this distinction:

```text
User
= Roll SYNC login identity

Person
= organization's real-world attendance identity

Membership
= User's access to an Organization
````

A Person is NOT automatically a User.

A Person should only become linked to a User through an explicit linking/invitation process.

Preserve:

```text
Person.linkedUserId
```

and the existing rule that adding a Person must NOT automatically create a Roll SYNC account.

---

# 3. Teacher Account Flow

Implement the missing flow that allows an organization administrator to connect an existing/new Roll SYNC User to a Teacher Person.

Desired lifecycle:

```text
Admin
 ↓
People
 ↓
Select Teacher Person
 ↓
Invite / connect Teacher
 ↓
Teacher signs up or signs in
 ↓
Teacher User is linked to Teacher Person
 ↓
Membership exists
 ↓
Teacher can access the organization
 ↓
Teacher's permissions are resolved
 ↓
Teacher's timetable becomes available
```

Do not create a separate "Teacher Login."

There is only one Roll SYNC login.

After authentication, the application determines:

```text
User
 ↓
Organization Membership
 ↓
Linked Person
 ↓
Person Type = Teacher
 ↓
Permissions
 ↓
Timetable
```

---

# 4. Invitation / Claim Flow

If the architecture already contains an invitation mechanism, use it.

If it does not, implement the smallest production-safe invitation flow necessary.

Requirements:

* Organization admin/owner can invite a Teacher Person.
* Invitation must be tied to the organization and Person.
* Invitation must be securely generated.
* Invitation must expire.
* Invitation must not expose sensitive data.
* Teacher can accept the invitation.
* Teacher can sign up or sign in using the existing Better Auth system.
* On successful acceptance:

  * link `Person.linkedUserId`
  * establish/confirm organization Membership
  * preserve existing Person record
  * preserve existing User record
  * never create duplicate Person records
  * never create duplicate memberships
  * never create duplicate User accounts unnecessarily

If the teacher already has a Roll SYNC account, the invitation should link that existing account rather than creating another one.

If they don't have an account, allow the existing authentication flow to create one and then link it.

Use existing audit infrastructure for important identity/access changes.

---

# 5. Organization Access

After login, determine the organizations the authenticated User belongs to.

Behavior:

### One organization

Send the user directly to:

```text
/[slug]/overview
```

### Multiple organizations

Allow the user to choose the organization they want to enter.

Reuse the existing organization switcher where possible.

### No organizations

Do not fabricate access.

Show the existing appropriate empty state / onboarding / invitation state.

Never allow a User to access an organization merely because they know its slug.

Every `[slug]` route must remain protected by server-side membership/authorization checks.

---

# 6. Teacher Recognition

Once a teacher logs into an organization, the server should be able to resolve:

```text
authenticated User
        ↓
organization membership
        ↓
linked Person
        ↓
Person.type/category = Teacher
```

This teacher identity must then be usable by the existing timetable and attendance infrastructure.

Do NOT treat the User ID as the teacher attendance identity.

Attendance should continue to use the Person identity.

Conceptually:

```text
User
  ↓ authentication
Membership
  ↓ authorization
Teacher Person
  ↓ attendance identity
Timetable Assignment
  ↓ expected work
Attendance Session
  ↓ actual class
Attendance Records
  ↓ actual student attendance
Student Persons
```

---

# 7. Teacher Timetable Context

Connect the authenticated teacher identity to the timetable system that already exists.

A teacher should be able to retrieve their timetable based on their linked Person.

For example:

```text
Teacher Person
 ↓
Teacher timetable assignments
 ↓
Today's scheduled classes
```

The system should determine:

* teacher
* class
* subject
* room/venue
* scheduled start
* scheduled end
* timetable status
* exceptions where supported by the existing model

Do NOT ask the teacher to manually select a subject when the timetable already determines it.

Do NOT duplicate timetable data.

---

# 8. Prepare the Existing Attendance Flow

This task must connect teacher identity to the existing attendance architecture.

The intended future flow is:

```text
Teacher logs in
        ↓
Organization
        ↓
Teacher Person
        ↓
Today's timetable
        ↓
Teacher chooses scheduled class
        ↓
Sign In
        ↓
Scan Class QR
        ↓
QR provides classId only
        ↓
Server validates:
    authenticated User
    organization membership
    linked Teacher Person
    class
    teacher assignment
    timetable
    current time
    timetable exceptions
        ↓
Resolve subject automatically
        ↓
Create/retrieve Attendance Session
        ↓
Teacher is inside the session
        ↓
Student roll call
```

For THIS task:

### Implement everything through the point where the authenticated teacher can be correctly resolved against their organization and timetable and handed into the attendance session flow.

Do not build the complete student roll-call UX yet.

Do not implement every attendance interaction yet.

But the backend contracts and teacher context must be ready for the next phase.

---

# 9. Attendance Security

The server must never trust teacher IDs supplied by the client.

Do NOT allow:

```ts
{
  teacherPersonId: "someone-elses-id"
}
```

to determine who is taking attendance.

Instead:

```text
Better Auth session
 ↓
authenticated User
 ↓
organization membership
 ↓
linked Person
 ↓
verify Person is Teacher
```

The authenticated identity is authoritative.

Likewise, if a class is provided through QR:

```text
classId
 ↓
organization
 ↓
teacher timetable assignment
 ↓
current scheduled occurrence
 ↓
subject
 ↓
attendance session
```

The server must validate the entire relationship.

A teacher must not be able to create attendance for another teacher's class simply by changing a request payload.

---

# 10. Role / Permission Behavior

Do not invent a new teacher role if the existing authorization system already separates:

* Person type
* Membership role
* permissions

Keep those concepts separate.

Example:

```text
Person:
Teacher

Membership:
Member

Permissions:
existing teacher-relevant permissions
```

An Administrator may also be a Person.

A Director may also be a Person.

Do not assume:

```text
Person type === authorization role
```

Use the existing permission architecture.

---

# 11. Teacher Experience

Update the existing workspace so that a linked teacher can actually see their organization and teacher context.

Use the existing UI/design.

Do not redesign the application.

Teacher should eventually have access to the existing:

```text
/[slug]/overview
/[slug]/attendance/session
/[slug]/attendance/record
/[slug]/timetable
/[slug]/people
```

according to permissions.

For this phase, make sure:

* teacher identity resolves correctly
* today's timetable can resolve correctly
* teacher-specific timetable data is available
* attendance session route knows who the teacher is
* unauthorized teachers cannot access another teacher's sessions/classes
* no organization data leaks across organizations

---

# 12. Test the Full Identity Chain

Do not consider this feature complete if only the database link works.

Test this real flow:

```text
Create Teacher Person
        ↓
Invite Teacher
        ↓
Teacher creates/logs into Roll SYNC account
        ↓
Accept invitation
        ↓
Person.linkedUserId is populated
        ↓
Membership exists
        ↓
Logout
        ↓
Login again
        ↓
Select organization if necessary
        ↓
Enter /[slug]/overview
        ↓
Teacher identity resolves
        ↓
Today's timetable resolves
        ↓
Teacher's assigned classes are visible
        ↓
Attendance session context can resolve teacher + class
```

Also test:

### Existing account

A teacher who already has a Roll SYNC User should be able to accept an invitation without creating another account.

### Multiple organizations

A User belonging to multiple organizations must only see data from the currently selected organization.

### Unlinked Person

A Teacher Person without a linked User remains an organization identity but cannot log in as that teacher.

### Non-teacher

A linked Student/Staff/Administrator must not accidentally receive teacher attendance capabilities merely because they have a linked User.

### Unauthorized teacher

Teacher A must not be able to manipulate requests to access Teacher B's classes or attendance sessions.

---

# 13. Do NOT Implement Yet

Do NOT expand this task into unrelated work.

Specifically do not:

* redesign the dashboard
* redesign authentication UI
* create separate Teacher Login
* create a second attendance system
* create a second timetable system
* create a second permission system
* add realtime/WebSockets
* add Socket.IO
* add another queue
* replace BullMQ
* create another backend
* create a NestJS API
* add unnecessary dependencies
* create duplicate Prisma models
* automatically create Users when adding People
* automatically create attendance records
* hard-code attendance timing thresholds
* build the complete student roll-call UX yet

The next implementation phase will specifically handle:

```text
Teacher's day
 ↓
Today's classes
 ↓
Sign in at the correct time
 ↓
Scan class QR
 ↓
Validate class + teacher + timetable + time
 ↓
Create/retrieve session
 ↓
Open roll call
 ↓
Mark students Present/Absent/etc.
 ↓
Persist attendance
```

Prepare the architecture for that flow without prematurely rebuilding it.

---

# 14. Security / Data Integrity

Verify:

* organization isolation
* membership checks
* Person ownership within organization
* linkedUserId uniqueness where appropriate
* no duplicate memberships
* no duplicate invitations
* expired invitations rejected
* invitation cannot be reused after acceptance
* teacher cannot impersonate another Person
* attendance authorization is server-side
* User deletion does not destroy historical Person attendance data
* removing organization membership does not delete the global Better Auth User
* deactivating a Person preserves historical attendance

Use existing audit infrastructure.

---

# 15. Code Quality

While implementing:

* inspect before changing
* reuse existing helpers
* remove duplication
* keep server/client boundaries correct
* use strict TypeScript
* no `any`
* no `@ts-ignore`
* no unsafe casts unless genuinely unavoidable
* avoid unnecessary `useEffect`
* avoid unnecessary client components
* avoid duplicate data fetching
* avoid N+1 queries
* select only required Prisma fields
* keep authorization close to the server boundary
* keep the implementation minimal and production-safe

Do not refactor unrelated parts of the application just for the sake of refactoring.

---

# 16. Responsive Design

While touching the teacher experience, ensure the existing design remains responsive.

First inspect the existing desktop design.

Do not redesign it.

Make it work cleanly at:

* 320px
* 375px
* 390px
* 430px
* tablet
* desktop

Teacher attendance screens must be particularly usable on mobile because the eventual workflow will be used while moving around the school.

Do not simply make every table horizontally scroll.

Use appropriate mobile layouts where the existing design calls for them.

---

# 17. Validation

Before finishing:

```bash
pnpm install
pnpm lint
pnpm run build
```

Fix all errors introduced by the implementation.

Do not suppress lint/build errors.

---

# Definition of Done

This task is complete only when:

* [ ] Roll SYNC has one unified authentication system
* [ ] Teacher Person can be linked to an existing/new User
* [ ] Invitation/claim flow works
* [ ] Membership is established correctly
* [ ] Multiple organizations work correctly
* [ ] Organization isolation is enforced server-side
* [ ] Teacher identity resolves from authenticated User → Membership → Person
* [ ] Person remains the attendance identity
* [ ] Teacher's timetable can be resolved from their Person
* [ ] Today's teacher timetable can be displayed
* [ ] Existing attendance infrastructure can resolve the authenticated teacher
* [ ] Teacher cannot access another teacher's classes/sessions
* [ ] No duplicate authentication/attendance/timetable architecture was introduced
* [ ] Existing UI/design remains intact
* [ ] Mobile experience remains usable
* [ ] `pnpm lint` passes
* [ ] `pnpm run build` passes

At the end, report:

1. What was already present.
2. What you implemented.
3. How User → Membership → Person → Teacher → Timetable → Attendance now connects.
4. Which files/routes were changed.
5. Any schema changes made, and why.
6. What remains for the next teacher attendance + student roll-call phase.
7. Lint/build results.

```

**The key is that this doesn't make “auth” the finish line.** It establishes the identity chain all the way to the existing timetable/attendance infrastructure, so the next prompt can focus purely on the actual teacher's day: **see today's classes → sign in → scan class QR → server validates → session opens → roll call.**
```
