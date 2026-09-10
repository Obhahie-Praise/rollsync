# Roll SYNC — Make the /[slug] Workspace Functional

## Objective

The existing `/[slug]` workspace UI has already been designed and implemented.

The workspace currently contains the header and sidebar UI.

Make this existing workspace functional, responsive, accessible, and smoothly animated.

IMPORTANT:

The existing UI is the source of truth.

Do NOT redesign it.

Do NOT replace the visual style.

Do NOT introduce a different dashboard design.

Only make the changes explicitly described below and only add UI where functionality requires it.

Keep the implementation minimal and production-ready.

---

# 1. WORKSPACE STRUCTURE

The `/[slug]` route is the authenticated workspace layout.

The dynamic `slug` represents the current entity:

- school
- organization
- event

The workspace should resolve the entity from the slug and use its real data.

Do not hardcode:

- Roll SYNC user
- John Doe
- organization names
- avatars
- organization icons
- organization lists

Use the authenticated user's data and the entity represented by the current slug.

---

# 2. HEADER

The existing header should become a fixed application header.

Requirements:

- fixed to the top of the viewport
- remains visible while the page scrolls
- does not overlap page content
- respects the existing workspace spacing
- responsive
- correct stacking/z-index relative to the sidebar and overlays

Do not redesign the header.

---

# 3. ROLLSYNC LOGO

Clicking the Roll SYNC logo should navigate to:

```text
/

Use normal Next.js navigation.

Do not perform a full browser reload.

The logo should provide appropriate interactive feedback:

hover
active/press
focus
4. SEARCH

The existing search button should open an animated search modal.

Do not redesign the existing search button.

When clicked:

animate the search modal into view
focus the search input automatically
allow the user to type
provide a clean close interaction
allow Escape to close it
prevent interaction with the workspace behind the modal while open

The modal should remain intentionally simple.

Structure:

Search
────────────────────
[ Search input ]

Quick links

⌘ B    Toggle sidebar
⌘ L    Attendance record
⌘ J    Attendance session
⌘ Y    Add people

More shortcuts may be added later.

Do not implement functionality for nonexistent pages unless those routes already exist.

For shortcuts that have not been implemented yet, keep them represented as shortcuts without creating unnecessary infrastructure.

Keyboard shortcut behavior:

⌘ B → toggle sidebar
⌘ L → navigate to /[slug]/attendance/record
⌘ J → navigate to /[slug]/attendance/session
⌘ Y → navigate to /[slug]/people

Also support the equivalent Ctrl modifier on Windows/Linux.

Do not trigger shortcuts while the user is typing in an input, textarea, or other editable element unless explicitly appropriate.

5. SEARCH MODAL ANIMATION

Use subtle animation.

The modal should:

fade in
slightly translate/scale into place
have a subtle backdrop
animate out when closed

Keep the animation fast and premium.

Respect:

prefers-reduced-motion

Do not over-animate.

6. DYNAMIC PAGE BREADCRUMB

The existing "Overview" text in the header should no longer be hardcoded.

Make it a dynamic breadcrumb component based on the current route.

Examples:

Overview
Attendance / Session
Attendance / Record
People
Organization
Reports
Developers
Settings
Help

The breadcrumb should update automatically when navigating between workspace pages.

Do not create separate hardcoded header implementations for every page.

Use the current pathname/route segments.

The current page should be visually distinguishable where appropriate.

7. SIDEBAR TRIGGER

The existing sidebar trigger should toggle the sidebar.

It should:

animate the sidebar open
animate the sidebar closed
provide hover feedback
provide active/press feedback
provide keyboard focus feedback
support keyboard interaction

Do not create a second sidebar.

Use the existing sidebar component.

8. SIDEBAR OPEN STATE

When the sidebar is open:

display a darkened backdrop behind it
keep the sidebar above the backdrop
prevent inappropriate background interaction
clicking the backdrop should close the sidebar
Escape should close the sidebar

The sidebar should be:

vertically centered in the viewport
positioned correctly relative to the fixed header
visually consistent with the existing design

Do not make the backdrop excessively dark.

Use a subtle overlay.

9. SIDEBAR ANIMATION

Opening:

smooth entrance
subtle opacity/translation animation

Closing:

smooth exit

Do not use excessive spring/bounce effects.

The sidebar should feel like a polished application workspace.

Respect reduced-motion preferences.

10. ACTIVE SIDEBAR LINK

The active navigation item should automatically correspond to the current route.

The active link should use:

bg-blue

Use the project's existing Tailwind/design token for bg-blue.

Do not hardcode a different blue value.

The active state must update automatically during navigation.

Do not manually maintain active state with React state.

Use the current pathname.

11. SIDEBAR USER INFORMATION

Replace the existing placeholder user information with the authenticated user's actual data.

Name

Replace:

John Doe

with the authenticated user's name.

If the full name is longer than 10 characters, display only the user's first name.

Example:

John

instead of:

Johnathan Doe

Use sensible handling when first/last name fields are missing.

Do not expose unnecessary user information.

12. USER AVATAR

The current default avatar icon should remain exactly the same when the user has no avatar.

If the authenticated user has an avatar:

display the avatar image
preserve the existing avatar dimensions
preserve the existing shape
provide an appropriate fallback if the image fails to load

Do not redesign the avatar.

Do not require an avatar during onboarding.

13. ORGANIZATION SWITCHER

The existing organization/entity switcher should become functional.

The user may belong to multiple entities.

These may be:

schools
organizations
events

Membership rank/role must NOT prevent the user from seeing or switching to an entity they legitimately belong to.

Do not assume the user must be an owner/admin.

Use the existing membership model and authorization rules.

14. ORGANIZATION SWITCHER DROPDOWN

Clicking the current entity switcher should open a simple animated dropdown.

The dropdown should display:

the entities the user belongs to
maximum first 10 entities
current entity clearly indicated

If the user belongs to more than 10:

Show more

should appear at the end.

Do not load every organization unnecessarily just to display the first 10.

Prefer a query that retrieves only what is required.

15. ENTITY ICONS

For each entity:

If it has an image/logo:

use the entity image

Otherwise use the appropriate existing icon asset:

school.svg
event.svg
org.svg

Determine the icon from the entity type.

Do not use the school icon for every entity.

Do not create new icons unless absolutely necessary.

16. SWITCHING ENTITY

Clicking an entity in the dropdown should navigate to that entity's workspace.

Example:

/current-school/overview

→

/another-school/overview

Preserve the destination page where sensible.

For example:

/current-school/people

switching entity should preferably become:

/another-school/people

If the destination is unavailable or inappropriate, safely fall back to:

/another-school/overview

Never allow switching to an entity the authenticated user does not belong to.

17. SHOW MORE

If the user has more than 10 memberships:

Display:

Show more

Make it functional.

Use a sensible minimal implementation.

Do not create a large organization management system as part of this task.

If necessary, allow the dropdown to expand or display the remaining entities through a simple secondary state.

Keep the interaction consistent with the existing UI.

18. CREATE ORGANIZATION

The bottom of the organization switcher should contain:

Create organization

Make it functional.

It should take the user into the existing onboarding flow for creating another entity.

Do not duplicate the onboarding implementation.

Reuse the existing onboarding route/components/state logic.

The user must not lose access to their existing entities when creating another one.

19. LOGOUT

The existing logout button must become functional.

Use the existing Better Auth client/session implementation.

On logout:

terminate the current session
prevent stale authenticated workspace state
redirect the user to /
handle errors cleanly

Do not create a second logout mechanism.

Provide a loading/disabled state while logout is executing.

20. DROPDOWN ANIMATION

The entity switcher dropdown should:

animate open
animate closed
feel lightweight
not block the entire screen unnecessarily
close when clicking outside
close with Escape

Do not use excessive animation.

21. INTERACTION FEEDBACK

Every interactive component in the workspace should have appropriate feedback.

This includes:

logo
search
search input
sidebar trigger
sidebar links
organization switcher
organization items
show more
create organization
logout
any existing buttons
any existing links

Feedback can include:

hover
active
focus
disabled
loading

Do not add feedback that changes the visual language of the existing design.

22. ACCESSIBILITY

Maintain proper accessibility.

Interactive elements should:

use semantic buttons/links
have keyboard support
have visible focus states
have appropriate labels where icons are used
support Escape for overlays/dropdowns
not trap keyboard focus incorrectly

Do not rely on click handlers attached to generic divs when a button or link is appropriate.

23. RESPONSIVE BEHAVIOR

The workspace must remain usable across:

desktop
tablet
mobile

Do not redesign the layout.

Adapt the existing layout only where required for usability.

The fixed header, sidebar, modal, dropdown and content area must not overlap incorrectly.

24. ROUTE STRUCTURE

The workspace should support:

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

The existing dashboard placeholder pages should remain minimal.

Do not build the actual attendance functionality yet.

This task is about the application shell and navigation infrastructure.

25. AUTHORIZATION

Never trust the slug from the client.

Every workspace request must verify:

authenticated user
entity exists
user has membership/access to that entity

A user must not gain access to another entity by manually editing the URL.

Apply authorization server-side.

26. PERFORMANCE

Keep the implementation lightweight.

Avoid:

unnecessary client components
unnecessary global state
unnecessary API requests
polling
WebSockets
realtime infrastructure
duplicated data fetching
large dependencies

Use server components where appropriate.

Only use client components where interactivity requires them.

27. ARCHITECTURE RULES

This project uses:

Next.js
App Router
TypeScript
Prisma 7
Better Auth
PostgreSQL

Do NOT introduce:

NestJS
Express
Socket.IO
WebSockets
RealtimeService
another auth system
another database layer

Keep the existing architecture intact.

28. CODE QUALITY

Use strict TypeScript.

Do not use:

any

unless there is an unavoidable external typing issue and it is properly justified.

Prefer small focused components.

Do not create abstractions for one-time logic.

Reuse existing utilities/components where possible.

Do not duplicate route definitions or navigation metadata.

A centralized navigation configuration is preferable if one does not already exist.

29. DO NOT MODIFY THE UI BEYOND THIS SCOPE

The UI is already designed.

Only modify visual elements when required for:

animation
interaction feedback
dynamic data
accessibility
functional states
responsive correctness

Do not "improve" the design based on personal preference.

Do not redesign components.

Do not change the visual identity.

30. FINAL PRODUCTION CHECK

After implementation, run all relevant checks.

At minimum:

pnpm install
pnpm lint
pnpm run build

Also verify manually:

Authentication
authenticated user can enter workspace
logged-out user cannot access workspace
logout works
Navigation
all sidebar links navigate correctly
active link updates correctly
breadcrumb updates correctly
logo returns to /
Search
search opens
input autofocuses
Escape closes
shortcuts work
Ctrl equivalents work on Windows/Linux
shortcuts do not fire while typing
Sidebar
opens smoothly
closes smoothly
backdrop appears
clicking backdrop closes it
Escape closes it
Organization switcher
current entity is shown
first 10 memberships appear
correct icon/image appears
switching works
Show more works when necessary
Create organization works
members of different ranks can switch entities
User
actual name appears
names over 10 characters use first name
avatar appears when available
default avatar remains when unavailable
Production safety

Confirm:

no TypeScript errors
no lint errors
no broken routes
no hydration errors
no console errors introduced
no unauthorized workspace access
no unnecessary dependencies
no Prisma version changes
no Better Auth regressions

Fix any issues discovered before finishing.

FINAL OUTPUT

When complete, report:

What was implemented.
Which existing components were reused.
Any database changes made.
Any new routes/components created.
Validation/build results.
Any remaining limitations.

Do not report success unless the production checks actually pass.


### One correction I'd make to your shortcut wording

You said:

> `command + B`, `command + L`, etc.

Since you're developing on Windows, I'd make the behavior **Cmd on macOS + Ctrl on Windows/Linux**. The UI can still display `⌘` if that's part of your existing design, but the actual keyboard listener should support both.

Also, I would **not let the agent build a full "organization management" system for the switcher**. The switcher only needs membership retrieval, switching, "show more," and a link into your existing onboarding. Otherwise this task will balloon very quickly.

The important architectural piece here is that **`/[slug]` becomes the workspace shell**, while the actual attendance infrastructure comes afterward. That keeps this implementation clean instead of mixing navigation, attendance, and organization management into one giant task.