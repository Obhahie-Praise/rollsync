# Roll SYNC — System Architecture

> **Architecture specification for the Roll SYNC platform**

## 1. Architecture Overview

Roll SYNC is a distributed, cross-platform attendance infrastructure composed of three primary client surfaces and a shared backend platform:

```text
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                             │
│                                                             │
│   ┌────────────┐      ┌────────────┐      ┌─────────────┐  │
│   │    WEB     │      │   MOBILE   │      │ THIRD-PARTY │  │
│   │  Next.js   │      │ Expo/RN    │      │  SDK / API  │  │
│   └─────┬──────┘      └─────┬──────┘      └──────┬──────┘  │
│         │                    │                    │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                         HTTPS / WebSocket
                               │
                               ▼
                    ┌─────────────────────┐
                    │     API GATEWAY     │
                    │       NestJS        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ▼                ▼                 ▼
       ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
       │ PostgreSQL  │  │    Redis    │  │  External    │
       │    Neon     │  │   BullMQ    │  │  Services    │
       └─────────────┘  └──────┬──────┘  └──────────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │    WORKER    │
                       │    NestJS    │
                       └──────────────┘
```

The architecture is intentionally centered around the API.

The Web and Mobile applications are clients of the backend rather than independent applications with their own backend logic.

Third-party applications consume the same backend through the public API and SDK.

---

# 2. Architectural Goals

The system is designed around the following requirements:

1. **One backend for every client**
2. **Strict separation between clients and infrastructure**
3. **Offline-first mobile operation**
4. **Reliable synchronization**
5. **Realtime attendance updates**
6. **Asynchronous background processing**
7. **Strong typing across the monorepo**
8. **Public API and SDK support**
9. **Multi-tenant organization architecture**
10. **Secure authentication and authorization**
11. **Horizontal scalability**
12. **Simple local development**
13. **Deployable services independently**
14. **Replaceable infrastructure components**

The architecture should allow a new client to be added without redesigning the core system.

For example:

```text
Web
Mobile
SDK
Desktop
Hardware
School Management System
Event Platform
```

should all be able to communicate with the same Roll SYNC backend.

---

# 3. Architectural Layers

Roll SYNC is divided into several logical layers.

```text
┌──────────────────────────────────────────────┐
│                 CLIENT LAYER                 │
│ Web / Mobile / SDK / Integrations            │
├──────────────────────────────────────────────┤
│                  API LAYER                   │
│ HTTP API / WebSockets / Authentication       │
├──────────────────────────────────────────────┤
│                DOMAIN LAYER                  │
│ Attendance / Events / Organizations          │
├──────────────────────────────────────────────┤
│             APPLICATION LAYER                │
│ Use cases / orchestration / policies         │
├──────────────────────────────────────────────┤
│            INFRASTRUCTURE LAYER              │
│ Database / Redis / Storage / Billing         │
├──────────────────────────────────────────────┤
│            ASYNC PROCESSING                  │
│ BullMQ / Redis / Workers                     │
└──────────────────────────────────────────────┘
```

The important principle is that business logic should not be coupled directly to a specific client.

---

# 4. Monorepo Architecture

The repository uses pnpm workspaces and Turborepo.

```text
roll-sync/
│
├── apps/
│   ├── web/
│   ├── mobile/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── database/
│   ├── sdk/
│   ├── types/
│   ├── validation/
│   ├── eslint-config/
│   └── typescript-config/
│
├── docs/
│
├── .github/
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

## Dependency direction

The dependency graph should generally flow toward shared infrastructure and domain packages.

```text
                     ┌───────────────┐
                     │    Web        │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │      API      │
                     └───────┬───────┘
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
        database          types          validation
             ▲
             │
          worker
```

Mobile should not depend on the server database package.

The SDK should not depend on Prisma or server-only packages.

---

# 5. Application Responsibilities

## `apps/web`

Responsible for:

* Organizer dashboard
* Organization management
* Event management
* Session management
* Participant management
* Attendance monitoring
* Analytics
* Billing UI
* API key management
* Integration management

The Web application communicates with `apps/api`.

---

## `apps/mobile`

Responsible for:

* Participant experience
* Authentication
* Event discovery
* QR scanning
* Check-in
* Local persistence
* Offline intent creation
* Synchronization
* Sync status
* Mobile-specific interactions

The mobile application communicates with `apps/api`.

It must never communicate directly with PostgreSQL or Redis.

---

## `apps/api`

Responsible for:

* HTTP API
* Authentication
* Authorization
* Business rules
* Request validation
* Attendance processing
* Organization management
* Event management
* Session management
* Participant management
* API keys
* SDK-facing functionality
* Realtime events
* Queue submission
* External service orchestration

The API is the primary server application.

---

## `apps/worker`

Responsible for asynchronous work.

It consumes jobs from Redis/BullMQ and executes operations that do not need to block an HTTP request.

Examples:

* Attendance synchronization
* Webhook delivery
* Notifications
* Bulk imports
* Exports
* Analytics processing
* Integration synchronization
* Scheduled tasks

The worker can access trusted server-side packages.

---

# 6. Shared Packages

## `packages/database`

Contains the Prisma schema and database client.

```text
packages/database/
├── prisma/
│   └── schema.prisma
└── src/
    ├── client.ts
    └── index.ts
```

Only server-side applications should consume this package.

```text
API ────────→ Database package
Worker ─────→ Database package
```

Clients must never import it.

---

## `packages/types`

Contains shared TypeScript types that are safe to consume from clients.

Examples:

* Event types
* Attendance types
* Organization types
* API response types
* Synchronization types

Types must not contain server-only implementation details.

---

## `packages/validation`

Contains reusable schemas for validating data.

Zod is the preferred validation technology.

Where appropriate, schemas can be shared between clients and the server.

However, server-side validation remains authoritative.

---

## `packages/sdk`

Contains the public Roll SYNC SDK.

The SDK communicates with the public API.

It must remain independent from:

* Prisma
* Redis
* internal backend modules
* private credentials
* server-only code

---

# 7. Backend Architecture

The API follows a modular architecture.

```text
apps/api/
│
├── src/
│   ├── auth/
│   ├── organizations/
│   ├── events/
│   ├── sessions/
│   ├── participants/
│   ├── attendance/
│   ├── integrations/
│   ├── api-keys/
│   ├── billing/
│   ├── realtime/
│   ├── storage/
│   ├── jobs/
│   ├── common/
│   └── main.ts
```

Each module owns a specific domain responsibility.

For example:

```text
attendance/
├── attendance.controller.ts
├── attendance.service.ts
├── attendance.repository.ts
├── attendance.types.ts
└── attendance.module.ts
```

The exact structure may evolve, but domain boundaries should remain clear.

---

# 8. Request Lifecycle

A typical API request follows this flow:

```text
Client
  │
  ▼
HTTP Request
  │
  ▼
Authentication
  │
  ▼
Authorization
  │
  ▼
Validation
  │
  ▼
Controller
  │
  ▼
Application / Domain Service
  │
  ├───────────────┐
  ▼               ▼
Database        Queue
  │               │
  └───────┬───────┘
          ▼
      Response
```

Controllers should remain thin.

Business logic should live in services/use cases rather than inside HTTP controllers.

---

# 9. Database Architecture

PostgreSQL is the authoritative persistent data store.

Neon provides the PostgreSQL infrastructure.

Prisma provides the application data access layer.

```text
NestJS API
    │
    ▼
Database Package
    │
    ▼
Prisma Client
    │
    ▼
Neon PostgreSQL
```

The database stores persistent application state.

Examples include:

* Users
* Organizations
* Memberships
* Events
* Attendance sessions
* Participants
* Attendance records
* Attendance intents
* API keys
* Integrations
* Subscriptions
* Audit records

The exact schema belongs in `packages/database/prisma/schema.prisma`.

---

# 10. Multi-Tenancy

Roll SYNC is designed as a multi-tenant system.

The primary tenant boundary is the organization.

```text
Organization A
├── Users
├── Events
├── Participants
└── Attendance

Organization B
├── Users
├── Events
├── Participants
└── Attendance
```

Every organization-owned resource must be associated with an organization.

Server-side authorization must verify that the authenticated actor has access to the requested organization/resource.

A user belonging to Organization A must never be able to access Organization B's private data simply by changing an ID in a request.

---

# 11. Authentication Architecture

Authentication is handled centrally by the backend using Better Auth.

The backend owns authentication state and authorization.

```text
                 ┌──────────────┐
                 │ Better Auth  │
                 └──────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
         Web          Mobile        API/SDK
```

Authentication must support:

* Email/password
* Social login
* Session management
* Mobile authentication
* Account linking
* Session revocation

The exact provider configuration is an implementation detail.

---

# 12. Web Authentication

The Web application uses the Roll SYNC authentication system through the API/authentication layer.

The browser should never receive sensitive server credentials.

Authentication state should be represented through secure session mechanisms.

---

# 13. Mobile Authentication

Mobile authentication must account for the different security model of native applications.

The mobile client should securely persist the minimum credentials required to maintain authentication.

The application should also handle:

* Expired sessions
* Refreshing authentication
* Logout
* Revoked sessions
* Offline state

Authentication state should not be stored in ordinary unencrypted application storage when a more secure platform storage mechanism is available.

---

# 14. SDK Authentication

SDK authentication is separate from user authentication.

Third-party applications authenticate using Roll SYNC-issued credentials.

```text
Developer
   │
   ▼
Roll SYNC Dashboard
   │
   ▼
API Key
   │
   ▼
SDK
   │
   ▼
Roll SYNC API
```

API keys should support:

* Creation
* Revocation
* Rotation
* Scopes
* Metadata
* Usage tracking

SDK credentials must never be confused with a user's session token.

---

# 15. Authorization

Authorization is enforced on the backend.

A request must pass multiple checks:

```text
Authenticated?
     ↓
Correct organization?
     ↓
Correct resource?
     ↓
Sufficient permissions?
     ↓
Action allowed?
```

The client UI may hide unauthorized actions, but this is not a security boundary.

The backend must independently enforce authorization.

---

# 16. Attendance Architecture

Attendance is modeled as a domain rather than a collection of UI features.

```text
Organization
     │
     ▼
   Event
     │
     ▼
Attendance Session
     │
     ├── QR
     ├── Roll Call
     ├── ID
     ├── Mobile
     ├── API
     └── Future Methods
     │
     ▼
Attendance Intent
     │
     ▼
Validation
     │
     ▼
Attendance Record
```

Every attendance method eventually enters the same backend attendance pipeline.

---

# 17. Attendance Submission

A normal online attendance submission looks like:

```text
Participant
    │
    ▼
Client
    │
    ▼
POST /attendance
    │
    ▼
Authenticate
    │
    ▼
Validate request
    │
    ▼
Validate session
    │
    ▼
Validate participant
    │
    ▼
Check duplicate/idempotency
    │
    ▼
Create attendance record
    │
    ▼
Emit realtime event
    │
    ▼
Return result
```

The operation should be designed to be idempotent.

---

# 18. QR Code Architecture

QR codes should represent an attendance session/check-in context rather than exposing internal database information.

Conceptually:

```text
Attendance Session
       │
       ▼
Secure check-in identifier
       │
       ▼
QR Generator
       │
       ▼
Displayed QR
       │
       ▼
Participant Scanner
       │
       ▼
API
       │
       ▼
Validation
       │
       ▼
Attendance
```

The QR payload should be intentionally small and should not contain unnecessary sensitive information.

QR validation is performed by the backend.

---

# 19. Idempotency

Attendance submission must support idempotency.

A client-generated operation ID should accompany mutations where retries are possible.

Example:

```text
operationId = "01J..."
```

If the same operation is submitted multiple times:

```text
Request 1 ──→ accepted
Request 2 ──→ duplicate
Request 3 ──→ duplicate
```

The backend should return the existing result rather than creating additional attendance records.

This is essential for mobile offline synchronization.

---

# 20. Offline-First Architecture

Offline functionality exists primarily in the mobile application.

The mobile architecture contains:

```text
┌───────────────────────────────┐
│          Mobile UI            │
├───────────────────────────────┤
│       Attendance Logic        │
├───────────────────────────────┤
│        Sync Engine            │
├───────────────────────────────┤
│       Local Database          │
├───────────────────────────────┤
│       Network Monitor         │
└───────────────────────────────┘
```

The local database stores:

* Cached data
* Pending operations
* Sync metadata
* Operation IDs
* Local state

The exact mobile database technology should be selected based on Expo compatibility and reliability requirements.

---

# 21. Offline Operation Lifecycle

```text
User Action
    │
    ▼
Create Operation ID
    │
    ▼
Write to Local Database
    │
    ▼
Update UI Immediately
    │
    ▼
Mark as PENDING
    │
    ▼
Network Available?
    │
    ├── NO ──→ Wait
    │
    └── YES
          │
          ▼
       Sync Engine
          │
          ▼
        API
          │
          ▼
      Validation
          │
     ┌────┴─────┐
     ▼          ▼
 CONFIRMED    REJECTED
     │          │
     └────┬─────┘
          ▼
    Update Local State
```

The mobile application should automatically retry operations that fail because of transient network problems.

Permanent validation failures should not be retried indefinitely.

---

# 22. Sync Queue

The mobile application maintains its own local synchronization queue.

This is distinct from the server-side BullMQ queue.

```text
MOBILE

Local Sync Queue
       │
       │ network available
       ▼
Roll SYNC API
       │
       ▼
Server
       │
       ▼
Redis / BullMQ
       │
       ▼
Worker
```

The mobile queue exists to preserve user intent locally.

BullMQ exists to process server-side asynchronous work.

They solve different problems.

---

# 23. Background Processing Architecture

Roll SYNC uses Redis and BullMQ for server-side asynchronous processing.

```text
API
 │
 ▼
Queue Producer
 │
 ▼
Redis
 │
 ▼
BullMQ
 │
 ▼
Worker
 │
 ▼
Job Handler
 │
 ├── Database
 ├── Storage
 ├── Notifications
 ├── Webhooks
 └── External APIs
```

The API should enqueue work rather than performing expensive operations during a request whenever practical.

---

# 24. Queue Design

Jobs should be separated into logical queues where necessary.

Potential queues include:

```text
attendance-sync
webhooks
notifications
exports
imports
integrations
analytics
```

Queue separation allows different jobs to have different concurrency, retry, and priority policies.

Not every queue needs to exist in the MVP.

---

# 25. Job Reliability

Background jobs should support:

* Retries
* Exponential backoff where appropriate
* Failure tracking
* Idempotent processing
* Dead-letter/failure handling
* Job observability

A worker must assume that jobs can execute more than once.

Therefore, job handlers should be safe to retry.

---

# 26. Realtime Architecture

Realtime is used for transient state updates.

Examples:

* New attendance
* Attendance count changes
* Session status
* Dashboard updates
* Synchronization events

The architecture is:

```text
Mutation
   │
   ▼
Database
   │
   ▼
Realtime Publisher
   │
   ▼
Connected Clients
```

The database remains authoritative.

Realtime is a delivery mechanism.

---

# 27. Realtime Recovery

Clients must not depend entirely on realtime connections.

If a connection is lost:

```text
Realtime disconnected
       │
       ▼
Client reconnects
       │
       ▼
Fetch current server state
       │
       ▼
Update local UI
```

This prevents stale dashboards caused by missed realtime events.

---

# 28. API Architecture

The API is the contract between Roll SYNC and its clients.

The initial API will be REST-oriented.

Conceptual resource groups include:

```text
/auth
/organizations
/events
/sessions
/participants
/attendance
/integrations
/api-keys
/webhooks
/billing
```

The actual routes should be defined and documented independently from the UI.

---

# 29. API Versioning

Public API changes must be treated carefully because third-party applications may depend on them.

The initial public API should establish a versioning strategy before external adoption grows.

Potential strategy:

```text
/api/v1/...
```

Breaking changes should result in a new API version rather than silently changing existing behavior.

---

# 30. API Validation

Every externally supplied request must be validated.

```text
Request
  ↓
DTO / Schema Validation
  ↓
Domain Validation
  ↓
Authorization
  ↓
Execution
```

Validation should distinguish between:

* Invalid input
* Unauthorized requests
* Forbidden requests
* Missing resources
* Invalid state transitions
* Conflicts
* Rate limits
* Internal failures

---

# 31. API Error Model

API errors should follow a predictable structure.

Conceptually:

```json
{
  "error": {
    "code": "ATTENDANCE_SESSION_CLOSED",
    "message": "This attendance session is no longer active.",
    "requestId": "req_..."
  }
}
```

Error codes should be stable enough for SDK and third-party consumers to handle programmatically.

Human-readable messages may change.

Machine-readable error codes should be treated as part of the API contract.

---

# 32. SDK Architecture

The SDK is a typed client around the public Roll SYNC API.

```text
packages/sdk/
│
├── src/
│   ├── client.ts
│   ├── resources/
│   │   ├── events.ts
│   │   ├── sessions.ts
│   │   ├── attendance.ts
│   │   └── participants.ts
│   ├── errors.ts
│   └── index.ts
└── package.json
```

The SDK should:

* Provide TypeScript types
* Handle authentication headers
* Handle API errors
* Provide resource-oriented methods
* Support retries only where safe
* Avoid exposing internal infrastructure
* Remain usable outside the Roll SYNC monorepo

---

# 33. Storage Architecture

UploadThing is used for file storage.

The system separates file content from database metadata.

```text
Client
  │
  ▼
API / Upload Flow
  │
  ▼
UploadThing
  │
  ▼
Stored File
  │
  ▼
File Metadata
  │
  ▼
PostgreSQL
```

The database should store identifiers and metadata rather than large binary file contents.

---

# 34. Billing Architecture

Polar handles billing and subscription management.

The backend remains the authority for determining what an organization is allowed to use.

```text
User
 │
 ▼
Web
 │
 ▼
API
 │
 ▼
Polar
 │
 ▼
Subscription
 │
 ▼
Webhook
 │
 ▼
API
 │
 ▼
Database
```

The application should not trust client-provided subscription information.

---

# 35. Webhooks

External services may send webhooks to the API.

Webhook flow:

```text
External Service
       │
       ▼
Webhook Endpoint
       │
       ▼
Signature Verification
       │
       ▼
Event Validation
       │
       ▼
Database / Queue
```

Webhook handlers should be idempotent because external services may retry delivery.

---

# 36. Integration Architecture

Integrations should be isolated behind well-defined interfaces.

```text
Roll SYNC Core
      │
      ▼
Integration Layer
      │
 ┌────┼────┬────────┐
 ▼    ▼    ▼        ▼
LMS   HR   Events   Custom
```

An integration should not modify the core attendance logic directly.

Instead, it should translate external data into Roll SYNC's internal domain model.

---

# 37. Security Boundaries

The most important security boundary is:

```text
                 UNTRUSTED
                     │
     ┌───────────────┼────────────────┐
     │               │                │
    Web            Mobile        Third Party
     │               │                │
     └───────────────┼────────────────┘
                     │
                TRUST BOUNDARY
                     │
                     ▼
                 Backend
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
   Database        Redis        Services
```

Clients are never trusted simply because they use an official Roll SYNC application.

Every request must be authenticated and authorized where required.

---

# 38. Secrets

Secrets must only exist on trusted server environments.

Examples:

* Database credentials
* Redis credentials
* Authentication secrets
* Polar secrets
* UploadThing server credentials
* API signing secrets
* Encryption keys

Client applications may receive public configuration but never private infrastructure credentials.

---

# 39. Rate Limiting

The API should eventually implement rate limiting.

Rate limits may vary by:

* User
* Organization
* API key
* IP
* Endpoint
* Subscription tier

Public API consumers should have explicit limits.

Attendance submission endpoints should also be protected from abuse.

---

# 40. Auditability

Important actions should be traceable.

Potential audit events include:

* Organization changes
* Permission changes
* API key creation
* API key revocation
* Attendance modifications
* Session configuration changes
* Billing events
* Integration changes

Audit logging should be implemented without storing unnecessary sensitive information.

---

# 41. Observability

Production systems require visibility into failures.

The platform should eventually provide:

* Structured logs
* Request IDs
* Error tracking
* Queue monitoring
* Job failure tracking
* Database monitoring
* API latency monitoring
* Health checks

A request should be traceable across services where possible.

```text
Request ID
    │
    ├── API request
    ├── Database operation
    ├── Queue job
    └── Worker execution
```

---

# 42. Health Checks

The API and worker should expose mechanisms for determining whether the service is functioning correctly.

The API should distinguish between:

* Process is alive
* Database is reachable
* Redis is reachable
* Critical dependencies are operational

This allows deployment infrastructure to detect unhealthy instances.

---

# 43. Deployment Architecture

The monorepo contains multiple deployable applications.

```text
                    GitHub
                       │
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
          Vercel    Deplexo   Expo/EAS
             │         │         │
             ▼         ▼         ▼
            Web    API/Worker   Mobile
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
           Neon      Redis    External
         PostgreSQL           Services
```

The Web, API, Worker, and Mobile applications are deployed independently.

---

# 44. Environment Separation

The project should eventually maintain separate environments for:

```text
Development
     ↓
Preview / Staging
     ↓
Production
```

Each environment should have its own:

* Database
* Redis
* Authentication configuration
* API credentials
* Billing configuration where necessary
* Storage configuration

Production secrets must never be reused casually in development.

---

# 45. Scalability

The architecture should allow individual components to scale independently.

For example:

```text
                 Load
                  │
          ┌───────┼───────┐
          ▼       ▼       ▼
        API 1   API 2   API 3
          │       │       │
          └───────┼───────┘
                  │
                Redis
                  │
          ┌───────┼───────┐
          ▼       ▼       ▼
       Worker  Worker  Worker
```

Because background jobs are separated from the API, worker capacity can be increased independently when asynchronous workload grows.

---

# 46. Consistency Model

Roll SYNC uses different consistency guarantees for different parts of the system.

### Server State

PostgreSQL is authoritative.

### Mobile Local State

Local state is an optimistic representation of pending user intent.

### Realtime

Realtime is eventually consistent with the database.

### Background Jobs

Jobs are asynchronous and may complete later.

This distinction is important when designing UI states.

The client should never confuse:

```text
Locally recorded
```

with:

```text
Server confirmed
```

---

# 47. Failure Handling

The architecture assumes that failures will occur.

Examples:

* Network failure
* Database timeout
* Redis failure
* Worker crash
* API timeout
* Authentication expiry
* Duplicate request
* External service failure

Each class of failure should have an appropriate recovery strategy.

```text
Transient failure
      ↓
Retry

Permanent validation failure
      ↓
Reject

Unknown request outcome
      ↓
Idempotent retry

Worker failure
      ↓
Queue retry

Realtime failure
      ↓
Reconnect + state refresh
```

---

# 48. Important Architectural Rules

The following rules should be considered non-negotiable unless this document is deliberately changed.

### Rule 1 — Clients never access the database directly.

```text
Web ──→ API ──→ Database
Mobile ──→ API ──→ Database
SDK ──→ API ──→ Database
```

### Rule 2 — Prisma is server-side.

Prisma belongs in `packages/database` and is consumed by trusted server applications.

### Rule 3 — The backend is authoritative.

Clients can optimistically represent state, but the server determines valid state.

### Rule 4 — Offline operations must be idempotent.

Retries must not create duplicate attendance records.

### Rule 5 — Realtime is not the source of truth.

Clients can recover state through normal API requests.

### Rule 6 — Background jobs must be retry-safe.

A job may execute more than once.

### Rule 7 — SDK credentials are separate from user authentication.

An API key represents an application/integration, not a human session.

### Rule 8 — Business logic belongs in the backend.

The clients should primarily handle presentation, local state, and client-specific behavior.

### Rule 9 — Shared packages must respect runtime boundaries.

Server-only dependencies must never leak into browser or mobile bundles.

### Rule 10 — Public API changes must be deliberate.

The API is a product contract, not merely an internal implementation detail.

---

# 49. Core Data Flow

The complete attendance architecture can be summarized as:

```text
                         PARTICIPANT
                              │
                              ▼
                    ┌──────────────────┐
                    │ Web / Mobile /   │
                    │ QR / External    │
                    └────────┬─────────┘
                             │
                             ▼
                       Roll SYNC API
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
          Authentication  Validation   Authorization
                │            │            │
                └────────────┼────────────┘
                             ▼
                    Attendance Service
                             │
                  ┌──────────┴──────────┐
                  │                     │
                  ▼                     ▼
             PostgreSQL              Redis
                  │                     │
                  │                 BullMQ
                  │                     │
                  │                  Worker
                  │                     │
                  └──────────┬──────────┘
                             ▼
                     Realtime Events
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
              Web         Mobile      Integrations
```

---

# 50. Architectural North Star

Roll SYNC should remain a platform, not become a collection of tightly coupled applications.

The intended relationship is:

```text
                         ROLL SYNC
                             │
                     ┌───────┴───────┐
                     │               │
                  Core API       Core Services
                     │               │
          ┌──────────┼──────────┐    │
          │          │          │    │
         Web       Mobile      SDK   │
          │          │          │    │
          └──────────┴──────────┴────┘
                             │
                    Shared Infrastructure
```

The central architectural idea is:

> **Build the attendance infrastructure once, then allow every interface to consume it in the way that makes sense for that interface.**

The Web should not define what the backend can do.

The Mobile application should not define what the API can do.

The SDK should not create a separate attendance system.

All three should be clients of the same underlying Roll SYNC platform.

That separation is what allows Roll SYNC to eventually move beyond an attendance application and become an attendance infrastructure layer for other products.
