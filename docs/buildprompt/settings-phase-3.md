# Roll SYNC Settings — Phase 3: Billing, Help & Support + Final Polish

Complete the Roll SYNC Settings system.

The following settings sections already exist:

- Profile
- Organization
- Attendance
- Notifications
- Security
- Developers

Now implement:

1. Billing
2. Help & Support
3. Final Settings-wide consistency/polish

The attached Settings design is still the visual source of truth.

Do not redesign the Settings page.

The existing architecture and database schema have already been defined. Inspect and reuse the existing implementation. Do not redesign the data model.

---

# 1. Billing

Create:

`/[slug]/settings/billing`

Billing is organization-specific.

Use the existing Polar integration and existing pricing architecture.

Do NOT create a separate billing/subscription system.

---

## Current plan

The top of the page should clearly show the organization's current plan.

Example:

```text
Plan

Roll SYNC Plus

Your organization is currently on the Plus plan.

[ Manage plan ]

Display real subscription/plan information from the existing backend/Polar integration.

Do not hardcode:

plan name
subscription status
price
renewal date
limits
Plan status

Where available, display useful information such as:

Current plan
Subscription status
Billing interval
Renewal/end date
Trial status
Cancellation status

Keep it concise.

Do not turn the page into a full billing dashboard.

2. Manage subscription

The Manage plan action should use the existing Polar billing/customer portal flow.

If a Polar customer portal/session endpoint already exists:

Reuse it.

If one does not exist but the existing Polar integration supports creating a customer portal/session:

Implement the smallest server-side endpoint/action required.

Do NOT expose Polar credentials to the client.

Do NOT implement payment processing manually.

Do NOT build custom credit-card/payment forms.

Polar remains responsible for payment and subscription management.

3. Upgrade / change plan

If the organization is on a free plan, provide an appropriate upgrade action.

For example:

Choose a plan

Free
For getting started

Plus
For growing organizations

Pro
For larger organizations

[ View plans ]

However, keep this compact.

Use the existing Roll SYNC pricing definitions.

Do not invent new plans or pricing.

The existing pricing architecture is the source of truth.

4. Usage

If the existing backend exposes organization usage/limits, display them.

Useful examples:

Usage

People
120 / 500

Attendance records
12,430 / 50,000

API usage
2,340 / 10,000

Only show metrics that already exist.

Do NOT add expensive or unnecessary analytics queries merely to populate a settings page.

If usage infrastructure does not exist yet, omit this section.

Do not create fake counters.

5. Billing access control

Billing information and subscription management are organization-level actions.

Follow the existing membership/role system.

Typical behaviour:

Owner → full billing access
Admin → only if existing permissions allow it
Member → read-only or no billing management

Do not invent a new permission system.

The server must enforce authorization.

Hiding the billing button is NOT sufficient.

6. Billing edge cases

Handle existing subscription states correctly.

Examples:

Free

Show:

You're currently on Free.

with an upgrade action.

Active paid subscription

Show:

Active

and the manage subscription action.

Cancelled but active until period end

Clearly communicate:

Your subscription will end on [date].

Past due / failed payment

If Polar exposes this state:

Show a clear warning and provide the appropriate billing-management action.

No billing information

Do not crash the settings page.

Show a useful empty state.

Do not invent subscription records.

7. Help & Support

Create:

/[slug]/settings/help

Keep this page intentionally simple.

Use the existing Settings visual language.

Documentation
Documentation

Learn how to use Roll SYNC and get the most out of your workspace.

[ View documentation → ]

Use the existing documentation destination if one exists.

Do not create duplicate documentation.

Contact support
Contact support

Need help with Roll SYNC?

[ Contact support → ]

Use the existing support/contact mechanism if one exists.

If support infrastructure does not exist yet, use the existing appropriate contact destination rather than creating a new ticketing system.

Feedback
Feedback

Have an idea, suggestion, or problem?

[ Send feedback → ]

Use the existing feedback mechanism if available.

Do not build a complete feedback management system as part of this task.

About Roll SYNC

At the bottom, optionally show:

Roll SYNC

Version 0.1.0

Use the actual application/package version where available.

Do not hardcode a version if the project already exposes it elsewhere.

8. Final Settings navigation

The Settings navigation should now contain:

Profile

Organization

Attendance

Notifications

Security

Developers

Billing

Help & support

Keep the exact visual language already established.

The active state should work correctly for every nested route.

9. Settings-wide polish

Now inspect ALL Settings pages together.

Do not redesign them individually.

Make them feel like one cohesive product.

Ensure:

identical spacing conventions
consistent section headings
consistent field labels
consistent button sizes
consistent border radius
consistent active navigation state
consistent loading states
consistent success feedback
consistent error handling
consistent empty states
consistent typography
consistent responsive behaviour

If a shared Settings component can solve an inconsistency, fix the shared component rather than duplicating styling.

10. Navigation behaviour

Verify all settings navigation:

/[slug]/settings/profile
/[slug]/settings/organization
/[slug]/settings/attendance
/[slug]/settings/notifications
/[slug]/settings/security
/[slug]/settings/developers
/[slug]/settings/billing
/[slug]/settings/help

Clicking a category should navigate without a full page reload.

The active state must derive from the current route.

Browser back/forward must work.

Refreshing the page must preserve the selected category.

11. Settings shell behaviour

The Settings page should remain inside the existing Roll SYNC application shell.

Preserve:

existing header
search
sidebar
organization switcher
user menu
sidebar animation
breadcrumbs
keyboard shortcuts

Do not redesign these components.

12. Organization switching

Settings must always operate on the CURRENT [slug].

If the user switches organizations using the existing organization switcher:

The new organization's settings should load.
Organization-specific data must not leak between organizations.
Profile/Security remain user-level.
Organization/Attendance/Developers/Billing use the newly selected organization.

Server-side authorization must always resolve the organization from the current slug and verify membership.

Never trust a client-provided organization ID for authorization.

13. Security review

Before considering Settings complete, inspect every mutation.

For each mutation verify:

User is authenticated.
Current organization is resolved server-side.
Membership is checked server-side.
Required role/permission is checked server-side.
Input is validated server-side.
Mutation only affects the authorized resource.

Pay particular attention to:

organization updates
attendance settings
notification preferences
API keys
billing actions
member-related settings
destructive actions

Do not rely on UI visibility for authorization.

14. Loading / error / empty states

Every Settings section should handle:

Loading

Use the existing loading patterns.

Error

Show a compact inline error with a retry action where appropriate.

Empty

Use a clean explanatory empty state rather than an empty page.

Saving

Buttons and controls should communicate when an operation is in progress.

Prevent duplicate submissions.

15. Animations

Keep the existing restrained Roll SYNC animation language.

Use subtle:

hover feedback
press feedback
tab transitions
dialog transitions
save feedback
loading transitions

Respect:

prefers-reduced-motion

Do not introduce large animations or animated page transitions just for visual effect.

16. Do not create unnecessary infrastructure

This phase must NOT introduce:

another payment provider
another subscription system
another authentication system
another support system
another analytics system
another API system
realtime/WebSockets
Socket.IO
duplicate database models
duplicate settings layouts
unnecessary dependencies

Use the existing architecture.

17. Production checks

Run:

pnpm lint
pnpm run build

Fix all errors.

Then manually test the complete Settings experience.

Profile
Loads real user information.
Changes persist.
Authentication is enforced.
Organization
Loads the correct organization.
Logo works.
Organization changes persist.
Organization authorization works.
Attendance
Existing settings load.
Changes persist.
Unauthorized users cannot modify them.
Notifications
User preferences load.
Changes persist.
User isolation works.
Security
Password flow works through Better Auth.
Session/security functionality uses existing Better Auth infrastructure.
Developers
API keys can be created.
Secrets are only shown once.
Revocation actually invalidates keys.
Authorization works.
Billing
Correct organization's plan is displayed.
Polar state is used.
Manage subscription works where configured.
No sensitive billing credentials reach the client.
Free/paid/cancelled states don't crash the page.
Help & Support
Documentation link works.
Support link works.
Feedback link works where configured.
Navigation
Every settings category works.
Active state is correct.
Refresh preserves the route.
Browser back/forward works.
Organization switching works.
Existing application sidebar/header remains functional.

Do not modify unrelated parts of the application.


### After this, Settings is essentially done

The resulting structure should be:

```text
/[slug]/settings
│
├── profile
├── organization
├── attendance
├── notifications
├── security
├── developers
├── billing
└── help

And importantly, we shouldn't keep adding settings just because we can. Once these are working, Settings becomes the stable control centre for the organization, while things like members, attendance operations, reports, and API management can remain in their dedicated workspace routes.