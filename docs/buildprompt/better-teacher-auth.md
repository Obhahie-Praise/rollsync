# Roll SYNC — Correct Member Account Infrastructure & Implement Add Member

## Objective

Correct the existing People, authentication, membership, teacher identity, timetable, and attendance infrastructure around one clear product rule:

> **"Add Member" creates an official Roll SYNC account for that person and gives them access to the organization.**

Do not introduce a new architecture.

Do not redesign the existing application.

Do not replace Better Auth, Prisma, the existing organization/membership system, timetable infrastructure, or attendance infrastructure.

First inspect the existing implementation, identify code that conflicts with this rule, then implement the feature cleanly on top of the existing protocol.

The goal is to leave the codebase with one clear identity/access model and no unnecessary invitation/claim/duplicate-account infrastructure.

---

# 1. Core Product Rule

Roll SYNC has two different concepts:

### Add Person

Creates an organization attendance identity.

```text
Person
  ├── name
  ├── type
  ├── organization
  └── attendance identity

No Roll SYNC account
No membership
No login
````

### Add Member

Creates an official Roll SYNC account AND organization membership.

```text
Admin
 ↓
Add Member
 ↓
Create official Roll SYNC account
 ↓
Create/link Person
 ↓
Create Organization Membership
 ↓
Member can log into Roll SYNC
```

For a teacher:

```text
USER
Jane Smith
   │
   ├── Better Auth authentication
   │
   └── Organization Membership
             │
             ▼
PERSON
Jane Smith
Type: Teacher
             │
             ▼
TIMETABLE
Teacher assignments
             │
             ▼
ATTENDANCE
Sessions / Records
```

This is the source of truth for the implementation.

---

# 2. IMPORTANT: Inspect Before Changing

Before implementing anything, inspect the existing codebase for:

* Better Auth configuration
* User model
* Person model
* `Person.linkedUserId`
* Organization
* Membership
* roles
* permissions
* People page
* Add Person flow
* Add Member flow if partially implemented
* invitation models
* invitation routes
* invitation UI
* claim-account logic
* account activation logic
* teacher linking logic
* organization access helpers
* timetable
* teacher assignments
* attendance session
* attendance record
* auth/session helpers
* slug/org resolution
* audit infrastructure
* existing onboarding/new-org flow

Understand what is actually present before making assumptions.

---

# 3. Correct the Existing Identity Model

Preserve this distinction:

```text
User
= Roll SYNC login identity

Person
= organization's real-world identity

Membership
= User's access to an Organization
```

A Person is not automatically a User.

However:

> When an administrator chooses **Add Member**, Roll SYNC explicitly creates/provisions the User and connects it to the Person.

Therefore:

```text
Add Person
→ Person only

Add Member
→ Person + User + Membership
```

Do not create Users automatically when someone is merely added as a Person.

---

# 4. Remove the Wrong / Obsolete Flow

If the previous implementation introduced any of the following solely to solve teacher access:

* email invitation flow
* invitation acceptance flow
* teacher claim-account flow
* invitation tokens
* claim tokens
* duplicate teacher onboarding
* separate teacher account creation
* temporary teacher identity systems
* redundant membership creation
* redundant User ↔ Person linking logic

remove them if they are not used elsewhere in the application.

Do NOT blindly delete infrastructure.

Before deleting anything, verify whether it is referenced elsewhere.

If it is genuinely obsolete because of the new Add Member protocol:

* remove the route
* remove the UI
* remove the server action/API
* remove unused types
* remove unused helpers
* remove unused schema models/fields only if they are truly no longer required
* remove unused imports
* remove unused dependencies only if they exist solely for this obsolete flow

Do not leave dead code behind.

---

# 5. Implement Add Member

Implement the existing People → Add Member action using the application's current design.

Do not redesign the People page.

The flow should collect the information necessary to create the member.

At minimum:

```text
Name
Email
Person type
```

Use the existing Person categories.

For schools this may include:

* Student
* Teacher
* Staff
* Administrator
* Director

Do not create unnecessary categories.

---

# 6. Account Provisioning

When the administrator submits Add Member:

The server must perform the operation safely and atomically.

Conceptually:

```text
Validate admin authorization
        ↓
Validate member data
        ↓
Check organization access
        ↓
Check whether Person already exists
        ↓
Check whether email already belongs to a User
        ↓
Create/reuse User appropriately
        ↓
Create/reuse Person appropriately
        ↓
Link Person.linkedUserId
        ↓
Create/reuse Organization Membership
        ↓
Commit transaction
```

Do not create duplicate:

* Users
* Persons
* Memberships

The operation should be idempotent where practical.

---

# 7. Existing User Handling

This is important.

If the email already belongs to an existing Roll SYNC User:

DO NOT create another User.

Instead:

```text
Existing User
      ↓
Create/reuse Person
      ↓
Link Person.linkedUserId
      ↓
Create organization Membership
```

The person should now be able to log into Roll SYNC normally and see the organization.

If the email does not belong to a User:

Create the account using the existing Better Auth-compatible account provisioning flow.

Do not invent a second authentication system.

---

# 8. Initial Account Credentials

Use the existing authentication protocol and established Roll SYNC account flow.

The organization ID may be used as the initial/default access code if that is already the agreed product behavior.

However:

* do not store organization IDs as passwords
* do not store plaintext passwords
* do not weaken Better Auth password hashing
* do not expose credentials in URLs
* do not log credentials
* do not create insecure shared credentials

If the existing protocol uses an initial access code/password, implement it safely and make the user able to establish/change their own credentials afterward.

Do not introduce an email invitation requirement.

---

# 9. Membership Creation

When Add Member succeeds, the member must have an organization membership.

Use the existing Membership model.

Respect the existing role/permission architecture.

Do not create a new "TeacherRole" merely because the Person is a Teacher.

Remember:

```text
Person Type
≠
Authorization Role
```

Example:

```text
Person:
Jane Smith
Type: Teacher

Membership:
Jane Smith
Role: Member

Permissions:
existing teacher-relevant permissions
```

Use whatever roles/permissions already exist in the codebase.

---

# 10. Person Linking

After account provisioning:

```text
Person.linkedUserId = User.id
```

This must happen only through an explicit Add Member operation or equivalent legitimate account-linking flow.

Validate that:

* one User is not incorrectly linked to multiple unrelated Persons in the same organization
* one Person is not linked to multiple Users
* duplicate membership is not created
* linking cannot cross organizations improperly

Do not break existing historical attendance data.

---

# 11. Teacher Identity

A Teacher should now be fully represented as:

```text
Better Auth User
        ↓
Organization Membership
        ↓
Person
Type = Teacher
        ↓
Teacher timetable assignments
```

After the teacher logs in, Roll SYNC should be able to resolve:

```text
authenticated User
organization
membership
linked Person
Person type
permissions
teacher timetable
```

This must happen using the existing server-side authorization/session infrastructure.

Do not rely on client state for authorization.

---

# 12. Teacher + Timetable Integration

Connect the newly provisioned Teacher member to the existing timetable infrastructure.

Do not build another teacher scheduling system.

The existing timetable should already know:

```text
Teacher
Class
Subject
Room
Start
End
Recurrence
Exceptions
```

The authenticated teacher should therefore be able to retrieve their own scheduled classes through their linked Person.

For example:

```text
Jane Smith
Teacher

Today's timetable:

08:00
Mathematics
SS2A
Room 12

10:00
Physics
SS2B
Science Lab
```

Only show classes assigned to the authenticated teacher.

Do not allow the frontend to choose an arbitrary teacher ID.

---

# 13. Attendance Handoff

Do not rebuild attendance.

Connect the new teacher identity to the existing attendance protocol.

The intended flow after this implementation is:

```text
Teacher logs in
      ↓
Organization membership
      ↓
Teacher Person
      ↓
Today's timetable
      ↓
Scheduled class
      ↓
Sign in
      ↓
Class QR
      ↓
classId
      ↓
Server validates:
    authenticated User
    organization
    Teacher Person
    class
    timetable assignment
    current time
    exceptions
      ↓
Resolve subject automatically
      ↓
Create/retrieve Attendance Session
      ↓
Teacher enters attendance session
```

This task should make the identity and authorization side of that flow work.

Do not implement the complete student roll-call UX yet.

The next task will handle:

```text
Teacher's daily attendance
→ class sign-in
→ QR scan
→ session creation
→ student list
→ Present / Absent / Late/etc.
→ persistence
```

Prepare the existing attendance system for that flow rather than creating a parallel one.

---

# 14. Login Behavior

There is only ONE Roll SYNC login.

Never create:

```text
Teacher Login
Admin Login
Student Login
```

Instead:

```text
User logs into Roll SYNC
        ↓
Better Auth session
        ↓
Find memberships
        ↓
Select organization if necessary
        ↓
Resolve Person
        ↓
Resolve permissions
        ↓
Load organization workspace
```

### One organization

Go directly to:

```text
/[slug]/overview
```

### Multiple organizations

Use the existing organization switcher/selection behavior.

### No organizations

Use the existing appropriate empty state.

Never grant access merely because a user knows an organization slug.

---

# 15. People Page

Keep the existing People design.

Ensure the distinction is visible in the UI.

A Person without an account should show something like:

```text
Access: No access
```

A Member should show:

```text
Access: Active
Role: Member
```

A Teacher Member should therefore appear like:

```text
Jane Smith
Teacher
Active
Member
```

Do not add unnecessary complexity.

---

# 16. Security

All account/member creation must be server-authorized.

Only users with the appropriate organization permission may create members.

Validate:

* authenticated session
* organization membership
* required admin permission
* organization ownership of Person
* organization membership uniqueness
* User/Person relationship
* email validity
* account provisioning
* role/permission assignment

Never trust:

```text
organizationId
userId
personId
role
teacherPersonId
```

from the client without server verification.

A malicious user must not be able to turn themselves into an administrator or create access in another organization by modifying a request.

---

# 17. Transaction Safety

Add Member is a multi-step operation.

Where Prisma transactions are appropriate, use an atomic transaction for the organization-side records.

Do not leave the database in a partially created state such as:

```text
User created
Person failed
Membership failed
```

If Better Auth account creation cannot safely participate in the same database transaction, structure the provisioning flow carefully and make failure/retry behavior explicit.

Do not pretend external/auth operations are transactional if they are not.

---

# 18. Existing Protocol First

Before adding new helpers, look for existing implementations of:

* `getCurrentUser`
* `requireAuth`
* `requireOrganization`
* `requireMembership`
* `requirePermission`
* `getOrganizationBySlug`
* User lookup
* Person lookup
* Membership creation
* role checks
* audit logging

Reuse them.

If several helpers perform the same job, consolidate only where it clearly improves the existing architecture.

Do not create:

```text
getTeacherAuth()
getTeacherOrganization()
getTeacherMembership()
getTeacherUser()
```

if the existing generic authorization helpers can handle it.

Teacher-specific logic should only exist where genuinely necessary.

---

# 19. Remove Bloat

After implementation, audit the affected infrastructure for dead code.

Remove genuinely unused:

* invitation components
* invitation routes
* claim pages
* claim actions
* unused API endpoints
* duplicate account provisioning helpers
* duplicate membership helpers
* duplicate Person/User linking logic
* unused schemas/types
* unused imports
* abandoned comments
* obsolete constants
* dead feature flags
* unused dependencies introduced solely for the old approach

Also check for duplicate logic around:

```text
User → Person
User → Membership
Person → Organization
Organization → Membership
```

Keep one clear implementation.

Do NOT perform a massive unrelated refactor.

Clean only what is connected to this feature or clearly dead.

---

# 20. TypeScript / Next.js Quality

Follow existing project standards.

Use:

* strict TypeScript
* server-side authorization
* Server Actions or Route Handlers where already appropriate
* existing Prisma client
* existing Better Auth
* existing validation approach

Avoid:

* `any`
* `@ts-ignore`
* unsafe casts
* unnecessary client components
* unnecessary `useEffect`
* duplicated fetching
* N+1 queries
* over-fetching
* unnecessary dependencies

Keep client components responsible for interaction.

Keep account provisioning and authorization on the server.

---

# 21. UX

Do not redesign the application.

Use the existing People/Add Member visual language.

Add appropriate:

* loading state
* validation errors
* duplicate-account handling
* success state
* account creation feedback
* disabled submit state
* clear indication of what "Add Member" does

The user should understand:

> "This creates an official Roll SYNC account for this person."

Do not introduce unnecessary steps.

---

# 22. Test These Cases

### Case 1 — New teacher

```text
Admin
→ Add Member
→ Jane Smith
→ Teacher
→ email
→ account created
→ Person created
→ linkedUserId populated
→ Membership created
→ Jane logs in
→ sees organization
→ teacher identity resolves
→ timetable resolves
```

### Case 2 — Existing Roll SYNC User

```text
Admin
→ Add Member
→ existing user's email
→ existing User reused
→ Person linked
→ Membership created
→ no duplicate User
```

### Case 3 — Existing Person

```text
Person already exists
→ Admin chooses Add Member
→ existing Person reused
→ User created/reused
→ linkedUserId populated
→ Membership created
```

### Case 4 — Duplicate member

Attempting to add an already active member must not create:

* duplicate User
* duplicate Person
* duplicate Membership

Handle this gracefully.

### Case 5 — Student

Adding a Student as a member should work without accidentally granting teacher permissions.

### Case 6 — Teacher authorization

Teacher A must not be able to access Teacher B's timetable or attendance sessions.

### Case 7 — Multiple organizations

A User belonging to Organization A and Organization B must see the correct data for the currently selected organization.

### Case 8 — Unlinked Person

Adding a Person alone must still work and must NOT create a User account.

---

# 23. Final Architecture

After implementation, the system should conceptually look like:

```text
                         ROLL SYNC USER
                              │
                    Better Auth authentication
                              │
                              ▼
                       ORGANIZATION
                              │
                       Membership
                              │
                              ▼
                           PERSON
                              │
                 ┌────────────┼─────────────┐
                 │            │             │
              Student      Teacher        Staff
                              │
                              ▼
                         TIMETABLE
                              │
                    scheduled class
                              │
                              ▼
                     ATTENDANCE SESSION
                              │
                              ▼
                    ATTENDANCE RECORDS
                              │
                              ▼
                        STUDENT PERSONS
```

And the two creation paths remain:

```text
ADD PERSON
Person only
↓
Attendance identity
↓
No login


ADD MEMBER
Person
+
User
+
Membership
↓
Official Roll SYNC account
↓
Can login
↓
Permissions
↓
Timetable / Attendance
```

This is the architecture to preserve going forward.

---

# 24. Validation

Run:

```bash
pnpm install
pnpm lint
pnpm run build
```

Fix all errors.

Do not suppress errors to make the build pass.

Verify that no obsolete invitation/claim code remains if it is genuinely unused.

---

# Definition of Done

This implementation is complete when:

* [ ] Add Person still creates an attendance identity without an account
* [ ] Add Member creates an official Roll SYNC account
* [ ] Add Member creates/reuses the correct Person
* [ ] Add Member creates/reuses the correct Membership
* [ ] Person.linkedUserId is correctly populated
* [ ] Existing Users are reused instead of duplicated
* [ ] Existing Persons are reused instead of duplicated
* [ ] Duplicate memberships are prevented
* [ ] No email invitation is required for the Add Member flow
* [ ] There is no separate teacher authentication system
* [ ] Teacher identity resolves from User → Membership → Person
* [ ] Teacher timetable resolves from the linked Person
* [ ] Existing attendance infrastructure can resolve the authenticated teacher
* [ ] Server-side organization/permission checks are enforced
* [ ] Teacher cannot access another teacher's classes/sessions
* [ ] Existing UI remains intact
* [ ] Obsolete invitation/claim code is removed where genuinely unused
* [ ] No duplicate infrastructure was introduced
* [ ] No unnecessary dependencies remain
* [ ] `pnpm lint` passes
* [ ] `pnpm run build` passes

## Final Report

At the end, report:

1. What the existing infrastructure contained.
2. What conflicted with the new Add Member protocol.
3. What was removed.
4. What was implemented.
5. The final User → Membership → Person → Teacher → Timetable → Attendance flow.
6. Files/routes/models changed.
7. Any schema changes and why.
8. What remains for the next phase: teacher daily sign-in + QR class validation + student roll call.
9. Lint/build results.

```

The important correction is **“Add Member” is now account provisioning**, not an invitation system.

That gives you a much cleaner product model: an admin can literally say **“Add Jane as a Teacher”**, and Roll SYNC creates the complete identity/access relationship needed for Jane to eventually walk into her timetable, sign into her class, and take attendance.
```
