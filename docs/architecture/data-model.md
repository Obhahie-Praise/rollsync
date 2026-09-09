Absolutely. And I’d make one important correction from the pricing discussion:

**We don't need to redesign the core attendance data model.** We need to add a **billing + entitlement model alongside it**.

That gives us enough flexibility for Free/Plus/Pro/Ultra **and** arbitrary Custom plans without contaminating `Organization`, `AttendanceSession`, etc. with pricing logic.

````md
# Roll SYNC — Billing & Entitlement Data Model

This document defines the data model used to represent Roll SYNC subscriptions, plans, feature entitlements, usage limits, and custom pricing configurations.

The billing model is intentionally separated from the core product model.

The attendance system should not need to know whether an organization is on Free, Plus, Pro, Ultra, or Custom.

Instead:

```text
Organization
      │
      ▼
Subscription
      │
      ├── Plan
      │
      └── Entitlements
              │
              ├── Features
              └── Limits
````

This allows pricing to evolve without requiring changes to the core attendance domain.

---

# 1. Design Goals

The billing model must support:

* Fixed subscription plans
* Custom plans
* Feature-based pricing
* Usage-based limits
* API-only customers
* Optional capabilities
* Plan upgrades
* Plan downgrades
* Subscription cancellation
* Subscription expiration
* Billing-provider synchronization
* Future pricing changes without database redesign

The model should remain intentionally small.

---

# 2. Core Concepts

The billing system is built around six concepts:

```text
Organization
Subscription
Plan
Entitlement
Subscription Entitlement
Usage
```

They serve different purposes.

### Organization

The customer that owns the subscription.

### Subscription

The organization's current commercial relationship with Roll SYNC.

### Plan

A predefined pricing package such as Free, Plus, Pro, or Ultra.

### Entitlement

A capability or limit that can be granted to an organization.

### Subscription Entitlement

The actual capabilities granted to a specific subscription.

### Usage

The amount of a metered resource an organization has consumed.

---

# 3. Organization

`Organization` already exists as part of the core Roll SYNC data model.

Billing should reference the organization rather than duplicating organization information.

```text
Organization
    │
    └── Subscription
```

An organization should normally have one active subscription at a time.

Historical subscriptions may remain stored for billing history.

---

# 4. Plan

A `Plan` represents a predefined Roll SYNC offering.

Initial plans:

```text
FREE
PLUS
PRO
ULTRA
CUSTOM
```

A plan contains commercial configuration and a collection of default entitlements.

Conceptually:

```text
Plan
├── name
├── code
├── description
├── price
├── currency
├── billing_interval
├── active
└── entitlements
```

The plan itself should not contain organization-specific state.

---

# 5. Plan Codes

Plan codes should be stable internal identifiers.

```text
FREE
PLUS
PRO
ULTRA
CUSTOM
```

Display names may change without requiring database migrations.

For example:

```text
Internal:
PLUS

Display:
Roll SYNC Plus
```

---

# 6. Subscription

A `Subscription` represents an organization's actual subscription.

Conceptually:

```text
Subscription
├── organization_id
├── plan_id
├── status
├── provider
├── provider_subscription_id
├── current_period_start
├── current_period_end
├── cancel_at_period_end
├── created_at
└── updated_at
```

Possible statuses:

```text
TRIALING
ACTIVE
PAST_DUE
CANCELED
EXPIRED
INCOMPLETE
```

The exact status set may evolve with the billing provider.

---

# 7. Billing Provider

Roll SYNC uses Polar as its billing provider.

The database should store the provider identifiers necessary to reconcile local subscription state with Polar.

Conceptually:

```text
Subscription
    │
    └── provider_subscription_id
```

The provider remains responsible for payment processing.

Roll SYNC maintains its own local subscription state for authorization and feature enforcement.

---

# 8. Entitlement

An `Entitlement` represents something an organization can be allowed to use.

An entitlement can represent either:

1. A capability
2. A measurable limit

Examples of capabilities:

```text
MOBILE
OFFLINE_SYNC
REALTIME
API
SDK
ADVANCED_ANALYTICS
INTEGRATIONS
AUTOMATION
```

Examples of limits:

```text
ATTENDANCE_RECORDS
PARTICIPANTS
API_REQUESTS
STORAGE
ORGANIZATION_UNITS
REALTIME_CONNECTIONS
```

---

# 9. Capability Entitlements

Capability entitlements behave like feature flags.

Example:

```text
offline_sync
enabled = true
```

An organization either has the capability or does not.

Examples:

```text
mobile
offline_sync
realtime
api
sdk
advanced_analytics
integrations
automation
```

---

# 10. Limit Entitlements

Some entitlements represent a quantity rather than a simple on/off capability.

Example:

```text
API_REQUESTS
value = 100000
period = MONTH
```

Another example:

```text
PARTICIPANTS
value = 5000
period = NONE
```

This allows plans to define different limits without creating separate columns for every possible limit.

---

# 11. Entitlement Structure

Conceptually, an entitlement should contain:

```text
Entitlement
├── key
├── name
├── description
├── type
└── active
```

Possible types:

```text
BOOLEAN
LIMIT
```

Example:

```text
Entitlement

key:
offline_sync

type:
BOOLEAN
```

Another:

```text
Entitlement

key:
api_requests

type:
LIMIT
```

---

# 12. Plan Entitlements

A plan defines its default entitlements through a relationship with `Entitlement`.

Conceptually:

```text
Plan
    │
    ├── Entitlement
    ├── Entitlement
    ├── Entitlement
    └── Entitlement
```

Example:

```text
PLUS
├── mobile = true
├── offline_sync = true
├── realtime = true
├── api = false
└── api_requests = 0
```

Pro:

```text
PRO
├── mobile = true
├── offline_sync = true
├── realtime = true
├── api = true
├── sdk = true
└── api_requests = 100000
```

---

# 13. Subscription Entitlements

A predefined plan provides defaults.

However, Custom subscriptions need to override or selectively enable capabilities.

Therefore the actual entitlement state should be associated with the subscription.

```text
Subscription
      │
      └── SubscriptionEntitlement
```

This represents what the organization actually has access to.

This distinction is important:

```text
Plan
    ↓
Default configuration

Subscription
    ↓
Actual configuration
```

---

# 14. Custom Plans

Custom plans use the same entitlement system.

Instead of:

```text
CUSTOM = one fixed package
```

Custom means:

```text
CUSTOM
    ↓
Select capabilities
    ↓
Configure limits
    ↓
Calculate price
```

Example:

```text
Organization: Example Corp

Plan:
CUSTOM

Entitlements:
├── API = true
├── SDK = true
├── REALTIME = true
├── OFFLINE_SYNC = false
├── MOBILE = false
└── API_REQUESTS = 500000
```

This organization is paying for Roll SYNC infrastructure without necessarily using the Roll SYNC applications.

---

# 15. API-Only Customers

API-only customers are a first-class Custom configuration.

Example:

```text
CUSTOM

API             ✓
SDK             ✓
Realtime        ✓
Web Dashboard   ✗
Mobile          ✗
Offline Sync    optional
```

The customer can integrate Roll SYNC into their own application.

```text
Customer App
      │
      ▼
Roll SYNC SDK
      │
      ▼
Roll SYNC API
      │
      ▼
Roll SYNC Infrastructure
```

The billing system only needs to grant the appropriate API/SDK entitlements.

It should not require a separate `ApiOnlyCustomer` model.

---

# 16. Entitlement Overrides

A subscription may override a plan's default entitlement.

For example:

```text
PRO

api_requests = 100000
```

A negotiated customer contract may become:

```text
PRO

api_requests = 500000
```

The subscription-level entitlement overrides the plan default.

This allows sales/custom contracts without creating new plans.

---

# 17. Entitlement Resolution

The backend should resolve an organization's effective entitlements.

Conceptually:

```text
Plan Defaults
      +
Subscription Overrides
      ↓
Effective Entitlements
```

For example:

```text
Plan:
PRO

Default:
offline_sync = true
api = true
api_requests = 100000

Subscription Override:
api_requests = 500000

Effective:
offline_sync = true
api = true
api_requests = 500000
```

The clients should not perform this calculation.

The backend is authoritative.

---

# 18. Feature Checks

Backend code should check capabilities through an entitlement service rather than checking plan names.

Avoid:

```ts
if (subscription.plan === "PRO") {
  allowApi();
}
```

Prefer:

```ts
if (entitlements.has("api")) {
  allowApi();
}
```

This matters because a Custom customer may have API access without being on Pro.

---

# 19. Limit Checks

Limits should work similarly.

Avoid:

```ts
if (subscription.plan === "PRO") {
  maxApiRequests = 100000;
}
```

Prefer:

```ts
const limit = entitlements.getLimit("api_requests");
```

The application can then enforce the resolved limit.

---

# 20. Usage

Usage represents how much of a metered resource has been consumed.

Potential usage metrics:

```text
ATTENDANCE_RECORDS
API_REQUESTS
STORAGE
ACTIVE_PARTICIPANTS
REALTIME_CONNECTIONS
OFFLINE_SYNC_OPERATIONS
```

Usage should remain separate from the actual product records.

For example:

```text
Attendance Record
      ↓
Usage Event
      ↓
Usage Aggregation
```

The attendance record remains part of the attendance domain.

---

# 21. Usage Periods

Some limits reset periodically.

For example:

```text
API requests:
100,000 / month
```

Usage should therefore support a billing period.

Conceptually:

```text
Usage
├── organization_id
├── metric
├── period_start
├── period_end
└── quantity
```

Example:

```text
Organization:
org_123

Metric:
API_REQUESTS

Period:
August 1 → August 31

Quantity:
72,431
```

---

# 22. Usage Events

For high-volume systems, usage may be recorded as events before being aggregated.

Conceptually:

```text
API Request
    ↓
Usage Event
    ↓
Queue
    ↓
Usage Aggregation
    ↓
Usage Record
```

This prevents billing calculations from unnecessarily slowing down core application requests.

---

# 23. Pricing vs Entitlements

Pricing and entitlements are intentionally separate.

A price answers:

> "How much does this configuration cost?"

An entitlement answers:

> "What can this organization use?"

Therefore:

```text
Price
    ≠
Feature Access
```

This allows Roll SYNC to change pricing without changing application logic.

---

# 24. Price Configuration

Commercial pricing may eventually need to support:

```text
Monthly price
Annual price
Usage-based pricing
Per-seat pricing
Per-request pricing
Custom pricing
```

These values should not be hard-coded into feature checks.

The billing provider can remain responsible for actual payment processing while Roll SYNC stores the subscription and entitlement state needed by the application.

---

# 25. Plan Versioning

Plans may change over time.

For example:

```text
Plus 2026
```

may have different limits from:

```text
Plus 2027
```

Existing customers should not unexpectedly inherit new limits simply because the marketing configuration changed.

The system should therefore be designed so plan configuration can be versioned or snapshotted when necessary.

The implementation should favor the simplest approach that preserves existing customer contracts.

---

# 26. Subscription Lifecycle

A subscription generally follows:

```text
CREATED
   ↓
ACTIVE
   ↓
RENEWED
   ↓
ACTIVE
```

or:

```text
ACTIVE
   ↓
CANCEL REQUESTED
   ↓
CANCELED
```

or:

```text
ACTIVE
   ↓
PAYMENT FAILURE
   ↓
PAST_DUE
   ↓
ACTIVE / EXPIRED
```

Billing webhooks update local subscription state.

---

# 27. Webhook Idempotency

Billing events may be delivered more than once.

The backend must therefore process webhook events idempotently.

Conceptually:

```text
Provider Event
      ↓
Event ID
      ↓
Already processed?
    /       \
  YES        NO
   ↓          ↓
Ignore      Process
              ↓
        Mark processed
```

A duplicate webhook must not:

* create duplicate subscriptions
* duplicate entitlements
* incorrectly downgrade an organization
* corrupt billing state

---

# 28. Billing Data Model

The resulting relationship can be summarized as:

```text
Organization
    │
    └── Subscription
            │
            ├── Plan
            │
            └── SubscriptionEntitlement
                    │
                    └── Entitlement


Organization
    │
    └── Usage
```

With plan defaults:

```text
Plan
  │
  └── PlanEntitlement
          │
          └── Entitlement
```

Therefore:

```text
                PLAN
                 │
        ┌────────┴────────┐
        ▼                 ▼
 PlanEntitlements    Pricing
        │
        ▼
  Entitlements
        ▲
        │
 SubscriptionEntitlements
        │
        ▼
 SUBSCRIPTION
        │
        ▼
 ORGANIZATION
```

---

# 29. Example: Free

```text
Organization
    ↓
Subscription
    ↓
Plan: FREE
    ↓
Entitlements

attendance_basic       ✓
qr_attendance           ✓
roll_call               ✓
manual_attendance       ✓
mobile                  limited
offline_sync            ✗
realtime                limited
advanced_analytics      ✗
api                     ✗
sdk                     ✗
```

---

# 30. Example: Plus

```text
Organization
    ↓
Subscription
    ↓
Plan: PLUS
    ↓
Entitlements

attendance_basic       ✓
mobile                  ✓
offline_sync            ✓
realtime                ✓
exports                 ✓
advanced_analytics      limited
api                     ✗
sdk                     ✗
```

---

# 31. Example: Pro

```text
Organization
    ↓
Subscription
    ↓
Plan: PRO
    ↓
Entitlements

attendance_basic       ✓
mobile                  ✓
offline_sync            ✓
realtime                ✓
advanced_analytics      ✓
api                     ✓
sdk                     ✓
integrations            ✓
automation              ✓
```

---

# 32. Example: Custom API-Only

```text
Organization
    ↓
Subscription
    ↓
Plan: CUSTOM
    ↓
Selected Entitlements

api                     ✓
sdk                     ✓
realtime                ✓
offline_sync            ✗
mobile                  ✗
dashboard               ✗
api_requests            500000 / month
```

The customer can therefore use Roll SYNC as infrastructure without subscribing to the standard application experience.

---

# 33. Why This Model Works

This model prevents pricing from leaking into the rest of the application.

The attendance system does not care:

```text
Free?
Plus?
Pro?
Ultra?
Custom?
```

It only asks:

```text
Does this organization have offline_sync?
Does this organization have api?
What is its api_requests limit?
```

This is the correct separation.

```text
PRODUCT DOMAIN
    │
    ├── Organizations
    ├── People
    ├── Attendance
    ├── Sessions
    └── Events
           
BILLING DOMAIN
    │
    ├── Plans
    ├── Subscriptions
    ├── Entitlements
    └── Usage
```

The two domains interact through **entitlement checks**, not through pricing-specific fields scattered throughout the product.

---

# 34. Core Rule

The most important rule of the billing architecture is:

> **Plans define defaults. Subscriptions define what an organization actually has. Entitlements define capabilities. Usage defines consumption.**

This allows Roll SYNC to support:

```text
FREE
PLUS
PRO
ULTRA
CUSTOM
```

without creating a separate data model for every pricing configuration.

It also gives Roll SYNC a clean path from an attendance application into an attendance infrastructure platform.

```
```
