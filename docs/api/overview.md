````md
# Roll SYNC API — Overview

The Roll SYNC API is the central interface through which the Roll SYNC platform exposes its attendance infrastructure.

It is used by:

- The Roll SYNC web application
- The Roll SYNC mobile application
- The Roll SYNC SDK
- Third-party applications
- Customer-built systems
- Future integrations and automation

The API is not an extension of the web application.

It is an independent backend interface that all Roll SYNC clients can consume.

```text
                         ┌─────────────────┐
                         │   Roll SYNC API │
                         │                 │
                         │  Authentication │
                         │  Authorization  │
                         │  Attendance     │
                         │  Organizations  │
                         │  Billing        │
                         │  Realtime       │
                         │  Integrations   │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
            Web                Mobile              SDK/API
````

---

# 1. API Philosophy

The Roll SYNC API follows one core principle:

> **Build the infrastructure once, then let every client decide how to use and present it.**

The backend should not care whether a request came from:

```text
Web
Mobile
SDK
Third-party application
```

The backend provides consistent business rules and data.

The client determines:

* How information is displayed
* How users interact with it
* How local state is managed
* How offline behavior is presented
* How the user experience is implemented

---

# 2. What the API Owns

The API is responsible for the core Roll SYNC business logic.

This includes:

* Authentication
* Authorization
* Organization management
* Organization memberships
* People
* Attendance contexts
* Attendance sessions
* Attendance records
* Attendance methods
* Participant management
* Reporting
* Integrations
* API credentials
* SDK access
* Subscription state
* Entitlements
* Usage limits
* Realtime events
* Background processing

The API is the authoritative source for these operations.

---

# 3. What the API Does Not Own

The API should not contain client-specific presentation logic.

For example, the API should not know whether the mobile application displays:

```text
A card
A list
A bottom sheet
A notification
A modal
```

Similarly, it should not dictate how the web dashboard is visually structured.

The backend returns structured data and meaningful errors.

Clients decide how that information is rendered.

---

# 4. API Consumers

## Web Application

The web application uses the API for:

* Dashboard data
* Organization management
* Attendance management
* Session management
* Reports
* Billing
* Administration

```text
Web
 ↓
Roll SYNC API
 ↓
Database / Services
```

---

## Mobile Application

The mobile application uses the API for:

* Authentication
* Organization data
* Attendance
* Session information
* Participant information
* Synchronization
* Realtime updates

The mobile application also maintains local state for offline functionality.

```text
Mobile
 ├── Local Storage
 ├── Offline Queue
 │
 └── Roll SYNC API
```

---

## SDK

The SDK provides a developer-friendly interface over the API.

```text
Customer Application
        ↓
Roll SYNC SDK
        ↓
Roll SYNC API
```

The SDK should simplify:

* Authentication
* Request construction
* Type safety
* Error handling
* Pagination
* Webhooks/integrations where applicable

The SDK does not replace the API.

---

## Third-Party Applications

Customers may consume the API directly without using the official SDK.

```text
Customer Backend
       ↓
Roll SYNC API
```

This is especially important for Custom API-only subscriptions.

---

# 5. API Architecture

The backend is a standalone server application.

The API should not be implemented as a collection of Next.js API routes.

The intended architecture is:

```text
apps/
├── web
├── mobile
└── api

packages/
├── ...
```

The API application owns the backend runtime.

The web and mobile applications are clients of that API.

---

# 6. Backend Responsibilities

The API server is responsible for:

```text
HTTP / API
     ↓
Authentication
     ↓
Authorization
     ↓
Entitlements
     ↓
Validation
     ↓
Business Logic
     ↓
Persistence
     ↓
Events / Jobs
```

It coordinates the infrastructure required by Roll SYNC.

---

# 7. API Design Style

The initial API should use a versioned REST-style architecture.

Example:

```text
/api/v1/organizations
/api/v1/attendance/sessions
/api/v1/attendance/records
/api/v1/people
```

REST is preferred for the MVP because it is:

* Easy to understand
* Easy to consume
* Easy to debug
* Well supported across platforms
* Suitable for the SDK
* Suitable for third-party integrations

The API should avoid unnecessary abstraction.

---

# 8. API Versioning

The API should be versioned from the beginning.

The initial version is:

```text
v1
```

Example:

```text
/api/v1/attendance/sessions
```

Future breaking changes can then be introduced through:

```text
/api/v2/...
```

The goal is to avoid breaking customer integrations unexpectedly.

---

# 9. Resource-Oriented Design

API endpoints should represent meaningful resources.

Examples:

```text
organizations
memberships
people
attendance
sessions
events
api-keys
subscriptions
```

Avoid endpoints that expose internal implementation details.

Prefer:

```text
POST /api/v1/attendance/sessions
```

over:

```text
POST /api/v1/createAttendanceSessionRecord
```

---

# 10. Attendance API

Attendance is the primary API domain.

The API should support operations such as:

```text
Create attendance context
Create attendance session
Open session
Close session
Record attendance
Retrieve attendance
Modify attendance
List attendance records
Export attendance
```

Example:

```text
POST /api/v1/attendance/sessions
```

creates a session.

```text
POST /api/v1/attendance/sessions/:id/records
```

records attendance.

```text
GET /api/v1/attendance/sessions/:id/records
```

retrieves attendance records.

---

# 11. Attendance Methods

The API supports multiple attendance methods.

Examples:

```text
QR
MOBILE
ROLL_CALL
ID_SCAN
MANUAL
IMPORT
```

The method is part of the attendance operation rather than a separate backend architecture.

```text
Attendance Request
       ↓
method = QR
       ↓
Attendance Validation
       ↓
Attendance Record
```

This allows additional methods to be introduced without creating separate attendance systems.

---

# 12. QR Attendance API

QR attendance requires the backend to generate and validate attendance sessions.

The QR payload should contain enough information to resolve the intended session but should not itself be treated as proof of attendance.

Typical flow:

```text
Organizer
   ↓
Create/Open Session
   ↓
Generate QR
   ↓
Participant Scans
   ↓
API Resolves Session
   ↓
Authentication / Identity
   ↓
Validation
   ↓
Attendance Record
```

The backend remains responsible for determining whether the scan is valid.

---

# 13. Mobile Attendance API

Mobile clients can submit attendance through the same API.

Online:

```text
Mobile
 ↓
POST attendance
 ↓
API
 ↓
Database
```

Offline:

```text
Mobile
 ↓
Local Queue
 ↓
Network Available
 ↓
POST attendance
 ↓
API
 ↓
Database
```

The API must therefore support idempotent attendance operations.

---

# 14. Idempotency

Any operation that may be retried must support idempotency where duplicate execution could cause incorrect state.

This is especially important for:

* Offline synchronization
* Mobile requests
* API integrations
* Payment webhooks
* Background jobs

An attendance operation should contain a client-generated unique operation identifier where appropriate.

```text
operationId
      ↓
API
      ↓
Already processed?
   /          \
 YES           NO
  ↓             ↓
Return       Process
existing     operation
result
```

This prevents duplicate attendance records.

---

# 15. Offline Synchronization API

The API provides the server-side side of the offline synchronization system.

The mobile client owns:

* Local persistence
* Pending operation queue
* Retry scheduling
* Local state

The API owns:

* Authentication
* Authorization
* Validation
* Idempotency
* Conflict resolution
* Server persistence
* Final state

```text
Mobile Local Queue
       ↓
Sync API
       ↓
Validate
       ↓
Accept / Reject / Conflict
       ↓
Mobile Reconciliation
```

Detailed behavior is defined in `offline-sync.md`.

---

# 16. Realtime

Realtime functionality is built on top of the API's authoritative data.

Example:

```text
Participant
    ↓
Attendance API
    ↓
Database
    ↓
Realtime Event
    ↓
Organizer Dashboard
```

Realtime should not bypass normal business validation.

The API/database remains the source of truth.

Detailed realtime behavior is defined in `realtime.md`.

---

# 17. Authentication

Protected API requests require authentication unless an endpoint is explicitly public.

Supported authentication mechanisms may include:

```text
Web Session
Mobile Session / Token
API Key
OAuth
```

The authentication mechanism depends on the client.

After authentication, the API resolves an authenticated principal.

```text
Request
 ↓
Authenticate
 ↓
Principal
 ↓
Authorize
 ↓
Execute
```

Detailed authentication behavior is defined in `authentication.md`.

---

# 18. Authorization

Authentication alone does not grant access.

The API checks:

```text
Identity
 ↓
Organization Membership
 ↓
Role / Permission
 ↓
Resource Access
 ↓
Entitlement
```

For example, an authenticated user may still be unable to access an organization's attendance records if they are not a member of that organization.

---

# 19. Entitlements

API access is also affected by the organization's subscription.

For example:

```text
Authenticated
      ↓
Organization Membership ✓
      ↓
Permission ✓
      ↓
API Entitlement ✓
      ↓
Request Allowed
```

A Custom API-only customer can therefore use the API without using the Roll SYNC web or mobile applications.

The API checks capabilities rather than hard-coding plan names.

Prefer:

```text
hasEntitlement("api")
```

over:

```text
plan === "PRO"
```

---

# 20. Validation

All external input must be validated at the API boundary.

Validation applies to:

* Request bodies
* Query parameters
* Path parameters
* Headers
* API credentials
* Imported data

Invalid input should produce consistent client errors.

The API should never assume that a request from an official Roll SYNC client is trustworthy.

---

# 21. Error Format

API errors should use a consistent structure.

Conceptually:

```json
{
  "error": {
    "code": "ATTENDANCE_SESSION_CLOSED",
    "message": "This attendance session is closed."
  }
}
```

Error codes should be stable enough for SDKs and third-party applications to handle programmatically.

Human-readable messages may change.

---

# 22. HTTP Status Codes

The API should use conventional HTTP status codes.

Examples:

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests

500 Internal Server Error
```

The exact status should reflect the meaning of the failure.

---

# 23. Pagination

Collection endpoints should support pagination.

Example:

```text
GET /api/v1/people?limit=50&cursor=...
```

Cursor-based pagination is preferred for large or frequently changing datasets.

Responses should provide enough information for the client to request the next page.

Conceptually:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": "..."
  }
}
```

---

# 24. Filtering

Collection endpoints should support useful filtering without creating specialized endpoints for every query.

Example:

```text
GET /api/v1/attendance/records
  ?sessionId=...
  &status=PRESENT
```

Filtering should remain predictable and documented.

---

# 25. Sorting

Where useful, collection endpoints may support controlled sorting.

Example:

```text
?sort=createdAt
?sort=-createdAt
```

Clients should not be able to request arbitrary database fields.

Supported sorting fields must be explicitly defined by the endpoint.

---

# 26. Rate Limiting

API requests should be rate-limited.

Rate limits may depend on:

* Authentication type
* Organization
* API key
* Endpoint
* Subscription
* Usage entitlement

For example:

```text
Free
 ↓
Low API limits

Pro
 ↓
Higher API limits

Custom
 ↓
Negotiated limits
```

Rate limiting protects Roll SYNC infrastructure and provides a basis for usage-based pricing.

---

# 27. Background Jobs

Long-running or asynchronous operations should not block normal API requests.

Examples include:

```text
Large imports
Large exports
Usage aggregation
Report generation
Webhook processing
Notification processing
Synchronization tasks
```

The API should enqueue these operations into the backend job system.

```text
API
 ↓
Redis / Queue
 ↓
Worker
 ↓
Job
 ↓
Database / External Service
```

The API should return a job identifier where appropriate.

---

# 28. API and Queue Separation

The API server and background workers are separate responsibilities even if they initially run on the same infrastructure.

```text
                 ┌──────────────┐
                 │   API Server │
                 └──────┬───────┘
                        │
                        ▼
                    Job Queue
                        │
                        ▼
                 ┌──────────────┐
                 │    Worker    │
                 └──────────────┘
```

This allows workers to scale independently later.

---

# 29. Database

The API is the primary application layer responsible for interacting with the database.

The database is PostgreSQL hosted through Neon.

Clients must never connect directly to the production database.

```text
Web ────────┐
Mobile ─────┼──► API ───► PostgreSQL
SDK ────────┘
```

Database access belongs inside the backend.

---

# 30. ORM

Prisma is used by the backend application as the ORM/data-access layer.

The client applications do not use Prisma.

```text
Web
 ↓
API

Mobile
 ↓
API

SDK
 ↓
API

API
 ↓
Prisma
 ↓
PostgreSQL
```

This keeps the database schema and business rules centralized.

---

# 31. File Storage

Files are stored using UploadThing where file storage is required.

The API coordinates access to stored files.

Potential file use cases include:

* Organization assets
* Event assets
* Imports
* Exports
* Generated reports

The database stores metadata and references rather than unnecessarily storing large files directly.

---

# 32. Payments

Subscription and payment infrastructure is handled through Polar.

The API integrates with Polar to synchronize:

```text
Subscriptions
Plans
Payments
Billing state
```

Billing events enter Roll SYNC through verified webhooks.

```text
Polar
 ↓
Webhook
 ↓
Roll SYNC API
 ↓
Subscription State
 ↓
Entitlements
```

---

# 33. Webhooks

The API may expose webhook endpoints for trusted external services.

Examples:

```text
POST /api/v1/webhooks/polar
```

Webhook requests must be verified before processing.

Webhook handlers should be idempotent.

---

# 34. API Keys

Organizations with API access can create API credentials.

Conceptually:

```text
Organization
 ↓
API Key
 ↓
Scopes
 ↓
API Request
```

API keys should support:

* Creation
* Revocation
* Rotation
* Scopes
* Usage tracking

Raw secrets should not be unnecessarily stored.

---

# 35. SDK Compatibility

The API should be designed with SDK generation and maintenance in mind.

Responses should be:

* Predictable
* Consistently structured
* Strongly typed
* Versioned
* Explicit about errors

The SDK should not need to understand internal database structures.

It should only interact with public API contracts.

---

# 36. API Contract

The API contract is the boundary between Roll SYNC and its consumers.

Changing an internal implementation should not require changing the API.

For example:

```text
Prisma
 ↓
Database
```

may change internally without requiring customers to change:

```text
GET /api/v1/attendance/sessions
```

The API contract should therefore be treated as a public product surface.

---

# 37. Security Boundary

The API is the security boundary of Roll SYNC.

No client should be trusted to enforce:

```text
Authentication
Authorization
Billing
Entitlements
Attendance validity
Organization isolation
Permissions
```

The backend performs the final validation.

```text
             CLIENT
                │
                ▼
        ┌───────────────┐
        │   ROLL SYNC   │
        │      API      │
        ├───────────────┤
        │ Auth          │
        │ Authorization │
        │ Entitlements  │
        │ Validation    │
        │ Business Logic│
        └───────┬───────┘
                │
                ▼
             DATA
```

---

# 38. API Request Lifecycle

A typical protected request follows:

```text
Request
  ↓
Routing
  ↓
Rate Limiting
  ↓
Authentication
  ↓
Organization Resolution
  ↓
Authorization
  ↓
Entitlement Check
  ↓
Input Validation
  ↓
Business Logic
  ↓
Database / Service
  ↓
Response
```

Not every endpoint requires every stage, but protected resource operations should follow this general model.

---

# 39. Attendance Request Example

A QR attendance request may conceptually follow:

```text
Participant scans QR
        ↓
Mobile/Web Client
        ↓
POST /api/v1/attendance/records
        ↓
Authenticate
        ↓
Resolve Participant
        ↓
Resolve Session
        ↓
Check Organization Access
        ↓
Check Session Status
        ↓
Validate Attendance Method
        ↓
Check Duplicate
        ↓
Create Attendance Record
        ↓
Publish Realtime Event
        ↓
Return Result
```

The client receives the final result from the API.

---

# 40. API Design Principles

The API follows these principles:

### 1. Backend authoritative

The API owns business truth.

### 2. Client agnostic

Web, mobile, and SDK clients consume the same backend.

### 3. Versioned

Breaking API changes require a new version.

### 4. Strongly typed

Public contracts should have explicit types.

### 5. Idempotent where necessary

Retries must not corrupt state.

### 6. Secure by default

Protected resources require authentication and authorization.

### 7. Organization-aware

Data access is scoped to the correct organization.

### 8. Entitlement-aware

Paid capabilities are enforced server-side.

### 9. Asynchronous when appropriate

Long-running operations use background jobs.

### 10. Integration-friendly

The API is a first-class product surface, not merely an internal endpoint collection.

---

# 41. API Surface Summary

The initial API is expected to contain domains such as:

```text
/api/v1/auth
/api/v1/organizations
/api/v1/memberships
/api/v1/people
/api/v1/attendance
/api/v1/events
/api/v1/reports
/api/v1/api-keys
/api/v1/integrations
/api/v1/subscriptions
/api/v1/usage
/api/v1/webhooks
```

The exact endpoint structure may evolve during implementation.

The important boundary is that each API domain represents a clear business capability.

---

# 42. Source of Truth

Roll SYNC has one authoritative backend.

```text
                 ┌──────────┐
                 │   WEB    │
                 └────┬─────┘
                      │
                 ┌────▼─────┐
                 │          │
                 │   API    │
                 │          │
                 └────┬─────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Database      Queue      Services
          │
          ▼
     Authoritative
        State
```

The mobile application's local database is **not** the source of truth.

The web application's state is **not** the source of truth.

The SDK is **not** the source of truth.

The API and its backend infrastructure are authoritative.

---

# 43. Final Architecture Principle

Roll SYNC is ultimately three client surfaces powered by one backend platform:

```text
             ┌─────────────────┐
             │      WEB        │
             └────────┬────────┘
                      │
             ┌────────▼────────┐
             │                 │
             │   ROLL SYNC     │
             │      API        │
             │                 │
             │  Core Backend   │
             │                 │
             └────────┬────────┘
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
         MOBILE              SDK
             │                 │
       Local / Offline    Third-Party Apps
             │                 │
             └────────┬────────┘
                      ▼
                Roll SYNC Data
```

The web and mobile applications are clients.

The SDK is an integration layer.

The API is the platform.

> **Roll SYNC is not three applications sharing code. It is one attendance infrastructure platform with multiple ways to interact with it.**

```
```
