# Roll SYNC Settings — Phase 2

Continue the existing Settings implementation.

The Settings layout, navigation, Profile, Organization, Attendance, and Security sections have already been implemented.

Now implement:

1. Notifications
2. Developers

Use the existing Settings layout and visual language. Do not redesign the Settings page.

The existing architecture and database schema have already been defined. Inspect and use what already exists. Do not redesign the data model or create duplicate infrastructure.

---

# 1. Notifications

Create:

`/[slug]/settings/notifications`

Use the existing Settings layout.

Keep the UI consistent with the existing screenshot/design:

- Minimal
- Spacious
- Soft grey controls
- Subtle blue accents
- Clean section headings
- No unnecessary cards
- No dashboard-style widgets

## User notification preferences

These preferences belong to the authenticated USER, not the organization.

Implement the notification preferences already supported by the existing architecture.

Organize them into sensible sections such as:

### Email notifications

- Attendance summaries
- Organization invitations
- Security alerts
- Important account updates
- Product updates

Only expose options that have a real purpose in the current product.

Do not create fake notification types simply to fill the page.

### In-app notifications

Expose relevant in-app notification preferences if the existing notification infrastructure supports them.

---

## Behaviour

Each preference should:

- Load the user's existing value.
- Have a clear enabled/disabled state.
- Persist changes through the existing backend protocol.
- Validate on the server.
- Verify the authenticated user server-side.
- Show a subtle saving state.
- Give clear feedback when saved.
- Preserve the current state if saving fails.

Avoid requiring a large "Save everything" button if individual toggles can safely persist independently.

Do not make the notification settings organization-specific unless the existing architecture explicitly defines them that way.

---

# 2. Developers

Create:

`/[slug]/settings/developers`

This is organization-specific.

Use the current `[slug]` to determine the organization.

The page should provide a clean developer settings experience without turning it into a full developer dashboard.

---

# 3. API keys

Implement the API key management interface using the existing API-key architecture/data model.

The page should contain:

### API access

A short explanation:

> Connect Roll SYNC with your own applications and services.

Then:

`Create API key`

---

## API key creation

Clicking Create API key should open a small, polished modal/dialog.

Ask for:

- Key name
- Optional expiration if already supported by the architecture

Do not ask for unnecessary information.

After creation:

Show the generated secret exactly once.

For example:

```text
API key created

rs_live_••••••••••••••••

Copy key

Clearly explain:

This key will only be shown once. Store it somewhere secure.

After the dialog is closed, the raw secret must not be recoverable from the UI.

4. API key security

NEVER store raw API secrets if the existing architecture is designed around hashed secrets.

The server should:

Authenticate the current user.
Verify organization membership/permission.
Generate a cryptographically secure secret.
Store only the appropriate secure representation according to the existing architecture.
Return the raw secret only during creation.
Never return the secret in subsequent API key list requests.

Do not expose API secrets through client-side environment variables or source code.

5. API key list

Display existing keys in a clean list.

Example:

Production API

rs_live_••••••••••••

Created Aug 24
Last used 2 hours ago

Active                         Revoke

Do not show the complete secret.

Show only whatever safe identifier/prefix the existing API-key model provides.

Useful information:

Name
Prefix
Created date
Last used date
Expiration date if supported
Status
6. Revoke API key

Allow authorized organization users to revoke an API key.

Use a confirmation step.

Example:

Revoke API key?

Applications using this key will immediately lose access.

Cancel
Revoke key

The mutation must happen server-side.

A revoked key must no longer authenticate API requests.

Do not merely hide it from the UI.

7. API key permissions

If the existing architecture already defines API-key scopes/permissions, expose them.

If it does NOT, do not invent a new permission system in this phase.

Use the existing organization's authorization model.

8. Webhooks

If webhook infrastructure already exists in the project, expose its existing configuration here.

If it does not exist yet:

Create only the appropriate placeholder UI.

Example:

Webhooks

Receive Roll SYNC events in your application.

Coming soon

Do NOT build a complete webhook delivery system just to populate the settings page.

Do not create WebhookDelivery/WebhookEndpoint infrastructure unless it already exists in the architecture.

9. Developer documentation

At the bottom of the Developers page provide a simple link/action:

View API documentation →

Point it to the existing developer/API documentation route.

Do not create duplicate documentation.

10. Authorization

Developer settings are organization-specific.

Before reading or mutating developer resources:

Authenticate the user server-side.
Resolve the current [slug].
Verify the user is a legitimate member of the organization.
Verify they have sufficient permissions for the requested action.

Do not rely on hiding buttons from unauthorized users.

Server authorization is mandatory.

11. Audit logging

Use the existing audit-log infrastructure where already available.

Developer actions that should be auditable include:

API key created
API key revoked
Developer configuration changed

Do not create a second audit system.

If the existing architecture does not yet have the implementation available, keep the code structured so it can be added without rewriting the feature.

12. Reuse the existing Settings system

Do not create a separate layout.

Reuse:

SettingsLayout
Settings navigation
Settings section components
Settings rows
Existing buttons
Existing modal/dialog components
Existing form components
Existing toast/feedback system

If a component doesn't exist, create the smallest reusable component necessary.

13. Visual behaviour

Everything should match the existing Settings design.

Use subtle interactions:

Toggle transitions
Button hover/press feedback
Dialog entrance/exit
API-key creation feedback
Copy-to-clipboard feedback
Revoke confirmation
Loading states

Respect prefers-reduced-motion.

No excessive animations.

14. Responsive behaviour

Both pages must work on:

Desktop
Tablet
Mobile

Do not redesign the desktop UI.

Adapt the settings content naturally on smaller screens.

15. Architecture constraints

Continue using the existing Roll SYNC architecture:

Next.js App Router
TypeScript
Prisma 7
Better Auth
PostgreSQL
Existing backend protocols
Existing organization/member model
Existing settings architecture
Existing API infrastructure

Do NOT:

add NestJS
add a second backend
add realtime/WebSockets
add Socket.IO
introduce another authentication system
introduce another API-key library/system unnecessarily
duplicate existing database models
upgrade dependencies
redesign the Prisma architecture

The architecture already exists. Extend it.

16. Important implementation rule

Before changing anything:

INSPECT FIRST.

Check:

Existing Settings implementation
Existing Prisma schema
Existing API-key models/services
Existing organization authorization
Existing notification-related models/services
Existing audit-log implementation
Existing UI components
Existing API/developer routes

Reuse existing infrastructure wherever possible.

Do not guess that something doesn't exist just because it isn't immediately visible.

17. Production checks

Run:

pnpm lint
pnpm run build

Fix all errors.

Then manually verify:

Notifications
Notification settings load correctly.
Existing values are displayed.
Toggles persist.
Failed updates don't lose state.
User A cannot modify User B's preferences.
Developers
Developer page loads for the current organization.
Unauthorized users cannot access organization developer resources.
API key creation works.
Generated secret is shown once.
Secret is not returned in the key list.
Copy button works.
API key appears after creation.
Revoking a key actually invalidates it.
Revoked keys cannot be used.
Existing organization membership/role rules are respected.
Existing audit logging is used where available.

Do not modify unrelated parts of the application.


### Then Phase 3

After this, I'd do **Billing + Help & Support**, but Billing should be deliberately tied to the actual Polar state rather than us inventing a local billing system.

And I would **not touch the core workspace UI in that phase**. Settings should be completely finished first so we have a stable place for all these organization-level controls.