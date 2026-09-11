 # Implement: Developer Page

## Goal

Implement the `/[slug]/developers` page as the organization's developer/API workspace.

The page should allow authorized organization members to understand and manage Roll SYNC's developer integrations using the infrastructure that already exists in the project.

Do NOT redesign the existing application shell or introduce a new developer architecture.

---

## 1. Inspect the Existing Project First

Before writing code, inspect:

- existing `/[slug]` workspace layout
- existing `/[slug]/settings` implementation
- current Prisma schema
- existing authentication and authorization
- existing organization/membership/permission system
- existing API routes
- existing API-key/data models
- existing audit infrastructure
- existing environment/configuration
- existing UI components and design system

Reuse what already exists.

Do not create duplicate models, authentication systems, permission systems, API infrastructure, or audit systems.

---

# 2. Developer Page

Route:

`/[slug]/developers`

Use the existing workspace shell.

The page should feel like a natural part of Roll SYNC rather than a separate application.

Main heading:

**Developers**

Supporting text:

**Build integrations with Roll SYNC's API.**

Keep the visual design clean, spacious, modern, and consistent with the existing Settings/Workspace UI.

---

# 3. API Overview

Create a simple overview section explaining what developers can do.

Include:

- API access
- Authentication
- API keys
- Webhooks / events if the existing infrastructure supports them

Do not invent API capabilities that do not currently exist.

Where appropriate, link to the actual API documentation/routes already present in the project.

---

# 4. API Keys

If the existing architecture already contains an API-key model, implement the UI against it.

Users with the appropriate organization permission should be able to:

- create an API key
- give it a name
- see when it was created
- see its status
- revoke it

### Secret handling

When a key is created:

- show the full secret **once**
- clearly tell the user to copy/store it
- never display the full secret again
- never store plaintext secrets if the existing architecture supports hashed/secure storage
- use the existing security conventions

Example:

```text
Create API key

Name
[ Production Integration ]

                    Create key
````

After creation:

```text
Your API key

rs_live_••••••••••••••••

Copy key

You won't be able to see this key again.
```

Do not expose secrets through normal list endpoints or client-side state unnecessarily.

---

# 5. API Key List

Display existing keys in a clean table/list:

* Name
* Created
* Last used (only if real data exists)
* Status
* Actions

Actions:

* Revoke

Do not fabricate usage statistics.

If last-used tracking does not currently exist, simply omit it.

---

# 6. Permissions

Developer functionality must respect the existing organization authorization system.

Do not assume every organization member can manage API keys.

Use the existing permission model to determine:

* who can view developer resources
* who can create keys
* who can revoke keys

If the project already has a developer/API permission, use it.

If it does not, inspect the existing permission conventions and add only the smallest necessary permission required for this page.

Do NOT create an entirely new authorization system.

---

# 7. Webhooks

If webhook infrastructure already exists:

Show a basic Webhooks section with the existing capabilities.

If it does not exist:

Show a clean **Coming soon** / placeholder section.

Do NOT implement an entire webhook delivery system just for this page.

Do NOT add another queue, realtime system, or background infrastructure.

The existing BullMQ infrastructure remains the only async job system.

---

# 8. API Documentation

If the repository already contains API documentation:

Expose a clear link to it.

If documentation does not yet exist, create only a lightweight placeholder such as:

**API documentation**

> Documentation for the Roll SYNC API will be available here.

Do not generate a huge documentation system as part of this task.

---

# 9. Organization Context

The page must always operate within the current:

`/[slug]`

organization.

Server-side:

* authenticate the current user
* resolve the organization from the slug
* verify membership
* verify the required developer permissions
* never trust the slug alone for authorization

A user must never be able to manage another organization's API keys simply by changing the URL.

---

# 10. API Key Backend

Use the existing backend conventions.

Prefer:

* existing server actions where appropriate
* existing route handlers where appropriate
* existing Prisma models
* existing authorization helpers

All mutations must be validated server-side.

Do not rely on client-side authorization.

Handle:

* duplicate/invalid names
* unauthorized requests
* invalid organization context
* revoked keys
* expired/invalid sessions
* unexpected database failures

with clean user-facing feedback.

---

# 11. UI/UX

Use the existing Roll SYNC design language.

Requirements:

* responsive
* keyboard accessible
* subtle hover states
* subtle button interactions
* loading states
* disabled states
* empty states
* confirmation before destructive revocation
* success/error feedback
* reduced-motion friendly

Do not introduce:

* gradients everywhere
* excessive cards
* unnecessary animations
* AI-style visual effects
* a completely new design system

Keep it practical and premium.

---

# 12. Security

Treat API keys as credentials.

Verify that:

* plaintext secrets are never persisted unnecessarily
* secrets are never returned in normal list queries
* revoked keys cannot authenticate
* organization isolation is enforced server-side
* unauthorized members cannot create/revoke keys
* sensitive operations use the existing audit infrastructure where appropriate

Do not log API secrets.

Do not expose secrets in URLs.

---

# 13. Do Not Touch Unrelated Systems

Do NOT redesign:

* onboarding
* People
* Classes
* Timetable
* Attendance
* existing Settings UI
* Better Auth
* BullMQ
* UploadThing

Only integrate with them where the existing architecture requires it.

Do not add new dependencies unless absolutely necessary.

---

# 14. Production Checks

After implementation:

```bash
pnpm lint
pnpm run build
```

Fix all linting and TypeScript/build errors caused by this implementation.

Do not silence errors with:

* `any`
* `@ts-ignore`
* unnecessary eslint disables
* unsafe casts

---

# Definition of Done

The implementation is complete when:

* `/[slug]/developers` exists and works
* it uses the existing workspace shell
* organization authorization is enforced server-side
* authorized users can view developer resources
* API keys can be created if the existing infrastructure supports them
* newly created secrets are shown only once
* API keys can be revoked
* revoked keys cannot be used
* existing API documentation is linked when available
* webhook infrastructure is reused if available, otherwise shown as a placeholder
* no duplicate infrastructure has been introduced
* UI matches the existing Roll SYNC design
* empty/loading/error states work
* `pnpm lint` passes
* `pnpm run build` passes

Before finishing, provide a short summary of:

1. What was implemented
2. What existing infrastructure was reused
3. Any functionality intentionally left as a placeholder
4. Confirmation that lint and build pass

```
```
