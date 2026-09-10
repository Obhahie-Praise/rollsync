# Implement the People System

Implement the People section at:

/[slug]/people

The goal is to build the organization's **Person/Attendance Identity layer** correctly so that it integrates cleanly with the attendance system that will be implemented next.

Do NOT redesign the existing workspace shell, sidebar, header, onboarding, or settings UI.

---

## 1. Inspect Before Changing Anything

Before writing code:

- Inspect the existing Prisma 7 schema.
- Inspect Better Auth configuration and existing User/Membership models.
- Inspect the existing organization/slug resolution.
- Inspect the existing authorization/permission system.
- Inspect existing attendance-related models, if any.
- Inspect existing workspace layout/components.
- Inspect existing UI conventions and components.
- Inspect existing audit/logging infrastructure if available.

Do not invent a second authorization system, organization system, user system, or attendance identity system.

Use the architecture that already exists.

---

# 2. Core Concept

The most important rule:

> A Person is NOT automatically a Roll SYNC User.

A Person represents an identity that belongs to an organization and can participate in attendance.

A User represents someone who has a Roll SYNC login account.

A Membership represents a User's access to an organization.

Conceptually:

Person
→ organization identity
→ can have attendance records
→ does NOT require a login

User
→ Roll SYNC authentication identity
→ can log in

Membership
→ User + Organization
→ controls workspace access

Example:

Person:
John Doe
Type: Student
Attendance identity: Yes
Roll SYNC access: No

Later:

John Doe
→ invited to Roll SYNC
→ creates/signs into account
→ Person is linked to User
→ Membership is created
→ authorization determines what John can access

Adding a Person must NEVER automatically create a Better Auth account or grant workspace access.

---

# 3. Person Categories

Keep categories intentionally simple.

Use the existing organization terminology where appropriate, but the conceptual categories are:

- Student
- Teacher
- Staff
- Administrator
- Director

Do NOT create a large taxonomy.

Do NOT make Person category equal to authorization role.

For example:

Student + no account
Teacher + Member
Administrator + Admin
Director + Admin/Owner

These are separate concepts.

---

# 4. Person Lifecycle

Support the following lifecycle:

## Add Person

Creates an organization Person identity.

The person can immediately participate in attendance.

They do not need a Roll SYNC account.

## Invite to Roll SYNC

Explicitly connects the Person to Roll SYNC authentication.

The invitation/account flow should:

- use the existing Better Auth setup
- create/link the User appropriately
- create/use the appropriate Membership
- respect the existing authorization architecture
- never duplicate users
- never create multiple memberships accidentally

If the existing architecture already has an invitation mechanism, use it.

Do NOT build a parallel invitation system.

## Deactivate Person

Use Active/Inactive rather than deleting the Person for normal departures.

Deactivation must:

- preserve historical attendance
- prevent the person from being treated as an active attendance target where appropriate
- preserve their identity/history
- not delete a Better Auth User
- not globally disable the User account

Removing organization access and deleting a global User are separate concerns.

---

# 5. Attendance Integration Is Critical

Build People so future attendance methods can all resolve to the SAME Person identity.

The attendance system coming next will support methods such as:

- QR arrival
- ID scanning
- roll call/manual attendance
- other attendance methods later

Do NOT build separate identities for each method.

The canonical flow should conceptually be:

Attendance Method
        ↓
Resolve identity
        ↓
Person
        ↓
Attendance Record

For example:

QR code
→ resolves Person

ID scan
→ resolves Person

Teacher selects student during roll call
→ selects Person

All of these must ultimately reference the same Person.

Do NOT make User the attendance subject.

The authenticated User is normally the person OPERATING attendance.

The Person is the person BEING recorded as present/absent.

Example:

Teacher User
→ authorized to take attendance
→ records attendance for
→ Student Person

This distinction must remain intact throughout the implementation.

---

# 6. Design the Person Identity for Future Attendance

Inspect the existing schema and use the appropriate existing fields/models.

If the architecture already contains identifiers for attendance, use them.

If the existing schema needs a minimal addition to support attendance identity, make only the necessary change.

The Person model should be capable of being resolved by future methods such as:

- internal Person ID
- organization-specific identifier
- QR identity
- ID/card identifier
- other attendance identifiers

Do NOT prematurely build QR generation, ID scanning, or attendance sessions in this task.

Just make sure the Person identity is structured so those systems can reference it later.

Avoid storing duplicated attendance identity data across multiple systems.

---

# 7. People Page

Build:

/[slug]/people

Using the existing workspace shell.

The page should include:

### Header

- People
- total active people count
- short contextual description
- Add Person button

### Controls

- Search
- Type filter
- Status filter
- Roll SYNC access filter
- Import button placeholder if import infrastructure does not exist yet

Search should be capable of finding people by relevant existing fields such as:

- name
- email
- organization ID
- phone
- other existing identity fields

Do not search fields that do not exist.

---

# 8. People Table

Use a clean, dense but readable table.

Suggested columns:

Name
Type
Access
Status
Attendance

Example:

John Doe
Student
No access
Active
94%

Jane Smith
Teacher
Member
Active
—

The exact columns should adapt to the existing schema.

Attendance should represent attendance information where the existing data supports it.

Do not fabricate statistics.

If attendance aggregation does not exist yet, use an appropriate placeholder such as `—` rather than inventing data.

---

# 9. Person Detail

If the existing architecture supports nested routes, create:

/[slug]/people/[personId]

Otherwise structure the code so this can be added cleanly later.

The detail view should eventually support:

- identity information
- organization information
- status
- attendance summary
- Roll SYNC access
- linked account information
- Invite to Roll SYNC

Do not overbuild the detail page if the required backend data does not exist yet.

---

# 10. Add Person

Create a clean Add Person flow using the existing UI patterns.

Fields should only include information that already makes sense for the current schema.

At minimum, conceptually:

- Name
- Person type
- relevant contact/identity information
- status if appropriate

Do NOT require:

- password
- Better Auth account
- membership
- Roll SYNC login

Creating a Person should be independent from creating a User.

After creation:

Person exists
→ organization identity created
→ available to future attendance methods

---

# 11. Roll SYNC Access

Clearly distinguish:

### No access

Person exists but has no Roll SYNC account/membership.

### Invited

Invitation/access process has been initiated.

### Member/Admin/etc.

Person is linked to a Roll SYNC User with the appropriate Membership role.

Use the existing authorization model.

Do not create new roles just for People.

---

# 12. Authorization

People must respect the existing authorization architecture.

Every server-side operation must verify:

1. authenticated User
2. current organization resolved from slug
3. User belongs to that organization
4. User has the required existing permission
5. requested Person belongs to that organization
6. input is valid
7. mutation is authorized

Never trust the client-provided slug or person ID by itself.

UI visibility is not security.

Direct requests to unauthorized routes/actions must fail server-side.

Use the existing permission names/role system instead of inventing replacements.

---

# 13. Important Authorization Distinction

Do NOT assume:

Person category = access role

These are different:

Person:
Student / Teacher / Staff / Administrator / Director

Access:
Owner / Admin / Member / etc.

A Student Person may have no Roll SYNC access.

A Teacher Person may have Member access.

A Director Person may have Admin or Owner access.

This separation is important because attendance identity and workspace authorization are fundamentally different.

---

# 14. Deactivation

Do not hard-delete people during normal removal/departure.

Inactive people should remain available for historical attendance records.

Future attendance methods should generally only allow active people to be selected/resolved as current attendance targets.

Historical attendance must remain intact.

If deleting a Person is already supported by the architecture, treat it as a deliberate destructive operation and protect it accordingly.

Do not cascade-delete historical attendance accidentally.

---

# 15. Attendance Architecture Compatibility

Do not implement the attendance system itself yet.

However, ensure the People implementation makes the following future architecture possible:

### QR

QR identity
→ Person

### ID Scan

ID identifier
→ Person

### Roll Call

Teacher/operator
→ selects Person
→ Attendance Record

### Future methods

Method-specific identifier
→ Person
→ Attendance Record

The Person should therefore remain the stable canonical attendance identity.

Do NOT make QR, ID, User, or Membership the canonical attendance identity.

---

# 16. Auditability

If the existing architecture already provides audit logging, use it for important mutations such as:

- person creation
- person update
- person deactivation
- invitation/access changes

Do not create a duplicate audit system.

---

# 17. UI / UX

Keep the existing Roll SYNC visual language.

The People page should feel:

- modern
- clean
- fast
- spacious
- practical
- professional

Use subtle animations only where they improve interaction.

Examples:

- table row hover
- filter transitions
- dropdown animation
- modal/drawer entrance
- button feedback
- loading states

Respect reduced-motion preferences.

Do not introduce unnecessary gradients, cards, dashboards, or decorative UI.

Do not redesign the application shell.

---

# 18. Data Integrity

All Person operations must be scoped to the current organization.

Prevent:

- duplicate organization identities where uniqueness is required
- linking a Person from another organization
- linking the wrong User
- duplicate memberships
- accidental global User deletion
- attendance identity collisions where the existing schema requires uniqueness

Use transactions for multi-step operations where necessary.

Validate on both client and server where appropriate.

---

# 19. Do Not Overbuild

Do NOT implement:

- QR generation
- QR scanning
- ID scanner
- attendance sessions
- attendance recording
- realtime
- WebSockets
- Socket.IO
- new backend architecture
- NestJS
- new authentication system
- new authorization system
- new payment system
- bulk import implementation unless already supported
- unnecessary dependencies

This task is the foundation for those features, not the implementation of those features.

---

# 20. Preserve Existing Architecture

Use:

- existing Next.js App Router
- existing Prisma 7 setup
- existing Better Auth setup
- existing organization/membership architecture
- existing authorization system
- existing UI components
- existing styling system
- existing audit infrastructure
- existing attendance schema where available

Do not upgrade packages.

Do not change dependency versions.

Do not introduce duplicate infrastructure.

---

# 21. Production Checks

Before finishing:

```bash
pnpm lint
pnpm run build
````

Fix all errors caused by your implementation.

Do not silence lint errors with `any`, unnecessary eslint disables, or unsafe casts.

Keep TypeScript strict.

---

# Final Success Criteria

The implementation is complete when:

* `/[slug]/people` is functional
* People are organization-scoped
* Person identity is independent from Better Auth User identity
* adding a Person does not grant Roll SYNC access
* existing authorization controls People operations
* People can be active/inactive
* historical attendance can remain attached to a Person
* future QR/ID/roll-call methods can all resolve to the same Person
* attendance subjects are Persons, not Users
* authenticated Users remain operators/authorized actors
* Roll SYNC access is explicitly granted through the existing membership/auth system
* no duplicate auth, membership, or attendance identity systems were created
* existing UI architecture remains intact
* `pnpm lint` passes
* `pnpm run build` passes

Keep the implementation minimal, production-ready, and aligned with the existing architecture.

```
```
