1. Pricing Philosophy

Roll SYNC should be easy to adopt.

An organization should be able to create an account and begin taking basic attendance without speaking to sales or entering payment information.

However, the free tier intentionally does not expose the full Roll SYNC platform.

The free tier demonstrates the core attendance experience while reserving advanced infrastructure for paying customers.

The central principle is:

Free lets organizations experience Roll SYNC. Paid plans let organizations build on Roll SYNC.

This distinction is especially important for the offline synchronization system, API, integrations, advanced analytics, and higher-scale usage.

2. Plan Overview
Feature	Free	Plus	Pro	Ultra	Custom
Basic attendance	✓	✓	✓	✓	✓
QR attendance	✓	✓	✓	✓	✓
Roll call	✓	✓	✓	✓	✓
Manual attendance	✓	✓	✓	✓	✓
Mobile app	Limited	✓	✓	✓	✓
Offline attendance	—	✓	✓	✓	Optional
Realtime updates	Limited	✓	✓	✓	Optional
Advanced analytics	—	Limited	✓	✓	Optional
Exports	Limited	✓	✓	✓	Optional
API access	—	—	✓	✓	Optional
SDK access	—	—	✓	✓	Optional
Integrations	—	Limited	✓	✓	Optional
Automation	—	Limited	✓	✓	Optional
Advanced administration	—	✓	✓	✓	Optional
Higher limits	—	✓	✓	✓	Configurable
Priority support	—	—	✓	✓	✓
Custom features	—	—	—	—	✓

The exact limits and prices are defined separately from this capability model.

3. Free

The Free plan is designed for individuals, small organizations, experimentation, and basic attendance needs.

It should provide enough functionality to understand the value of Roll SYNC without giving away the infrastructure that differentiates the paid product.

Included
Organization creation
Basic organization setup
Basic attendance contexts
Basic attendance sessions
QR attendance
Roll call
Manual attendance
Basic participant management
Basic attendance history
Basic dashboard
Limited reporting
Restrictions

The Free plan does not include:

Offline attendance synchronization
Full mobile offline functionality
API access
SDK access
Advanced integrations
Advanced analytics
Advanced automation
High-volume usage
Premium administration features

The offline feature is intentionally excluded from Free.

This creates a meaningful upgrade path because offline synchronization is one of Roll SYNC's major technical differentiators.

4. Roll SYNC Plus

Plus is the first paid tier.

It is designed for organizations that need a dependable attendance system beyond the basic free experience.

Plus introduces more of the Roll SYNC ecosystem, especially the mobile experience.

Includes Free, plus:
Full mobile application
Offline attendance
Automatic synchronization
Realtime attendance updates
Increased attendance limits
Increased participant limits
Better reporting
Data exports
Additional organization management features
More attendance configuration options

Plus should be the plan that makes Roll SYNC useful for real-world organizations without requiring advanced integrations.

5. Roll SYNC Pro

Pro is designed for organizations that are beginning to depend on Roll SYNC as infrastructure rather than simply using it as an attendance application.

Includes Plus, plus:
API access
SDK access
Advanced analytics
Advanced reporting
Integrations
Automation
Higher usage limits
Advanced permissions
Advanced organization management
Developer capabilities
Increased realtime capacity
Priority support

The key distinction is:

Plus is for organizations using Roll SYNC. Pro is for organizations building workflows around Roll SYNC.

6. Roll SYNC Ultra

Ultra is designed for large organizations and high-scale deployments.

It should focus less on adding random features and more on providing significantly higher capacity, control, reliability, and support.

Includes Pro, plus:
Highest usage limits
Large organization support
Advanced administration
Advanced integrations
Higher API limits
Higher realtime capacity
Advanced automation
Extended analytics
Enhanced operational controls
Priority infrastructure support
Premium support
Enterprise-oriented capabilities

Ultra may eventually include capabilities such as:

advanced audit controls
dedicated infrastructure options
custom retention policies
advanced security controls
organization-wide analytics
larger API quotas

These should only be introduced when there is a real customer need.

7. Custom

Custom is not simply another fixed subscription tier.

It is a capability-based plan.

Organizations can select the exact Roll SYNC capabilities they need and pay according to the selected capabilities, scale, and usage.

For example:

Custom Organization

✓ API
✓ SDK
✓ Realtime
✓ Offline
✗ Dashboard
✗ Mobile App
✓ Advanced Analytics

Another organization could use:

Custom Organization

✓ API
✗ Mobile App
✗ Roll SYNC Dashboard
✓ Realtime
✓ Integrations
✓ Automation

This allows Roll SYNC to become infrastructure for products that do not need the standard Roll SYNC application experience.

8. API-Only Customers

A particularly important Custom configuration is API-only access.

A company may not want to use the Roll SYNC web dashboard or mobile application.

Instead, it may want to integrate attendance directly into its own software.

Example:

Customer Application
        │
        ▼
Roll SYNC API
        │
        ▼
Roll SYNC Infrastructure
        │
        ▼
Attendance Data

The customer handles its own:

UI
user experience
application logic
participant interfaces

Roll SYNC provides:

attendance infrastructure
API
authentication/integration mechanisms
attendance processing
synchronization where purchased
realtime capabilities where purchased
data infrastructure

This makes Roll SYNC a B2B infrastructure product, not only an attendance application.

9. Capability-Based Entitlements

Because Custom plans can select individual capabilities, pricing should not be implemented as hard-coded checks such as:

if (organization.plan === "PRO") {
  // allow API
}

Instead, the system should resolve entitlements.

Conceptually:

Organization
      ↓
Subscription
      ↓
Plan / Custom Configuration
      ↓
Entitlements
      ↓
Feature Access

For example:

organization.entitlements

{
  attendance: true,
  mobile: true,
  offline_sync: true,
  realtime: true,
  api: true,
  sdk: true,
  analytics_advanced: false
}

The exact implementation should use normalized database structures rather than storing a large JSON object as the authoritative permission system.

10. Recommended Billing Data Model

The existing organization and attendance models should remain independent from pricing.

Introduce billing-specific concepts:

Organization
    │
    └── Subscription
            │
            ├── Plan
            │
            └── Subscription Entitlements

Conceptually:

Plan
├── FREE
├── PLUS
├── PRO
└── ULTRA

And:

Entitlement
├── attendance_basic
├── mobile
├── offline_sync
├── realtime
├── analytics_advanced
├── api
├── sdk
├── integrations
├── automation
└── ...

A subscription connects an organization to a plan.

A custom subscription can additionally enable or disable individual entitlements.

11. Custom Plan Structure

Custom plans should support something conceptually similar to:

Organization
    ↓
Subscription
    ↓
Custom Configuration
    ↓
Selected Entitlements

For example:

Organization: Example Corp

Subscription:
CUSTOM

Entitlements:
├── API
├── SDK
├── Realtime
├── Offline Sync
└── Advanced Analytics

The organization's actual feature access is determined from this configuration.

12. Entitlements vs Limits

Not everything should be represented as a simple feature toggle.

Some capabilities have limits.

For example:

API
    enabled: true
    requests_per_month: 100000

or:

Participants
    enabled: true
    maximum: 5000

or:

Organizations
    maximum_units: 50

Therefore, Roll SYNC should conceptually distinguish between:

Features
api
offline_sync
realtime
analytics

and:

Limits
api_requests
participants
attendance_records
organization_units
storage

This allows plans to control both what an organization can use and how much they can use.

13. Billing Enforcement

Feature access must be enforced by the backend.

The client may hide unavailable features, but the client is not the authority.

For example:

Mobile
   ↓
Attempt offline operation
   ↓
API
   ↓
Organization entitlement check
   ↓
Allowed / Rejected

The same applies to API access:

External Application
   ↓
API Request
   ↓
Authentication
   ↓
Subscription / Entitlement Check
   ↓
API Access

Never rely on UI restrictions to enforce billing.

14. Free-to-Paid Upgrade Path

The pricing model should create a natural progression:

FREE
  ↓
"I like this."
  ↓
PLUS
  ↓
"I need more."
  ↓
PRO
  ↓
"I depend on this."
  ↓
ULTRA

Custom exists alongside this progression for organizations whose requirements do not fit a predefined package.

15. Why Offline Is Paid

Offline synchronization is one of the most technically valuable capabilities in Roll SYNC.

It requires:

local persistence
synchronization logic
retry handling
idempotency
conflict handling
background synchronization
server reconciliation

Because of this, it should not be included in Free.

The Free tier can demonstrate the basic attendance experience while Plus introduces the full mobile/offline workflow.

This creates a strong product boundary:

Free:
"Take attendance."

Plus:
"Take attendance anywhere."

Pro:
"Connect attendance to your systems."

Ultra:
"Run attendance at scale."

Custom:
"Use exactly the Roll SYNC infrastructure you need."
16. Pricing and the Data Model

Pricing should not leak into the core attendance model.

Avoid designs such as:

attendance_session
    plan_type
    max_records
    has_api
    has_offline
    has_realtime

This couples the product domain to billing.

Instead:

Attendance
    ↓
Core product behavior

Subscription
    ↓
Billing state

Entitlements
    ↓
Allowed capabilities

Usage
    ↓
Consumption / limits

This separation allows pricing to change without redesigning attendance.

17. Usage Tracking

Some future pricing dimensions may depend on usage.

Potential usage metrics include:

attendance_records
api_requests
active_participants
storage
realtime_connections
offline_sync_operations
organization_units

Usage should be tracked separately from the attendance domain.

For example:

Attendance Record
        ↓
Usage Event
        ↓
Usage Aggregation
        ↓
Billing

The exact billing implementation should avoid making every attendance request perform expensive billing calculations synchronously.

Where appropriate, usage aggregation can be handled asynchronously.

18. Billing Provider

Roll SYNC uses Polar for subscription and payment infrastructure.

The backend should treat the billing provider as the external billing authority while maintaining the application's local representation of subscription state.

Conceptually:

Polar
  ↓
Webhook
  ↓
Roll SYNC API
  ↓
Subscription State
  ↓
Entitlements

Clients should not communicate directly with the billing provider to determine whether a feature is available.

19. Billing Webhooks

Subscription changes should be processed through verified billing events.

Examples:

Subscription Created
Subscription Updated
Subscription Cancelled
Subscription Renewed
Payment Failed
Subscription Expired

Webhook processing must be idempotent.

Receiving the same event more than once should not corrupt subscription state.

20. Product Principle

Roll SYNC should never feel like it is artificially disabling basic attendance just to force payment.

The free tier should genuinely be useful.

Paid plans should charge for:

scale
reliability
automation
integrations
offline infrastructure
developer access
advanced capabilities
operational control

The strongest monetization opportunity is therefore not:

"Pay us to mark attendance."

It is:

"Pay us to make attendance infrastructure disappear into your workflow."

21. Long-Term Business Model

Roll SYNC can eventually generate revenue from multiple directions:

Subscriptions
    ↓
Plus / Pro / Ultra

Infrastructure
    ↓
API / SDK / Integrations

Usage
    ↓
API requests / attendance / storage

Enterprise
    ↓
Custom deployments / advanced controls

Platform
    ↓
Third-party applications built on Roll SYNC

This allows Roll SYNC to evolve from an attendance application into an attendance infrastructure platform.

22. Pricing Summary
FREE
Basic attendance
No offline
No API
No SDK
Limited scale

PLUS
Full attendance experience
Mobile
Offline
Realtime
More scale

PRO
Everything in Plus
API
SDK
Integrations
Advanced analytics
Automation

ULTRA
Everything in Pro
High scale
Advanced administration
Premium support
Enterprise capabilities

CUSTOM
Choose capabilities
Choose infrastructure
Choose limits
API-only supported
Custom pricing

The pricing model should remain flexible enough for the product to evolve without requiring changes to the core attendance data model.