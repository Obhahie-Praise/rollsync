# Roll SYNC — Make Onboarding Functional

## Objective

The onboarding UI is already designed and implemented.

Your job is to make the existing onboarding fully functional and production-ready **without redesigning or materially changing the existing UI**.

Read the existing project structure, Prisma schema, Better Auth configuration, onboarding components, and relevant documentation before making changes.

Do not guess existing architecture. Reuse what already exists.

---

## 1. UI IS LOCKED

Do NOT redesign the onboarding.

Do NOT:
- replace existing components
- change the visual hierarchy
- change layouts unnecessarily
- introduce a new design system
- add unnecessary cards, sections, icons, illustrations, or text
- change colors, typography, spacing, or page structure unless required for functionality
- rewrite working UI components unnecessarily

Only make UI changes that are required to support the functionality described below.

Preserve the existing design exactly as much as reasonably possible.

---

## 2. MICRO-INTERACTIONS

Add subtle, premium-feeling interactions only where appropriate.

Examples:
- button hover/press states
- loading states
- disabled states
- selection transitions
- step transitions
- validation feedback
- subtle success states
- small enter/exit animations

Animations must:
- be fast
- feel natural
- not distract from onboarding
- respect `prefers-reduced-motion`
- use the existing animation library if one already exists

Do not turn the onboarding into an animation showcase.

---

## 3. ONBOARDING FUNCTIONALITY

Connect the existing onboarding UI to real application state.

The onboarding must:

1. collect the information already requested by the existing UI
2. validate it
3. preserve it
4. submit it to the backend
5. create the appropriate organization/entity
6. generate its slug
7. associate it with the authenticated user
8. mark onboarding as completed
9. redirect the user to the correct dashboard

Use the existing Better Auth authentication system.

Unauthenticated users must not be able to complete organization onboarding.

Do not create a second authentication system.

---

## 4. DYNAMIC ENTITY TYPE

The onboarding supports:

- School
- Organization
- Event

The underlying implementation should remain generic.

Use the existing entity/data model where possible.

Do NOT create separate duplicated onboarding implementations for schools, organizations, and events.

The selected entity type should determine contextual terminology throughout the remaining onboarding.

### School

Use terminology such as:

- School name
- Students
- Teachers
- Classes
- Departments

### Organization

Use:

- Organization name
- People

Do NOT show:
- Teachers
- Students

For example:

If the user selects:

`Organization`

then later onboarding screens should dynamically use:

> Organization name

instead of:

> School name

And:

> Number of people

instead of:

> Number of students

Do not blindly replace words globally.

Apply the correct terminology based on the context of each onboarding step.

### Event

Use appropriate event terminology.

For example:

- Event name
- Attendees / People
- Event-specific configuration

The experience should still feel like onboarding the selected entity rather than onboarding a school.

---

## 5. FORM VALIDATION

Implement proper validation based on:

- the existing onboarding UI
- the existing product documentation
- the Prisma schema
- existing application constraints

Validation should exist on both:

### Client

Provide immediate useful feedback.

Examples:
- required fields
- invalid values
- invalid slug
- invalid numbers
- empty names
- invalid selections

### Server

Never trust client-side validation.

The server must validate submitted data again before creating or modifying database records.

Do not duplicate large validation systems.

Prefer a small reusable validation schema where appropriate.

---

## 6. PERSISTENCE

Onboarding must survive page reloads.

If a user completes several onboarding steps and refreshes the browser:

> their progress and entered data must not disappear.

Do NOT rely only on React state/context.

Persist onboarding progress appropriately.

The implementation should support:

- current onboarding step
- previously entered values
- selected entity type
- incomplete onboarding
- completed onboarding

When the user returns to onboarding, restore their saved progress.

Do not create unnecessary persistence infrastructure.

Use the existing database architecture where appropriate.

---

## 7. ONBOARDING COMPLETION

When the user submits the final onboarding step:

Perform the required database operations safely and atomically.

The completion process should:

1. verify authentication
2. validate the submitted data
3. determine the selected entity type
4. validate/generate the slug
5. create the entity
6. create the required initial organization/configuration records
7. associate the authenticated user appropriately
8. mark onboarding as complete
9. return the resulting slug/entity information

Do not require optional information that the UI does not require.

In particular:

### Logo

Logo is optional.

Do not make onboarding fail because a logo is missing.

Do not query or select an `organization.logoUrl` field merely because it exists in some older schema/version.

If the current database does not contain that field, do not introduce an unnecessary migration just to support onboarding.

---

## 8. DATA MODEL

Inspect the existing Prisma schema and documentation first.

Add only the tables/fields genuinely required to support onboarding and the organization foundation.

Do NOT create speculative tables.

The minimum useful foundation should support the concepts already present in the product:

- entity/organization
- authenticated membership/ownership
- onboarding state/progress
- organizational units/classes/groups where required
- initial attendance configuration where required

Reuse existing tables if they already represent these concepts.

Avoid:
- duplicate organization tables
- duplicate user tables
- unnecessary configuration tables
- premature attendance tables
- speculative analytics tables

Keep the schema simple and extensible.

---

## 9. ORGANIZATION STRUCTURE

The onboarding may collect basic structural information.

Persist only what is actually collected and needed.

For example, if the UI allows the user to add classes, departments, groups, or units, persist those using the existing organization-unit model or the smallest appropriate model.

Do not force users to configure their entire organization during onboarding.

Onboarding establishes the foundation.

Detailed attendance management happens later in the dashboard.

---

## 10. DASHBOARD ROUTING

After onboarding is successfully completed, redirect the user using the generated generic slug.

The route represents the selected entity:

`/[slug]`

Examples:

```text
/acme-school
/acme-company
/summer-event

Do NOT use:

/school_slug
/organization_slug
/event_slug

The route parameter is always:

slug
11. CREATE DASHBOARD PLACEHOLDER ROUTES

Create minimal functional placeholder pages for:

/[slug]
/[slug]/overview
/[slug]/attendance/session
/[slug]/attendance/record
/[slug]/people
/[slug]/organization
/[slug]/reports
/[slug]/developers
/[slug]/settings
/[slug]/help

These are infrastructure placeholders only.

Do NOT design the actual dashboard yet.

Each page should simply establish that:

the slug resolves correctly
the entity exists
the authenticated user has access
the page renders its contextual title

Example:

Acme School
Overview

or:

Acme Organization
People

Keep these pages extremely minimal.

12. DASHBOARD ACCESS CONTROL

Protect all /[slug]/* routes.

A user must not be able to access another user's organization simply by changing the URL.

For every slug:

resolve the entity
verify the authenticated session
verify the user's membership/ownership/access
render the page only if authorized

Otherwise:

redirect unauthenticated users to authentication
return/redirect appropriately for unauthorized users
handle missing slugs cleanly

Do not rely solely on hiding links in the UI.

Authorization must happen server-side.

13. ONBOARDING REDIRECT LOGIC

Implement sensible onboarding routing.

If an authenticated user:

Has not completed onboarding

Send them to:

/onboarding
Has completed onboarding

Do not unnecessarily send them back through onboarding.

Send them to their appropriate:

/[slug]/overview
Has incomplete onboarding

Restore their saved onboarding progress.

Do not force them to restart.

Avoid redirect loops.

14. API / SERVER IMPLEMENTATION

Use the existing Next.js backend architecture.

Do NOT introduce:

NestJS
a separate API server
Express
WebSockets
Socket.IO
RealtimeService
another backend framework

Use appropriate Next.js server-side patterns already used by the project.

Keep the implementation small.

15. PRISMA

This project uses:

Prisma 7

Do NOT upgrade to Prisma 8.

Do NOT introduce Prisma Next / Prisma AI tooling.

Do NOT replace the existing Prisma architecture.

Use the existing:

prisma/schema.prisma
src/lib/prisma.ts

and existing generated client setup.

Use normal Prisma 7 workflows.

16. BETTER AUTH

Use the existing Better Auth implementation.

Do not replace or duplicate authentication.

The current authentication flow already supports the onboarding entry point.

Use the authenticated user/session to associate onboarding data with the correct user.

Do not trust a user ID sent from the client.

The authenticated session is the source of truth.

17. ERROR HANDLING

Handle expected failures cleanly.

Examples:

unauthenticated request
expired session
invalid form data
duplicate slug
missing entity
unauthorized entity access
database failure
incomplete onboarding state

Show useful user-facing feedback where appropriate.

Do not expose raw database errors to the user.

Do not silently swallow important errors.

18. LOADING / SUBMISSION STATES

Interactive onboarding actions must have proper states.

Buttons should:

show loading while submitting
prevent accidental duplicate submissions
recover correctly from errors
remain accessible

Do not allow multiple simultaneous onboarding completion requests.

19. CLEAN CODE REQUIREMENTS

Keep the implementation minimal.

Prefer:

existing components
existing utilities
small reusable functions
server-side validation
simple data flow
clear naming
strict TypeScript

Avoid:

unnecessary abstractions
giant components
unnecessary hooks
duplicated validation
duplicated entity logic
speculative architecture
dead code
excessive comments
any
unnecessary dependencies

Every component and function should have a clear contextual purpose.

20. DO NOT TOUCH UNRELATED FEATURES

Do not modify unrelated parts of Roll SYNC.

Do not redesign:

landing page
authentication UI
dashboard UI beyond required placeholders
pricing
attendance UI
reports UI
settings UI

This task is specifically:

Make the existing onboarding functional and establish the minimum infrastructure required after onboarding.

21. PRODUCTION SAFETY CHECK

After implementation, perform a production-oriented verification.

Run:

pnpm install
pnpm lint
pnpm run build

Also verify:

Prisma client generates successfully
Prisma schema validates
no TypeScript errors
no lint errors
no broken imports
no missing environment variables introduced
no accidental Prisma 8 upgrade
no authentication route regressions
no onboarding redirect loops
no unauthorized slug access
no duplicate onboarding submissions
onboarding survives a browser refresh
successful completion redirects to the correct /<slug>/overview

If the project has existing tests, run the relevant tests as well.

Do not stop after the implementation merely compiles.

Fix issues discovered during the checks.

FINAL REQUIREMENT

Before finishing:

Inspect what already exists.
Implement only what is necessary.
Preserve the existing onboarding UI.
Keep the code minimal.
Do not introduce new architecture unnecessarily.
Verify the complete onboarding flow end-to-end.
Run the production safety checks.
Report exactly what was changed and any remaining issues.

Do not upgrade dependency versions unless absolutely required to fix an existing compatibility problem.


### One thing I'd specifically emphasize to the agent

The **data model should not be designed from the onboarding UI alone**. Tell it to inspect your existing Prisma schema first. You already have the broader Roll SYNC concepts, so the agent should extend those rather than creating things like `School`, `Organization`, and `Event` as three completely separate systems.

The key relationship should remain roughly:

```text
User
  ↓
Membership / Ownership
  ↓
Entity
  ├── type: SCHOOL | ORGANIZATION | EVENT
  ├── name
  ├── slug
  └── units/configuration

Then the onboarding is just the setup layer on top of that.

That will save you a lot of cleanup when we start building the actual attendance infrastructure.