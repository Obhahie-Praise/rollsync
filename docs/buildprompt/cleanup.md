# Roll SYNC — Clean Teacher Access + Correct Role-Based Routing

## Goal

Clean up the current workspace so the teacher experience is completely separated from organization/admin functionality.

Teachers must NOT be able to access organization-owner/admin pages, even by manually entering URLs.

When a teacher signs in, they should be taken directly to:

`/[slug]/teacher/today`

Do not redesign the application or introduce new architecture.

Prioritize:
1. Correct authorization
2. Correct post-login routing
3. Removing inaccessible admin UI from the teacher experience
4. Minimal, clean implementation
5. No bloat or duplicate logic

---

## 1. Audit the Current Routing First

Before changing anything, inspect:

- authentication flow
- Better Auth session handling
- membership/role/permission resolution
- teacher workspace routes
- organization workspace routes
- shared layouts
- sidebar/header
- overview route
- middleware/proxy/server guards if present
- existing route authorization helpers

Do NOT rewrite working infrastructure.

Identify exactly why teachers can currently see or reach organization-only functionality.

---

# 2. Teacher Access Boundary

A teacher should have access only to functionality appropriate for their teacher workspace.

Teacher workspace should primarily contain:

- Today
- My Classes
- Timetable
- Attendance / class check-in
- Profile
- Help if already permitted

Teachers should NOT have access to organization administration such as:

- Organization Overview
- People administration
- Organization management
- Reports
- Developers
- Organization settings
- Billing
- API keys
- organization configuration
- administrative setup
- other owner/admin-only functionality

Do not assume hiding navigation items is sufficient.

### Important

Enforce this on the SERVER.

A teacher manually navigating to:

`/[slug]/overview`

or:

`/[slug]/organization`

or:

`/[slug]/reports`

etc.

must receive an appropriate authorization response/redirect.

Do not rely on client-side checks.

---

# 3. Overview Page

The current organization overview is an admin/organization workspace page.

Teachers should NOT be able to access it.

Do not create a separate teacher version of Overview unless one already exists and is required.

The teacher's starting point is:

`/[slug]/teacher/today`

Keep the existing organization overview for authorized organization users.

---

# 4. Post-Login Routing

Fix the authentication redirect logic.

After successful login:

### Teacher-only membership/context

If the authenticated user is a teacher for the selected organization and does not have organization-admin access:

redirect to:

`/[slug]/teacher/today`

### Admin/Owner

If the user has organization administration permissions:

redirect to the existing organization workspace start page.

Prefer the existing:

`/[slug]/overview`

if that is currently the intended admin landing page.

### Dual-role user

A user may be both:

- organization Admin/Owner
- Teacher Person

Do NOT remove either capability.

They should still have access to the appropriate organization workspace and teacher workspace.

Do not accidentally classify an Admin who happens to be a Teacher Person as teacher-only.

---

# 5. Do Not Create Duplicate Authentication Logic

Use the existing Better Auth session and existing membership/permission helpers.

Do NOT:

- create a second teacher authentication system
- create teacher-specific sessions
- duplicate User models
- duplicate Membership models
- create another role system
- add middleware everywhere unnecessarily
- add a new authorization package

There should be one authentication system and one authorization model.

---

# 6. Teacher Sidebar / Navigation

Clean the teacher sidebar so teachers only see routes they can actually use.

Do not merely render admin links and disable them.

Remove them from the teacher navigation entirely.

Teacher navigation should be focused and simple:

- Today
- My Classes
- Timetable
- Attendance/check-in where appropriate
- Profile

Use the existing sidebar/header components where possible.

Do not create a separate duplicate shell if the current shell can support role-aware navigation.

---

# 7. Organization Workspace Must Remain Intact

Do NOT break admin/owner functionality.

Organization users should still have access to their existing:

- Overview
- People
- Organization
- Reports
- Developers
- Timetable
- Settings
- other permitted administrative pages

Authorization must remain permission-aware.

Do not replace the existing authorization model with a simplistic:

`role === "teacher"`

check.

Use the existing permissions/membership structure.

---

# 8. Direct URL Security

Test the important boundary explicitly.

For a teacher account, manually requesting:

```text
/[slug]/overview
/[slug]/organization
/[slug]/people
/[slug]/reports
/[slug]/developers
/[slug]/settings
````

must NOT expose organization-only functionality.

Depending on the existing architecture, either:

* redirect to `/<slug>/teacher/today`
* or return the application's existing unauthorized/not-found behavior.

Choose the behavior that fits the existing routing conventions.

Do NOT expose sensitive organization data before the authorization check.

Authorization must happen before protected data is loaded.

---

# 9. Teacher Workspace

Ensure the teacher experience starts cleanly at:

`/[slug]/teacher/today`

The Today page should remain the teacher's primary home.

It should use the authenticated teacher context already established by the current implementation.

Do not introduce new teacher IDs from query parameters or client-controlled values.

Resolve:

```text
Better Auth User
        ↓
Membership
        ↓
Organization
        ↓
linked Teacher Person
        ↓
Teacher timetable/classes
```

Use the existing infrastructure.

---

# 10. Route-Level Protection

Prefer a small centralized authorization helper if one already exists.

For example, conceptually:

```text
requireOrganizationAccess()
requireOrganizationAdminAccess()
requireTeacherAccess()
```

But:

**DO NOT create these if equivalent helpers already exist.**

Reuse and consolidate instead.

The important distinction is:

```text
Organization workspace access
≠
Teacher workspace access
```

A valid organization membership alone should not automatically grant access to admin pages.

Likewise, being a Teacher Person should not automatically remove legitimate admin access from an Admin/Owner.

---

# 11. Sidebar + Layout Behavior

Check the shared `[slug]` layout carefully.

If the current layout exposes organization navigation before determining the user's workspace, make it role/permission aware.

Avoid duplicating layouts unnecessarily.

Preferred structure:

```text
/[slug]
   ├── organization workspace
   │      ├── overview
   │      ├── people
   │      ├── reports
   │      ├── organization
   │      └── ...
   │
   └── teacher workspace
          ├── today
          ├── classes
          ├── timetable
          └── attendance
```

Use existing components and infrastructure wherever possible.

---

# 12. Redirect Safety

Make sure redirects cannot be manipulated into another organization's workspace.

Do not trust:

* client-provided role
* client-provided organization ID
* arbitrary slug from the client
* query parameters claiming to be a teacher/admin

Resolve access server-side.

A user must only be redirected into an organization they legitimately belong to.

---

# 13. Do NOT Overbuild

This task is a cleanup.

Do NOT:

* redesign the UI
* add new dependencies
* create new databases/tables
* redesign the permission system
* implement new attendance functionality
* implement student attendance
* add realtime
* add WebSockets
* add new APIs unnecessarily
* create duplicate teacher/admin components
* refactor unrelated working features

Keep the patch small.

If existing infrastructure already solves something, reuse it.

---

# 14. Production Quality

After implementation:

```bash
pnpm install
pnpm lint
pnpm run build
```

Fix all errors introduced by this change.

Do not hide errors with `eslint-disable` unless absolutely necessary and justified.

---

# Acceptance Criteria

## Teacher

A teacher signs in and lands directly on:

`/[slug]/teacher/today`

They do NOT see:

* Overview
* Organization
* People admin
* Reports
* Developers
* Billing
* admin settings

They cannot access those pages by manually entering their URLs.

## Admin/Owner

Admin/Owner login continues to work normally.

They can still access the organization workspace and its permitted administrative pages.

## Dual-role

A user who is both Admin/Owner and Teacher retains both capabilities.

Do not downgrade them to teacher-only.

## Security

Server-side authorization prevents cross-role and unauthorized route access.

No sensitive organization data is fetched before authorization.

## Quality

* Reuses existing auth/permission infrastructure
* No duplicate auth system
* No unnecessary dependencies
* No schema changes unless genuinely required
* Minimal implementation
* Clean routing
* `pnpm lint` passes
* `pnpm run build` passes

---

## Final Response

After completing the work, report only:

1. Files changed
2. How teacher/admin routing now works
3. Which organization routes are blocked for teachers
4. Any important edge cases handled
5. `pnpm lint` result
6. `pnpm run build` result

Do not make unrelated changes.

```

The **most important part** is that the agent doesn't interpret this as “hide Overview from the sidebar.” The actual requirement is:

**Teacher UI ≠ admin UI + teacher server access ≠ admin server access + login resolves the correct workspace.**

That will make the build feel much cleaner instead of accumulating conditional UI everywhere.
```
