# Final Integration Pass: Authentication, Organization Access, Responsiveness & Codebase Cleanup

## Goal

Complete and sand down the Roll SYNC application so the existing pieces work together as one coherent product.

This is an integration, responsiveness, optimization, and cleanup pass.

Do NOT blindly rewrite working features.

The application already contains:

- onboarding
- Better Auth
- organizations
- memberships
- People
- Classes
- Class Memberships
- Subjects
- Teacher Assignments
- Rooms
- Timetable
- Attendance Sessions
- Attendance Records
- Reports
- Developers
- Organization management
- Settings
- workspace shell
- UploadThing
- Prisma
- existing permissions/authorization
- existing BullMQ infrastructure where applicable

Inspect everything first.

Reuse what already exists.

---

# PHASE 1 — AUTHENTICATION & ORGANIZATION ACCESS

## 1. Understand the Existing Auth Model

Inspect:

- Better Auth configuration
- User model
- Session model
- Organization model
- Membership model
- Person model
- existing authorization/permission helpers
- login/sign-up pages
- organization routing
- onboarding completion logic

Do not create another authentication system.

Better Auth remains the authentication source of truth.

---

# 2. Login Philosophy

Users log into **Roll SYNC**, not directly into an organization.

The authentication flow should be:

```text
User
 ↓
Roll SYNC Login
 ↓
Better Auth Session
 ↓
User's Organization Memberships
 ↓
Organization Selection / Routing
 ↓
Organization Workspace
````

The user should never need to enter an organization name simply to authenticate.

Do not add an organization-name field to the login form.

---

# 3. User With One Organization

If the authenticated user belongs to exactly one organization:

After successful login, route them directly to:

`/[slug]/overview`

Use their actual organization slug.

Do not make them manually select the organization every time.

---

# 4. User With Multiple Organizations

If the authenticated user belongs to multiple organizations:

Show a clean organization selection screen.

Example:

```text
Choose an organization

Demo School
School

Acme Events
Event

Creative Organization
Organization
```

Show only organizations the authenticated user legitimately belongs to.

Do not expose organizations merely because the user knows their slug.

Allow the user to select an organization and continue to:

`/[slug]/overview`

Use the existing organization-switcher implementation where appropriate.

Do not create duplicate organization-selection logic if the existing workspace already has it.

---

# 5. User With No Organizations

If authentication succeeds but the user has no organization membership:

Show a useful state:

```text
You're not part of an organization yet.

Create an organization or wait for an invitation.

[ Create organization ]
```

Use the existing onboarding/new-organization flow.

Do not create a fake organization automatically.

---

# 6. Existing Teacher Account

A teacher must use the same normal Roll SYNC authentication system.

There is no:

* Teacher Login
* Teacher Password System
* separate teacher auth route
* separate teacher session

The teacher is identified through:

```text
Better Auth User
 ↓
Organization Membership
 ↓
Linked Person
 ↓
Person type = Teacher
 ↓
Existing permissions
```

Reuse the existing Teacher Person / User / Membership infrastructure.

---

# 7. Teacher Organization Experience

After login and organization selection:

```text
User
 ↓
Organization
 ↓
Teacher Person
 ↓
Teacher permissions
 ↓
/[slug]/overview
```

The teacher's Overview should naturally show:

* today's classes
* next class
* active session
* upcoming classes
* attendance actions

Do not create a separate teacher dashboard application.

Use the existing role-aware Overview.

---

# 8. Teacher Attendance Flow

Ensure the complete flow works with the existing infrastructure:

```text
Teacher Login
 ↓
Organization
 ↓
Teacher Identity
 ↓
Today's Timetable
 ↓
Sign in
 ↓
QR Scanner
 ↓
Class ID
 ↓
Server Validation
 ↓
Attendance Session
 ↓
Take Attendance
 ↓
Students in Assigned Class
 ↓
Present / Absent
 ↓
Attendance Records
```

The QR code contains only the Class ID.

The server must determine:

* authenticated user
* organization
* teacher Person
* class
* teacher assignment
* timetable entry
* subject
* schedule
* attendance/session context

Never trust client-provided teacher, subject, organization, or attendance authorization information.

Reuse the attendance implementation already created.

Do not rebuild it.

---

# 9. Organization Isolation

This is critical.

A user may only access an organization when they have valid membership/access.

Every `[slug]` route must resolve the organization server-side and verify authorization.

Test cases:

```text
User belongs to Demo School
→ /demo-school works

User does not belong to Other School
→ /other-school is denied
```

Changing the URL slug must never grant access.

---

# PHASE 2 — RESPONSIVE DESIGN AUDIT

## 10. Do Not Redesign the Existing UI

Before modifying responsive behavior, inspect the entire existing UI.

Understand:

* spacing
* typography
* sidebar
* header
* cards
* tables
* forms
* buttons
* navigation
* modals
* settings layout
* dashboard layout
* attendance UI
* reports
* organization page
* developers page
* onboarding

The current desktop design is the visual source of truth.

The goal is:

> Make the existing design responsive, not redesign it.

Do not replace the visual language.

---

# 11. Audit Every Main Route

Inspect at minimum:

```text
/
 /[slug]
 /[slug]/overview
 /[slug]/attendance/session
 /[slug]/attendance/record
 /[slug]/people
 /[slug]/organization
 /[slug]/reports
 /[slug]/developers
 /[slug]/timetable
 /[slug]/settings
 /[slug]/settings/profile
 /[slug]/settings/organization
 /[slug]/settings/attendance
 /[slug]/settings/notifications
 /[slug]/settings/security
 /[slug]/settings/developers
 /[slug]/settings/billing
 /[slug]/settings/help
```

Also inspect:

* login
* signup
* organization selection
* onboarding
* new organization
* dialogs/modals
* forms
* tables
* dropdowns

---

# 12. Mobile Strategy

Do not simply make everything smaller.

At mobile widths:

* navigation should remain usable
* sidebar should become an appropriate mobile drawer/overlay
* header should remain functional
* content should have sensible horizontal padding
* tables should transform appropriately
* large data sets should not create ugly horizontal overflow
* cards should stack intelligently
* forms should become single-column where appropriate
* dialogs should fit the viewport
* buttons should remain comfortably tappable
* important actions should remain easy to reach

Do not destroy desktop layouts while fixing mobile.

---

# 13. Tables

Audit every table.

Where a table cannot reasonably fit on mobile:

Prefer an appropriate transformation such as:

* horizontally scrollable table when tabular comparison is important
* stacked responsive rows
* priority columns + expandable details
* mobile card/list representation

Choose based on the actual content.

Do NOT simply set:

```css
overflow-x: auto
```

everywhere without considering usability.

---

# 14. Sidebar / Header

Ensure:

### Desktop

Existing sidebar/header behavior remains intact.

### Mobile

The sidebar becomes an appropriate drawer/overlay.

Requirements:

* smooth open/close
* backdrop
* Escape to close
* active route remains obvious
* organization switcher remains usable
* logout remains accessible
* no viewport overflow
* body scrolling is handled correctly

The header should remain usable on narrow screens.

The search UI should also work on mobile.

---

# 15. Attendance Mobile Experience

Pay special attention to attendance because teachers may actually use this on a phone.

The teacher should be able to:

```text
Open Roll SYNC
 ↓
See next class
 ↓
Tap Sign in
 ↓
Open QR scanner
 ↓
Scan class
 ↓
Confirm session
 ↓
Take roll call
```

without awkward horizontal layouts or tiny controls.

The attendance record interface must remain fast and usable on mobile.

---

# 16. Forms

Audit:

* login
* signup
* onboarding
* organization creation
* settings
* API key creation
* person creation/editing
* timetable forms
* attendance controls

Ensure:

* inputs fit mobile width
* labels remain visible
* errors don't break layout
* buttons don't overflow
* dialogs fit mobile viewport
* keyboard does not make critical actions inaccessible

---

# 17. Responsive Breakpoints

Use the project's existing Tailwind conventions.

Do not introduce arbitrary breakpoint systems.

Use responsive behavior intentionally based on content rather than blindly adding classes to every element.

---

# PHASE 3 — FULL APPLICATION CONSISTENCY AUDIT

## 18. Trace the Entire Product Flow

Walk through the application as a real user.

### New organization

```text
Sign up
 ↓
Onboarding
 ↓
Organization created
 ↓
Workspace
```

### Admin

```text
Login
 ↓
Organization selection
 ↓
Overview
 ↓
People
 ↓
Classes
 ↓
Timetable
 ↓
Attendance
 ↓
Reports
 ↓
Organization
 ↓
Developers
 ↓
Settings
```

### Teacher

```text
Login
 ↓
Organization
 ↓
Overview
 ↓
Today's classes
 ↓
Sign in
 ↓
Scan Class QR
 ↓
Attendance Session
 ↓
Roll Call
 ↓
Attendance Records
```

Find and fix broken transitions, missing links, incorrect redirects, inconsistent states, and dead-end pages.

---

# 19. Navigation Audit

Check every navigation item.

Ensure:

* correct destination
* active state
* nested route behavior
* organization slug preservation
* unauthorized routes are protected
* no dead links
* no duplicated navigation entries

Do not invent new routes unless required.

---

# 20. Loading / Error / Empty States

Audit the application for missing states.

Every important data-driven page should have appropriate:

* loading state
* empty state
* error state
* success feedback
* disabled state

Do not use fake data to hide missing states.

---

# PHASE 4 — CODEBASE CLEANUP

## 21. Remove Bloat

Perform a careful codebase audit.

Identify and remove genuinely unused:

* components
* hooks
* utilities
* types
* imports
* constants
* routes
* duplicate helpers
* dead code
* abandoned experiments
* commented-out implementations
* obsolete architecture
* unnecessary dependencies

Do NOT delete code merely because it isn't currently referenced if it is clearly intended infrastructure.

Verify usage before deleting.

---

# 22. Remove Legacy Architecture

Look specifically for remnants of abandoned approaches.

The final architecture should NOT contain unnecessary remnants of:

* NestJS
* separate API applications
* Socket.IO
* WebSockets
* realtime infrastructure
* duplicate queues
* duplicate auth
* Prisma 8-specific tooling
* Prisma Next tooling
* abandoned API clients
* old onboarding implementations

Only remove something when it is genuinely unused and no longer part of the intended architecture.

---

# 23. Duplicate Logic

Find duplicated implementations of:

* organization lookup
* authorization
* user/session resolution
* membership checking
* Prisma access
* slug resolution
* permissions
* API responses
* common UI behavior

Where appropriate, consolidate them into existing shared utilities.

Do not create unnecessary abstractions just to make the code "clean."

Prefer simple, readable code.

---

# 24. TypeScript Quality

The codebase should remain strict and understandable.

Do not introduce:

```ts
any
```

Do not use:

```ts
@ts-ignore
```

Do not hide errors with unsafe casts.

Prefer:

* explicit interfaces/types
* narrow types
* proper null handling
* reusable domain types where genuinely useful

Do not over-engineer the type system.

---

# 25. React / Next.js Quality

Audit for:

* unnecessary client components
* unnecessary `useEffect`
* unnecessary state
* duplicated fetching
* avoidable rerenders
* server data that could remain server-side
* incorrect server/client boundaries
* unnecessary API calls
* duplicated requests
* missing keys
* unstable list rendering
* oversized components where splitting genuinely improves maintainability

Do not convert everything to Server Components blindly.

Do not convert everything to Client Components blindly.

Use the simplest correct architecture.

---

# 26. Database / Prisma Audit

Inspect database usage for:

* N+1 queries
* repeated queries
* unnecessary includes
* loading huge datasets
* queries missing organization boundaries
* missing indexes where clearly necessary
* fetching fields that aren't used

Do not rewrite the schema unnecessarily.

The existing Prisma architecture is the source of truth.

---

# 27. Dependency Audit

Inspect `package.json`.

Remove dependencies that are genuinely unused.

Do not replace stable dependencies just for the sake of changing them.

The intended stack remains:

* Next.js
* React
* TypeScript
* Prisma 7
* PostgreSQL
* Better Auth
* UploadThing
* BullMQ where needed
* existing UI dependencies

Do not add libraries for problems the existing stack can already solve.

---

# PHASE 5 — SECURITY AUDIT

## 28. Organization Boundaries

Verify every organization-scoped operation has server-side organization authorization.

Pay special attention to:

* People
* Classes
* Timetable
* Attendance
* Reports
* Developers
* Settings
* API keys

---

# 29. API Key Security

Verify:

* secrets are only shown once
* secrets are not logged
* revoked keys cannot authenticate
* normal list queries never expose plaintext secrets
* organization isolation works

Reuse the existing implementation.

---

# 30. Attendance Security

Verify:

* teacher can only sign into authorized classes
* class QR only provides class identity
* timetable is checked server-side
* teacher assignment is checked server-side
* organization is checked server-side
* attendance records belong to the correct session/class/person
* users cannot modify another organization's attendance by manipulating IDs

---

# PHASE 6 — FINAL PRODUCT POLISH

## 31. Visual Consistency

Compare the major pages against each other.

Ensure consistency in:

* typography
* spacing
* border radius
* buttons
* input styles
* colors
* icons
* empty states
* loading states
* headings
* page padding
* section spacing

Do not redesign the application.

Make the existing design feel intentional and unified.

---

# 32. Micro-Interactions

Keep existing animations and add only where useful.

Use subtle feedback for:

* buttons
* navigation
* dropdowns
* sidebar
* dialogs
* status changes
* loading

Respect:

`prefers-reduced-motion`

Avoid animation bloat.

---

# 33. Mobile Final Pass

Test the actual application at representative widths:

* 320px
* 375px
* 390px
* 430px
* tablet
* desktop

Look specifically for:

* horizontal overflow
* clipped text
* inaccessible buttons
* broken dialogs
* oversized headings
* tables breaking layout
* sidebar issues
* header collisions
* forms overflowing
* poor spacing
* unusable attendance controls

Fix the underlying layout rather than adding one-off hacks.

---

# PHASE 7 — PRODUCTION VALIDATION

Run:

```bash
pnpm install
pnpm lint
pnpm run build
```

Also verify the production build starts successfully if practical.

Fix all errors.

Do not suppress errors.

---

# Important Rules

## DO

* inspect before modifying
* reuse existing infrastructure
* preserve working functionality
* improve responsiveness
* simplify where genuinely beneficial
* remove genuinely dead code
* fix loose ends
* enforce server-side authorization
* keep organization boundaries strict
* keep the codebase understandable

## DO NOT

* redesign working pages
* create duplicate authentication
* create separate teacher login
* create another organization system
* add realtime/WebSockets
* add another queue
* add NestJS
* replace Prisma 7
* add unnecessary dependencies
* rewrite working infrastructure for style reasons
* fabricate data
* use `any`
* use `@ts-ignore`
* hide errors with eslint disables

---

# Definition of Done

The application should feel like one finished product.

### Authentication

* normal Roll SYNC login works
* users see organizations they actually belong to
* one organization routes directly to its workspace
* multiple organizations provide clean organization selection
* users with no organizations receive a useful state
* organization access is server-authorized

### Teacher

* teacher is resolved through existing User → Membership → Person infrastructure
* teacher sees their timetable
* teacher sees today's classes
* teacher can sign into a class
* QR scanner receives only Class ID
* server resolves timetable/subject context
* teacher can start the appropriate attendance session
* teacher can take roll call
* attendance records persist correctly

### Admin

* admin sees the organization-level experience appropriate to their permissions
* organization-wide attendance/reporting remains protected
* administrative controls remain protected

### Other members

* access is permission-aware
* members do not automatically receive teacher/admin capabilities

### Responsive UI

* all major pages work on mobile
* existing desktop design remains intact
* sidebar/header work correctly on mobile
* tables remain usable
* forms remain usable
* attendance is practical on a phone
* no major horizontal overflow exists
* dialogs/modals work on narrow screens

### Cleanup

* dead code removed
* obsolete architecture removed
* duplicate logic reduced
* unused dependencies removed where safe
* unnecessary client-side code reduced
* unnecessary queries reduced
* TypeScript remains strict
* no `any`
* no `@ts-ignore`

### Quality

* no fake data
* no broken navigation
* no obvious dead ends
* no unauthorized organization access
* loading/error/empty states are handled
* visual language is consistent
* existing functionality remains intact

### Validation

```bash
pnpm install
pnpm lint
pnpm run build
```

All must pass.

Before finishing, provide:

1. Authentication flow implemented
2. How organization selection works
3. How teacher identity connects to attendance
4. Responsive improvements made
5. Major bloat/dead code removed
6. Important bugs/loose ends fixed
7. Any issues intentionally left for a later phase
8. Final lint/build status

```
```
