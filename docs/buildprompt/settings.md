# Implement Core Settings + Animated Attendance Sidebar Dropdown

Implement the first phase of the Roll SYNC settings system and establish the reusable settings layout.

The attached settings screenshot is the visual reference.

The existing architecture/data model has already been defined. DO NOT redesign or recreate the database architecture. Inspect and use the existing schema, services, utilities, authentication, and backend protocols.

---

# 1. Settings layout

Create the settings layout under:

`/[slug]/settings`

The settings page should use the same visual language as the attached screenshot:

- Very light blue background
- Clean typography
- Large "Settings" heading
- Minimal, spacious layout
- No unnecessary cards
- Soft grey selected states
- Subtle blue accents
- Rounded controls where appropriate
- Premium but extremely restrained
- Reuse the existing Roll SYNC header
- Reuse the existing sidebar/header components
- Do not redesign the existing application shell

The settings layout should have:

```text
Settings
│
├── left settings navigation
│
└── right settings content

The left navigation should remain visible while the selected settings category is displayed on the right.

2. Settings routes

Use nested routes so the selected settings category is represented in the URL.

Create:

/[slug]/settings/profile
/[slug]/settings/organization
/[slug]/settings/attendance
/[slug]/settings/security

Do not keep the selected settings tab only in client state.

The URL must update when changing categories.

This should provide:

refresh persistence
browser back/forward support
direct links
proper App Router navigation
3. Settings navigation

The left settings navigation should contain:

Profile

Organization

Attendance

Notifications

Security

Developers

Billing

Help & support

For this phase:

Fully implement
Profile
Organization
Attendance
Security
Placeholder only
Notifications
Developers
Billing
Help & support

The placeholders should still use the same settings visual system, but do not implement functionality that is not part of this task.

4. Settings navigation behaviour

Clicking a category should:

Navigate to the corresponding nested settings route.
Update the active visual state.
Use the same soft rounded active state shown in the screenshot.
Have subtle hover/press feedback.
Avoid full-page reloads.
Preserve the current [slug].

The selected item should be visually obvious without being heavy.

Use the current route to determine the active item.

5. Profile settings

Implement the profile page using the existing authenticated user data.

Display/edit the user's existing profile information.

At minimum:

Profile photo
Show current user image if available.
Fall back to the existing default avatar/icon.
Allow changing the image using the project's existing upload infrastructure if appropriate.
Do not create another upload system.
Name

Allow the user to edit their existing name.

Email

Display the authenticated email.

Do not unnecessarily allow changing the email unless the existing Better Auth setup already supports it correctly.

Use the existing Better Auth/backend protocol.

Do not duplicate user data into an organization table.

6. Organization settings

Implement the organization settings page for the CURRENT [slug].

Use the existing organization/entity data.

Follow the visual structure from the attached screenshot.

The top section should show:

[ organization logo ]

Organization name
Organization type

relevant organization counts

Use real existing data where available.

Do not hardcode:

organization name
student count
teacher count
people count
logo
organization type

If a logo does not exist, use the existing appropriate fallback asset.

Organization details

Provide editable organization information that is already supported by the existing architecture.

At minimum:

Organization name
Organization logo
Workspace URL / slug

Use the existing organization creation/update backend protocol.

Do not invent a parallel API.

Logo

Use the existing org-logo UploadThing route.

The UI should:

show the current logo
allow changing it
preview the new logo
show a subtle hover overlay with Change logo
handle loading/error states
not require a logo

Do not create another UploadThing endpoint.

Workspace URL

Display the current workspace URL.

Use the existing slug.

If slug editing is already supported by the backend architecture, expose it appropriately.

If changing the slug is NOT currently supported, display it as read-only rather than inventing a new slug mutation system.

7. Attendance settings

Implement the attendance settings page using the existing attendance-related architecture/data model.

Do not invent new attendance concepts.

Organize the page into clean settings sections.

Suggested structure:

Default attendance

Allow configuration of the existing default attendance behaviour.

For example, where supported by the existing architecture:

Default attendance method
Late attendance
Grace period
Duplicate attendance behaviour
Attendance editing

Expose existing configuration around:

Whether attendance can be edited
Who can edit attendance

Only show controls that are actually supported by the existing backend/data model.

Offline attendance

Where supported by the existing architecture, expose the organization-level offline attendance setting.

Keep this user-facing.

Do NOT expose infrastructure details such as:

Redis
BullMQ
queue names
worker configuration
retry counts
sync internals

Those are implementation details, not organization settings.

8. Security settings

Implement the security page using the existing Better Auth functionality.

At minimum provide:

Password

A clear section for changing the user's password.

Use Better Auth's existing password flow.

Do not implement password hashing or authentication logic manually.

Sessions

If the existing Better Auth schema/API provides session management:

Show active/recent sessions where practical.
Identify the current session.
Provide the appropriate sign-out/revoke action.

Do not create a custom session system.

Security features

If existing Better Auth infrastructure already supports additional security features, expose them appropriately.

Do not create fake controls for features that do not exist.

9. Shared settings components

Create reusable components where they genuinely reduce duplication.

For example:

SettingsLayout
SettingsSidebar
SettingsSection
SettingsRow
SettingsField
SettingsSaveBar

Do not over-engineer this.

The goal is a small reusable settings design system that allows the remaining settings tabs to be implemented later without rebuilding the layout.

10. Saving changes

Follow the existing backend protocols.

For editable settings:

Validate on the client for good UX.
Validate again on the server.
Verify authentication server-side.
Verify the user has permission to modify the current organization.
Persist changes using the existing architecture.
Show a clear saving state.
Show a subtle success state after saving.
Preserve form values on failure.
Never rely on client-side authorization.

Avoid unnecessary page reloads after saving.

11. Unsaved changes

If a settings form can contain unsaved changes:

Track whether the form is dirty.
Prevent accidental loss where practical.
Do not add an intrusive confirmation system if the form is simple enough that it isn't needed.

Keep this lightweight.

12. Animated Attendance dropdown in the MAIN sidebar

While implementing Settings, also fix the existing Attendance item in the application sidebar.

It should no longer behave like a simple link.

Make it a proper expandable navigation item.

Collapsed:

Attendance                    ▾

Expanded:

Attendance                    ▴

    Take attendance
    Attendance records

Use the project's existing routes:

/[slug]/attendance/session
/[slug]/attendance/record

Do not invent additional attendance routes.

Behaviour
Clicking Attendance toggles the submenu.
The submenu opens/closes with a subtle height + opacity animation.
Chevron rotates smoothly.
The animation should be quick and restrained.
Respect prefers-reduced-motion.
Clicking a child navigates normally.
The child corresponding to the current route gets the active state.
If the current route is /attendance/session or /attendance/record, automatically keep the Attendance section expanded.
If the user navigates elsewhere, preserve sensible open/closed behaviour.
Do not cause layout jumps outside the sidebar.
Do not introduce realtime or additional state infrastructure.

The existing sidebar's visual style should remain unchanged.

13. Important sidebar constraint

Do NOT rebuild the sidebar.

Modify only the Attendance navigation behaviour required for this task.

Preserve all existing functionality:

organization/entity switcher
active navigation
user menu
logout
sidebar animation
keyboard shortcuts
mobile behaviour
existing routes

Do not break any of them.

14. Responsive behaviour

The settings layout must work on:

desktop
tablet
mobile

On smaller screens, adapt the settings navigation appropriately rather than allowing the left navigation to consume the entire viewport.

Keep the same visual language.

Do not redesign the page specifically for mobile unless necessary for usability.

15. Architecture constraints

Use the existing Roll SYNC architecture.

Important:

Next.js App Router
TypeScript
Prisma 7
Better Auth
PostgreSQL
Existing backend protocols
Existing organization/member model
Existing attendance model
UploadThing for organization logos
BullMQ only where existing infrastructure requires it

Do NOT:

add NestJS
add a separate backend
add realtime/WebSockets
add Socket.IO
create duplicate API systems
create duplicate database models
introduce unnecessary dependencies
upgrade package versions
redesign the application's architecture

The architecture/data model has already been established.

16. Code quality

Follow the existing project conventions.

Use strict TypeScript.

No any.

Prefer server components where possible.

Only use client components where interaction requires them.

Keep server authorization and mutations on the server.

Do not expose secrets or privileged operations to the client.

Keep the implementation minimal and maintainable.

17. Production checks

After implementation run:

pnpm lint
pnpm run build

Fix every error introduced by the implementation.

Then manually verify:

Settings
/[slug]/settings/profile
/[slug]/settings/organization
/[slug]/settings/attendance
/[slug]/settings/security

all load correctly.

Verify:

Settings navigation works.
Active category is correct.
Browser back/forward works.
Refresh preserves the selected category.
Current organization [slug] is preserved.
Organization data is real, not hardcoded.
Profile changes persist.
Organization changes persist.
Attendance settings persist.
Security actions use Better Auth.
Unauthorized users cannot mutate settings.
Sidebar

Verify:

Attendance expands/collapses.
Animation is smooth.
Chevron rotates.
Correct child route is active.
Attendance stays expanded on attendance routes.
Existing sidebar functionality remains intact.

Do not modify unrelated parts of the application.


### One architectural choice I'd stick with

For the settings pages, **don't make each tab a giant client component**. Let the page load the current organization's data on the server, then only make the individual interactive controls client-side.

So conceptually:

```text
/[slug]/settings/
│
├── layout.tsx
│   ├── Settings navigation
│   └── content
│
├── profile/page.tsx
├── organization/page.tsx
├── attendance/page.tsx
└── security/page.tsx

That gives us a clean foundation. Then when we come back for Notifications → Developers → Billing → Help, we're extending the same system rather than rebuilding it.