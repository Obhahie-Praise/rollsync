# Implement: Organization Page

## Goal

Implement `/[slug]/organization` as the organization's administrative management hub.

This page should let authorized administrators understand and manage the identity, structure, access, and overall setup state of their organization.

This is NOT another Settings page and should NOT duplicate the People, Timetable, Reports, Developers, or Settings pages.

Before implementing anything, inspect the existing project and reuse the infrastructure already built.

---

# 1. Route

Create/complete:

`/[slug]/organization`

Use the existing Roll SYNC workspace shell, header, sidebar, navigation, authentication, and authorization.

Do not redesign the application shell.

---

# 2. Organization Identity

The top of the page should present the organization's identity.

Show:

- Logo
- Organization name
- Organization type
- Organization ID / slug
- Organization creation date if available

Example:

```text
Organization

[logo]  Demo School
        School

Organization ID
demo-school

Created
September 2026
````

### Logo

Reuse the existing UploadThing logo infrastructure.

Allow an authorized administrator to:

* view the current logo
* upload/change the logo
* preview the new logo
* save the change

Do not create another upload system.

The logo is optional.

---

# 3. Organization ID

Display the organization's current ID/slug clearly.

It is used by Roll SYNC to identify the organization.

Do not casually allow editing of the ID because it is connected to:

* workspace URLs
* API integrations
* QR flows
* organization routing

If changing it is not already supported safely by the existing architecture, make it read-only.

Do not invent a slug migration system for this task.

---

# 4. Organization Overview

Create a clean overview of the organization's current structure.

For example:

```text
Organization structure

People             156
Classes             12
Subjects            34
Rooms               18
Teachers            18
Members             24
```

Use REAL database data.

Never fabricate counts.

Counts should come from the existing models.

Where useful, each item can link to the relevant existing page:

* People → `/[slug]/people`
* Classes → existing class management/context
* Timetable → `/[slug]/timetable`

Do not create duplicate management pages simply to populate this screen.

---

# 5. People & Access

Show a concise organization access overview.

Example:

```text
People & access

156 people
24 people have Roll SYNC access

Students       128
Teachers        18
Staff           10
Administrators   4

[Manage people]
```

Use the existing Person + User + Membership architecture.

Remember:

```text
Person ≠ User

Person
→ organization identity

User
→ Roll SYNC login identity

Membership
→ organization access + authorization
```

Do not automatically create Users when creating People.

Do not create duplicate membership records.

The existing People page remains the place for detailed person management.

---

# 6. Organization Structure

Provide an administrative overview of the operational structure already configured.

Include real counts/status for:

* People
* Classes
* Class memberships
* Subjects
* Teachers / teaching assignments
* Rooms
* Timetable entries

Example:

```text
Structure

Classes
12 active

Subjects
34 active

Rooms
18 active

Teaching assignments
42

Timetable
Configured
```

Keep this concise.

The purpose is to let an administrator understand whether the organization is configured correctly.

---

# 7. Setup / Readiness Status

This should be one of the most useful parts of the page.

Create a simple setup checklist based on REAL organization data.

Example:

```text
Organization setup

✓ Organization created
✓ People added
✓ Classes configured
✓ Subjects configured
✓ Teachers assigned
✓ Rooms configured
✓ Timetable configured
○ Attendance not recorded yet
```

The status should be derived from the actual database.

Do not mark something complete merely because a page exists.

Examples:

* People → at least one Person exists
* Classes → at least one active Class exists
* Subjects → at least one Subject exists
* Teachers → teacher People/assignments exist
* Rooms → rooms exist if the organization uses them
* Timetable → valid timetable entries exist
* Attendance → attendance sessions/records exist

Use sensible existing architecture rather than inventing artificial setup requirements.

Do not force organizations to configure things that their organization type does not need.

For example, an Event organization should not be treated exactly like a School.

---

# 8. Organization Type Awareness

Respect the existing organization types:

* School
* Organization
* Event

Terminology should adapt where appropriate.

For example:

School:

```text
Students
Teachers
Classes
Subjects
Rooms
Timetable
```

Generic organization:

```text
People
Teams / groups where supported
Locations
Schedules
```

Event:

```text
Attendees / people
Event groups where supported
Venues
Schedule
```

Do not invent a large organization-type abstraction layer.

Use the terminology already established by the existing architecture.

---

# 9. Administrative Actions

Authorized administrators should have access to appropriate organization-management actions.

Depending on what the existing backend already supports:

* Edit organization name
* Change logo
* View organization ID
* Manage organization access
* Archive organization

Do not implement functionality that requires a new architecture unless it is genuinely necessary.

The page should primarily integrate with existing organization management capabilities.

---

# 10. Danger Zone

At the bottom, create a visually separated danger zone.

Include:

### Archive organization

Explain that archiving disables normal organization activity without destroying historical data.

Only implement this if the existing organization lifecycle supports it.

### Delete organization

Only expose deletion if the existing architecture already supports safe deletion.

If deletion is supported:

* require explicit confirmation
* clearly explain the consequences
* require an appropriate authorization level
* never delete global Better Auth Users simply because the organization is deleted
* preserve or handle historical data according to the existing data model

Do not build a complicated deletion workflow unless the architecture already supports it.

---

# 11. Authorization

This is an administrative page.

Server-side:

1. Authenticate the current user.
2. Resolve the organization from `[slug]`.
3. Verify organization membership.
4. Verify the appropriate organization-management permission.
5. Only expose management actions the user is authorized to perform.

Do NOT rely on hiding UI elements for security.

A user must not gain organization-management access by manually navigating to:

`/[slug]/organization`

or changing the slug.

Use the existing authorization system.

---

# 12. Data Integrity

Do not introduce duplicate concepts.

Reuse:

* existing Organization model
* Person
* User
* Membership
* Class
* Class Membership
* Subject
* Teaching Assignment
* Room
* Timetable
* Attendance
* existing audit infrastructure

Do not redefine the schema unless the implementation genuinely requires a missing field.

The school infrastructure already exists and is working. Plug into it.

---

# 13. Audit Important Changes

For important organization mutations, use the existing audit system where appropriate.

Examples:

* organization name changed
* logo changed
* organization archived
* access/membership changes

Do not create a second audit system.

Do not log sensitive credentials or secrets.

---

# 14. UI / UX

Match the existing Roll SYNC visual language.

The page should feel:

* clean
* spacious
* modern
* administrative
* useful

Use:

* clear sections
* subtle dividers
* restrained cards where appropriate
* clear hierarchy
* subtle hover/press feedback
* loading states
* empty states
* success/error feedback
* responsive layouts
* accessible controls
* reduced-motion support

Avoid:

* huge dashboards
* unnecessary gradients
* excessive cards
* decorative statistics
* AI-looking effects
* duplicating Settings UI

The Organization page should feel like a **control center**, not an analytics dashboard.

---

# 15. Navigation

Where the user needs deeper management, link to the existing relevant page instead of recreating it.

Examples:

```text
People
→ /[slug]/people

Timetable
→ /[slug]/timetable

Reports
→ /[slug]/reports

Developers
→ /[slug]/developers

Settings
→ /[slug]/settings
```

Only use routes that actually exist.

Do not invent navigation destinations.

---

# 16. Do Not Touch Unrelated Systems

Do NOT redesign or rewrite:

* onboarding
* Better Auth
* teacher authentication
* People
* Classes
* Timetable
* Attendance
* Reports
* Developers
* Settings
* UploadThing
* BullMQ

Integrate with them where necessary.

Do not add realtime/WebSockets.

Do not add a new backend architecture.

Do not add unnecessary dependencies.

---

# 17. Production Checks

After implementation:

```bash
pnpm lint
pnpm run build
```

Fix all TypeScript, lint, and build errors caused by this implementation.

Do not use:

* `any`
* `@ts-ignore`
* unsafe casts
* unnecessary eslint disables

---

# Definition of Done

The implementation is complete when:

* `/[slug]/organization` exists and works
* it uses the existing workspace shell
* organization authorization is enforced server-side
* organization identity is displayed correctly
* logo management reuses existing UploadThing infrastructure
* organization ID is displayed safely
* real organization structure counts are shown
* People + Roll SYNC access are summarized correctly
* setup/readiness status reflects real data
* terminology respects organization type
* appropriate administrative actions work
* dangerous actions are properly protected
* existing audit infrastructure is reused
* detailed management is delegated to existing People/Timetable/etc. pages
* no duplicate architecture is introduced
* no fake data is displayed
* responsive/accessibility states work
* `pnpm lint` passes
* `pnpm run build` passes

Before finishing, provide a short summary of:

1. What was implemented
2. Which existing infrastructure was reused
3. Any organization-management capabilities intentionally left unavailable
4. Confirmation that lint and build pass

```
```
