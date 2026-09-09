````md
# Roll SYNC — Engineering Decisions

> This document records important technical and architectural decisions made during the development of Roll SYNC.
>
> The purpose is not to document every implementation detail. It exists to preserve **why** important decisions were made so future contributors do not accidentally reverse them without understanding the trade-offs.

---

## 1. Decision Log

| ID | Decision | Status |
| --- | --- | --- |
| DEC-001 | Use a pnpm monorepo | Accepted |
| DEC-002 | Use separate Web, Mobile, and API applications | Accepted |
| DEC-003 | Use a dedicated backend instead of Next.js API routes | Accepted |
| DEC-004 | Use PostgreSQL through Neon | Accepted |
| DEC-005 | Use Prisma as the backend ORM | Accepted |
| DEC-006 | Use Redis + BullMQ for background jobs | Accepted |
| DEC-007 | Build mobile as offline-first | Accepted |
| DEC-008 | Use persistent local storage for offline operations | Accepted |
| DEC-009 | Use an API-first architecture | Accepted |
| DEC-010 | Build a public SDK around the API | Accepted |
| DEC-011 | Use a unified attendance domain | Accepted |
| DEC-012 | Model organizations using hierarchical units | Accepted |
| DEC-013 | Keep Users separate from People | Accepted |
| DEC-014 | Use a generic Attendance Context → Session → Attendance model | Accepted |
| DEC-015 | Use UploadThing for file storage | Accepted |
| DEC-016 | Use Polar for billing | Accepted |
| DEC-017 | Use centralized authentication across surfaces | Accepted |
| DEC-018 | Keep infrastructure concerns separate from the core domain | Accepted |
| DEC-019 | Prefer idempotent operations throughout the system | Accepted |
| DEC-020 | Optimize for a production-capable MVP without premature complexity | Accepted |

---

# 2. DEC-001 — pnpm Monorepo

### Decision

Roll SYNC uses a **pnpm workspace monorepo**.

### Why

Roll SYNC contains multiple applications and shared packages:

```text
apps/
├── web
├── mobile
└── api

packages/
├── shared
├── sdk
├── ui
└── ...
````

A monorepo allows these surfaces to share:

* types
* validation schemas
* API contracts
* configuration
* utilities
* SDK code
* UI primitives where appropriate

without duplicating code across repositories.

### Consequences

Developers must use pnpm for workspace dependency management.

The repository is expected to be developed and tested from the root whenever possible.

---

# 3. DEC-002 — Separate Web, Mobile, and API Applications

### Decision

Roll SYNC is built as three primary application surfaces:

```text
Web
Mobile
API
```

They share infrastructure but are independently responsible for presentation and client-specific behavior.

### Why

The web application, mobile application, and external consumers have fundamentally different requirements.

The mobile application needs:

* offline storage
* background synchronization
* native device capabilities

The web application needs:

* browser-first UX
* dashboards
* administration
* large-screen workflows

External customers need:

* stable API access
* SDKs
* authentication
* predictable contracts

A single frontend framework should not be forced to serve all three responsibilities.

---

# 4. DEC-003 — Dedicated Backend Instead of Next.js API Routes

### Decision

The Roll SYNC API is a dedicated backend application.

Next.js API routes are not the primary backend architecture.

### Why

Roll SYNC has three interfaces:

```text
Web
Mobile
External API / SDK
```

All three must communicate with the same backend.

The backend therefore needs to exist independently from the web application.

```text
             ┌── Web
             │
Clients ─────┼── Mobile
             │
             └── SDK
                   │
                   ▼
                 API
                   │
            ┌──────┼──────┐
            ▼      ▼      ▼
         Postgres Redis Storage
```

This also makes the API independently deployable and scalable.

---

# 5. DEC-004 — PostgreSQL Through Neon

### Decision

PostgreSQL is the primary relational database, hosted through Neon.

### Why

Roll SYNC requires:

* relational data
* transactions
* strong consistency
* constraints
* indexes
* hierarchical relationships
* reliable querying
* production-grade persistence

PostgreSQL is well suited to the domain.

Neon provides managed PostgreSQL while allowing the application to remain PostgreSQL-compatible rather than coupling the domain model to a proprietary database.

---

# 6. DEC-005 — Prisma Belongs to the Backend

### Decision

Prisma is used by the backend/database layer.

Prisma must not be exposed to client applications.

### Correct flow

```text
Web
 │
 ▼
API
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
```

```text
Mobile
 │
 ▼
API
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
```

```text
SDK
 │
 ▼
API
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
```

### Why

The database is an internal implementation detail.

Allowing clients to access Prisma directly would:

* expose database structure
* bypass backend authorization
* duplicate business logic
* make API boundaries meaningless
* create security risks

The API remains the authoritative gateway to persistent application state.

---

# 7. DEC-006 — Redis + BullMQ for Background Jobs

### Decision

Redis and BullMQ are used for asynchronous background processing.

### Why

Roll SYNC will eventually perform work that should not block API requests:

* webhook delivery
* notifications
* large imports
* report generation
* data processing
* synchronization tasks
* scheduled work

The API should be able to acknowledge a request quickly while workers process longer-running operations.

```text
API Request
    │
    ▼
Persist State
    │
    ▼
Queue Job
    │
    ▼
Return Response
    │
    └──────────────► Worker
                       │
                       ▼
                    Process
```

### Important Rule

Jobs must be designed to tolerate retries.

A job must not assume:

```text
execute exactly once
```

It should instead assume:

```text
execute
→ fail
→ retry
→ execute again
```

Where possible, jobs should be idempotent.

---

# 8. DEC-007 — Mobile Is Offline-First

### Decision

Offline support is a core mobile architecture feature rather than an optional enhancement.

### Why

Attendance frequently happens in environments where:

* connectivity is poor
* mobile data is unavailable
* networks are congested
* users move between locations

A system that requires a successful network request before recording intent would create friction at exactly the wrong moment.

Therefore:

```text
User Action
    │
    ▼
Local Operation
    │
    ├── Online ──► API
    │
    └── Offline
          │
          ▼
      Local Queue
          │
          ▼
      Sync Later
```

The mobile client records intent immediately and synchronizes with the backend when connectivity becomes available.

---

# 9. DEC-008 — Persistent Local Storage for Offline Operations

### Decision

Offline operations must be persisted locally rather than held only in application memory.

### Why

Memory-only queues disappear when:

* the application closes
* the operating system kills the app
* the device restarts
* the application crashes

Attendance intent must survive these events.

The local store therefore contains:

```text
Pending Operation
├── operation ID
├── operation type
├── payload
├── created timestamp
├── retry state
└── synchronization state
```

The exact storage implementation is platform-specific, but the behavior is defined by the offline synchronization architecture.

---

# 10. DEC-009 — API-First Architecture

### Decision

The API is the central contract between Roll SYNC clients and the backend.

### Why

The same backend must support:

```text
Web
Mobile
SDK
Third-party applications
```

Therefore, the backend cannot be designed around one client.

The API becomes the stable boundary:

```text
                 Roll SYNC API
                /      |      \
               /       |       \
            Web      Mobile    SDK
```

Client applications decide how data is fetched, cached, and rendered.

The backend decides:

* authorization
* validation
* business rules
* persistence
* synchronization
* billing enforcement
* security

---

# 11. DEC-010 — Public SDK Around the API

### Decision

Roll SYNC will provide an SDK for external developers.

### Why

The long-term opportunity is larger than providing a standalone attendance application.

Organizations should be able to integrate Roll SYNC into their existing systems.

For example:

```text
School App
     │
     ▼
Roll SYNC SDK
     │
     ▼
Roll SYNC API
```

or:

```text
Existing Business System
          │
          ▼
      Roll SYNC API
```

The SDK must therefore remain a client of the public API.

It must never access:

```text
Prisma
PostgreSQL
Redis
internal services
```

directly.

---

# 12. DEC-011 — Unified Attendance Domain

### Decision

Attendance methods share one underlying attendance model.

Roll SYNC does not create separate database models for:

```text
QR Attendance
Roll Call Attendance
ID Scan Attendance
Mobile Attendance
Manual Attendance
```

Instead:

```text
AttendanceRecord
├── method
├── source
├── status
└── metadata
```

### Why

The mechanism used to record attendance should not determine the underlying data structure.

For example:

```text
QR
 │
 ▼
Attendance Record
```

```text
ID Scan
 │
 ▼
Attendance Record
```

```text
Roll Call
 │
 ▼
Attendance Record
```

This keeps reporting, analytics, APIs, and integrations consistent.

---

# 13. DEC-012 — Hierarchical Organization Units

### Decision

Organizations use generic hierarchical units rather than industry-specific structures.

Instead of separate models for:

```text
Faculty
Department
Class
Team
Division
Branch
House
```

Roll SYNC uses:

```text
OrganizationUnit
```

with a parent-child relationship.

Example:

```text
Organization
│
└── Faculty
    │
    └── Department
        │
        └── Class
```

### Why

Different organizations have different structures.

A school might have:

```text
School
└── Level
    └── Class
```

A university might have:

```text
University
└── Faculty
    └── Department
        └── Program
```

A company might have:

```text
Company
└── Department
    └── Team
```

The database should support all three without specialized tables.

---

# 14. DEC-013 — Users and People Are Separate

### Decision

`User` and `Person` are different domain concepts.

### User

A `User` is an authenticated account that interacts with Roll SYNC.

Examples:

```text
Administrator
Teacher
Manager
Staff member
Organization owner
```

### Person

A `Person` is an individual whose participation may be recorded.

Examples:

```text
Student
Employee
Attendee
Volunteer
Participant
Visitor
```

### Why

Not every person being tracked needs a Roll SYNC account.

For example:

```text
Teacher
   │
   └── Roll SYNC User

Student
   │
   └── Person
```

This distinction is fundamental to keeping attendance management simple.

---

# 15. DEC-014 — Attendance Context → Session → Record

### Decision

Attendance is modeled as:

```text
Organization
    ↓
Attendance Context
    ↓
Session
    ↓
Attendance Record
```

### Attendance Context

Defines **what** attendance is being tracked.

Examples:

```text
Daily School Attendance
Employee Work Attendance
Tech Conference 2026
Friday Coding Club
```

### Session

Defines a specific occurrence.

Examples:

```text
August 28 Morning
Day 1
Monday Shift
```

### Attendance Record

Defines the individual's result.

Examples:

```text
Student A → PRESENT
Student B → LATE
Student C → ABSENT
```

### Why

This abstraction allows the same model to support schools, businesses, events, meetings, training, and future use cases.

---

# 16. DEC-015 — UploadThing for File Storage

### Decision

Files are stored through UploadThing rather than directly inside PostgreSQL.

### Why

The relational database should store application data and references to files rather than large binary objects.

Files may include:

```text
imports
organization assets
avatars
documents
event materials
```

The backend remains responsible for authorization and ownership.

---

# 17. DEC-016 — Polar for Billing

### Decision

Polar is used for billing and subscription management.

### Why

Roll SYNC needs a monetization layer from the MVP onward.

The platform should support concepts such as:

```text
Free
Pro
Business
Enterprise
```

or equivalent pricing tiers.

The payment provider manages payment processing while Roll SYNC maintains the application-level relationship between:

```text
Organization
     ↓
Subscription
     ↓
Entitlements / Limits
```

The client must never be trusted to determine whether a paid feature is available.

---

# 18. DEC-017 — Centralized Cross-Platform Authentication

### Decision

Authentication is centralized so that web, mobile, and API consumers can operate against the same account system.

The authentication architecture must support:

```text
Web
Mobile
Social sign-in
Email authentication
Sessions / tokens
API authentication
SDK authentication
```

### Why

Users should not have separate identities for:

```text
Web
Mobile
API
```

The same Roll SYNC account should be able to interact with multiple surfaces.

Authentication and authorization remain backend concerns.

---

# 19. DEC-018 — Infrastructure Is Separate From the Domain

### Decision

Infrastructure concerns should not contaminate the core attendance domain.

The core domain remains:

```text
Organization
People
Units
Attendance Context
Session
Attendance Record
```

Supporting infrastructure includes:

```text
Authentication
Billing
Redis
Queues
API keys
Webhooks
Audit logs
File storage
Offline synchronization
```

### Why

This separation makes the core domain easier to reason about and allows infrastructure providers to change without rewriting the product's fundamental data model.

---

# 20. DEC-019 — Idempotency Is a System-Wide Requirement

### Decision

Operations that may be retried must be designed for idempotency.

This is particularly important for:

```text
Offline synchronization
API requests
Background jobs
Webhooks
Payments
External integrations
```

For example, a mobile client may submit:

```text
operation_id = abc123
```

The network may fail after the server processes it.

The client then retries.

The backend must recognize that:

```text
abc123
```

has already been processed rather than creating duplicate attendance.

The same principle applies to background jobs and webhooks.

---

# 21. DEC-020 — Production-Capable MVP

### Decision

The MVP should be engineered as a real product, but without unnecessary complexity.

The project must be capable of supporting:

* real users
* real organizations
* real attendance
* real authentication
* real payments
* real API consumers
* real mobile offline behavior

However, the initial implementation should avoid premature systems that are not yet justified.

### Prefer

```text
Simple architecture
Clear boundaries
Strong typing
Reliable primitives
Managed infrastructure
Well-defined APIs
```

### Avoid

```text
Premature microservices
Unnecessary abstraction
Duplicate domain models
Over-engineered event systems
Complex distributed infrastructure without a requirement
```

The goal is:

> **Production-ready foundations, not production-scale complexity on day one.**

---

# 22. Decision-Making Rules

When a new architectural question appears, decisions should generally follow these principles:

### 1. Backend authority

The server is the source of truth for:

```text
authorization
business rules
billing
persistent state
```

### 2. Clients are specialized

Web and mobile should optimize for their own environments rather than forcing identical implementations.

### 3. Shared contracts over shared implementations

Share:

```text
types
schemas
contracts
```

when useful.

Do not share server-only implementation details with clients.

### 4. Domain first

New functionality should first be understood as a domain concept before introducing infrastructure.

### 5. Offline safety

Any mobile operation that can happen offline must be safe to retry.

### 6. Backwards compatibility

API and SDK changes should avoid unnecessary breaking changes.

### 7. Managed infrastructure where practical

The project is being developed under resource constraints.

Managed services are preferred when they provide meaningful reliability without adding unnecessary operational burden.

---

# 23. Reconsidering a Decision

A decision can be changed.

However, an architectural decision should not be reversed simply because another technology is newer or more popular.

Before changing an accepted decision, consider:

* What problem does the current decision create?
* Is the problem real or hypothetical?
* What does the replacement solve?
* What migration cost does it introduce?
* Does it improve reliability?
* Does it simplify development?
* Does it improve the developer experience?
* Does it introduce a new vendor dependency?
* Does it affect Web, Mobile, API, or SDK consumers?
* Does it require changes to the data model?

If the answer justifies the change, update this document.

---

# 24. Decision Record Format

Future architectural decisions should use the following structure:

```text
## DEC-XXX — Decision Title

### Decision

What was decided?

### Context

What problem or requirement led to the decision?

### Alternatives Considered

What other approaches were considered?

### Why

Why was this approach selected?

### Consequences

What does this decision make easier or harder?

### Status

Accepted / Superseded / Rejected
```

---

# 25. Current Architectural Direction

The decisions in this document collectively establish the following architecture:

```text
                         ROLL SYNC
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
            WEB            MOBILE           SDK
             │               │               │
             └───────────────┼───────────────┘
                             │
                             ▼
                           API
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
          PostgreSQL       Redis       File Storage
            (Neon)       (BullMQ)      (UploadThing)
              │              │
              │              ▼
              │           Workers
              │
              ▼
        Core Domain
              │
       ┌──────┼────────┐
       │      │        │
       ▼      ▼        ▼
   People   Units   Attendance
                     │
                ┌────┴────┐
                ▼         ▼
             Context    Session
                           │
                           ▼
                     Attendance Record
```

This architecture is the current technical direction for Roll SYNC.

Changes should preserve the fundamental goals of:

**cross-platform access, offline-first mobile behavior, a stable public API, strong backend authority, simple domain modeling, and a production-capable foundation.**

```
```
