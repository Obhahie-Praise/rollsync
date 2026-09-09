````md
# Contributing to Roll SYNC

Thank you for contributing to Roll SYNC.

Roll SYNC is a multi-surface attendance platform built around a shared backend. The project contains web, mobile, API, SDK, shared packages, and infrastructure code, so changes should be made with the entire system in mind.

This document defines the engineering conventions for contributing to the repository.

---

## 1. Before You Start

Before making changes:

1. Read the root [`README.md`](../README.md).
2. Read [`docs/product.md`](../docs/product.md) to understand the product.
3. Read [`docs/architecture.md`](../docs/architecture.md) to understand the system architecture.
4. Read the relevant engineering documentation before changing core infrastructure.
5. Check existing issues, branches, and pull requests to avoid duplicated work.

If a change affects architecture, data models, API contracts, offline synchronization, or authentication, understand the relevant documentation before writing code.

---

# 2. Repository Structure

Roll SYNC is organized as a pnpm monorepo.

The general structure is:

```text
roll-sync/
│
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
│
├── packages/
│   ├── ...
│
├── docs/
│
├── engineering/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── pnpm-lock.yaml
└── README.md
````

The exact package structure may evolve as development continues.

### Applications

Applications are complete runnable surfaces.

```text
apps/web
```

The Roll SYNC web application and dashboard.

```text
apps/mobile
```

The Roll SYNC mobile application, including offline-first functionality.

```text
apps/api
```

The central backend application exposing Roll SYNC's API.

### Packages

Packages contain reusable code shared across applications.

Examples may include:

```text
packages/ui
packages/types
packages/config
packages/sdk
packages/database
```

Shared packages should contain reusable logic rather than application-specific behavior.

---

# 3. Package Manager

Roll SYNC uses **pnpm**.

Do not use npm or yarn for repository dependency management.

Use:

```bash
pnpm install
```

Run scripts with:

```bash
pnpm <script>
```

For workspace-specific commands:

```bash
pnpm --filter <package> <command>
```

Examples:

```bash
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter mobile start
```

Always commit changes to:

```text
pnpm-lock.yaml
```

when dependencies change.

Do not manually edit the lockfile.

---

# 4. Node.js Version

The repository declares its supported Node.js version in the root `package.json`.

Use the repository-defined version locally.

Before contributing, verify:

```bash
node --version
pnpm --version
```

If the project requires a newer Node.js version than the one installed locally, upgrade Node before continuing.

---

# 5. Installing Dependencies

From the repository root:

```bash
pnpm install
```

Do not install dependencies independently inside individual applications unless there is a specific reason to do so.

The workspace should manage dependencies centrally.

---

# 6. Development Environment

Create the appropriate environment files from the project's example environment files.

Never commit real secrets.

Typical environment variables may include:

```text
DATABASE_URL
BETTER_AUTH_SECRET
REDIS_URL
UPLOADTHING_TOKEN
POLAR_ACCESS_TOKEN
API_URL
NEXT_PUBLIC_API_URL
```

The actual environment variables depend on the application.

Use:

```text
.env.example
```

files to document required configuration.

---

# 7. Running the Project

The repository is a monorepo, so development should normally happen from the root.

Start the development environment with:

```bash
pnpm dev
```

When working on a single application, prefer filtering:

```bash
pnpm --filter web dev
```

or:

```bash
pnpm --filter api dev
```

or:

```bash
pnpm --filter mobile start
```

Use the smallest development scope necessary for the task.

---

# 8. TypeScript

Roll SYNC is strongly typed.

Prefer TypeScript for all application and package code.

Avoid:

```ts
any
```

unless there is a legitimate technical reason.

Prefer explicit types and shared domain types.

For example:

```ts
type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED";
```

Shared types should live in an appropriate shared package rather than being duplicated across web, mobile, and API.

---

# 9. Database Access

The database belongs to the backend.

Client applications must **not** directly access the production database.

The intended flow is:

```text
Web
   │
   ▼
API
   │
   ▼
Database
```

```text
Mobile
   │
   ▼
API
   │
   ▼
Database
```

```text
External SDK
   │
   ▼
API
   │
   ▼
Database
```

Prisma belongs to the backend/database layer.

Do not import Prisma Client into:

```text
apps/web
apps/mobile
packages/sdk
```

or other untrusted client-side code.

---

# 10. API-First Architecture

The API is the central source of server-side business logic.

Client applications should not duplicate backend business rules.

For example, attendance creation should follow:

```text
Client
  ↓
API request
  ↓
Authentication
  ↓
Authorization
  ↓
Validation
  ↓
Business logic
  ↓
Database
```

The web and mobile applications are responsible primarily for:

* collecting user input
* presenting data
* managing local state
* handling client-side interaction
* communicating with the API

The API remains responsible for authoritative decisions.

---

# 11. API Contracts

API contracts are shared boundaries.

Changes to API contracts should be treated carefully because they may affect:

```text
Web
Mobile
SDK
External integrations
```

Before changing an endpoint:

1. Identify all consumers.
2. Determine whether the change is breaking.
3. Update shared types where applicable.
4. Update tests.
5. Update documentation.
6. Update affected clients.

Prefer backwards-compatible changes where possible.

---

# 12. Shared Packages

Shared packages should be used when multiple applications genuinely need the same code.

Good candidates include:

```text
types
validation schemas
API contracts
UI primitives
configuration
SDK functionality
utility functions
```

Do not move code into a shared package simply because it technically can be shared.

A package should have a clear responsibility.

Avoid creating a giant package such as:

```text
packages/utils
```

containing unrelated functionality.

---

# 13. Validation

Input validation must happen on the server.

Client-side validation improves UX but is never a security boundary.

For example:

```text
Web validation
       ↓
API validation
       ↓
Business rules
       ↓
Database
```

The API must assume all client input is untrusted.

Use shared validation schemas where appropriate so web and mobile can provide consistent feedback without making the client authoritative.

---

# 14. Authentication

Authentication is handled centrally by the backend authentication system.

Clients should not implement independent authentication systems.

The intended relationship is:

```text
Web ──────┐
          │
Mobile ───┼──► Auth/API
          │
SDK ──────┘
```

Authentication changes must consider:

* web sessions
* mobile sessions
* social sign-in
* account linking
* token/session security
* API authentication
* SDK authentication

Never commit authentication secrets or credentials.

---

# 15. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Every protected API operation must perform authorization checks.

Never rely on the client hiding an action.

For organization-owned resources, verify that the authenticated principal has access to the organization and requested resource.

For example:

```text
User
 ↓
Organization Membership
 ↓
Permission
 ↓
Resource
```

Do not trust an organization ID supplied by the client without validating membership.

---

# 16. Offline-First Development

The mobile application supports offline intent.

Offline actions should not bypass the backend's authority.

The intended flow is:

```text
Mobile
  ↓
Local operation
  ↓
Persistent local storage
  ↓
Pending queue
  ↓
Connection detected
  ↓
API
  ↓
Server reconciliation
```

Offline-related changes must preserve:

* idempotency
* ordering where required
* retry safety
* conflict handling
* local persistence
* eventual synchronization

Read:

```text
docs/offline-sync.md
```

before modifying synchronization behavior.

---

# 17. Realtime

Realtime functionality should use the backend's realtime infrastructure rather than creating independent realtime systems inside individual clients.

Typical flow:

```text
Database / Backend Event
          ↓
     Realtime Layer
          ↓
   ┌──────┴──────┐
   ▼             ▼
  Web          Mobile
```

Realtime events should represent meaningful domain changes.

Avoid sending unnecessary high-frequency events.

Read:

```text
docs/realtime.md
```

before modifying realtime functionality.

---

# 18. Background Jobs

Long-running or asynchronous work should not block normal API requests.

Examples include:

```text
Email processing
Webhook delivery
Large imports
Attendance aggregation
Notifications
Synchronization tasks
Report generation
```

The backend should enqueue work through the project's queue infrastructure.

The API should generally:

```text
Validate
  ↓
Persist required state
  ↓
Enqueue job
  ↓
Return response
```

Workers then process the job independently.

---

# 19. Redis and Queues

Roll SYNC uses Redis-backed queues for background processing.

Queue jobs must be designed to be safe to retry.

A worker may process the same job more than once in failure scenarios.

Therefore:

> **Background jobs must be idempotent whenever possible.**

Do not assume:

```text
job runs once
```

Instead design for:

```text
job may run → fail → retry → run again
```

---

# 20. Attendance Methods

Roll SYNC supports multiple attendance methods.

Examples:

```text
QR
ROLL_CALL
ID_SCAN
MANUAL
MOBILE
IMPORT
```

New attendance methods should integrate into the existing attendance domain instead of creating separate attendance models.

The expected relationship is:

```text
Attendance Method
       ↓
Attendance Record
       ↓
Session
       ↓
Attendance Context
```

Do not create:

```text
QRCodeAttendance
MobileAttendance
RollCallAttendance
```

as separate database entities without an architectural reason.

---

# 21. QR Codes

QR codes are an attendance mechanism, not the attendance data itself.

A QR scan should eventually produce an attendance operation handled by the API.

Conceptually:

```text
QR
 ↓
Scan
 ↓
Resolve session/context
 ↓
Validate request
 ↓
Authenticate / identify participant
 ↓
Create attendance record
```

Security-sensitive QR behavior must be validated server-side.

Do not assume that possessing a QR payload automatically proves authorization.

---

# 22. SDK Development

The Roll SYNC SDK is a public interface to the API.

The SDK must never directly access the database.

Its architecture should be:

```text
Customer Application
        ↓
Roll SYNC SDK
        ↓
Roll SYNC API
        ↓
Backend
        ↓
Database
```

SDK changes must consider external consumers.

Avoid exposing internal database models directly through the SDK.

The SDK should expose stable domain concepts and API contracts.

---

# 23. Testing

New behavior should include appropriate tests.

Tests should exist at the appropriate level:

```text
Unit tests
Integration tests
API tests
Database tests
End-to-end tests
```

Not every change requires every type of test.

Prioritize tests around:

* authentication
* authorization
* attendance creation
* duplicate prevention
* offline synchronization
* API contracts
* payments
* background jobs
* integrations

---

# 24. Database Changes

Database changes should be made through Prisma migrations.

Do not manually modify production databases.

Typical development workflow:

```bash
pnpm prisma migrate dev
```

Use the project's configured Prisma commands rather than inventing alternative migration workflows.

Before committing a schema change:

1. Review the generated migration.
2. Confirm destructive changes.
3. Verify affected application code.
4. Test the migration.
5. Update documentation if the domain model changed.

---

# 25. Destructive Changes

Be extremely careful with:

```text
DROP
DELETE
ALTER
renaming columns
removing enum values
changing required fields
```

A migration that works against an empty local database may fail against production data.

For potentially destructive changes, prefer multi-step migrations.

Example:

```text
1. Add new field
2. Deploy compatible code
3. Migrate existing data
4. Switch reads/writes
5. Remove old field later
```

---

# 26. Error Handling

Errors should be predictable and useful.

The API should return structured errors rather than arbitrary strings.

Clients should be able to distinguish between:

```text
Authentication error
Authorization error
Validation error
Not found
Conflict
Rate limit
Server error
```

Do not expose:

* database credentials
* stack traces
* internal infrastructure details
* secrets
* sensitive user information

to clients.

---

# 27. Logging

Logs should help developers understand what happened without leaking sensitive information.

Good logs:

```text
Attendance sync failed
Session closed
Webhook delivery failed
Background job retrying
```

Avoid logging:

```text
passwords
access tokens
API keys
session secrets
private user data
```

Use structured logging where supported.

---

# 28. Commits

Use clear, focused commits.

Prefer:

```text
feat: add attendance session creation
fix: prevent duplicate offline attendance
refactor: simplify attendance validation
docs: update offline sync architecture
chore: update dependencies
test: add session authorization tests
```

Avoid vague commits such as:

```text
update
changes
stuff
fix
final
final final
```

A commit should ideally represent one logical change.

---

# 29. Branches

Do not develop directly on `main` unless the change is trivial and the project workflow explicitly allows it.

Prefer descriptive branches:

```text
feat/attendance-sessions
feat/mobile-offline-sync
fix/qr-session-validation
fix/auth-session-expiry
refactor/api-validation
docs/data-model
```

Keep branches focused.

Avoid combining unrelated features into one branch.

---

# 30. Pull Requests

A pull request should explain:

### What changed?

Briefly describe the implementation.

### Why?

Explain the problem being solved.

### How?

Mention important technical decisions.

### Testing

Explain how the change was verified.

Example:

```text
## Summary

Added QR-based attendance session check-in.

## Changes

- Added QR session token generation
- Added API validation
- Added duplicate attendance protection
- Added web scanning flow

## Testing

- Unit tests
- API integration tests
- Manual QR scan verification
```

---

# 31. Keep Documentation in Sync

Architecture decisions should be reflected in documentation.

If a change modifies:

* system architecture
* data model
* API behavior
* offline synchronization
* realtime behavior
* authentication
* SDK behavior

update the relevant documentation in the same change whenever possible.

Code and documentation should describe the same system.

---

# 32. Dependency Changes

Before adding a dependency, ask:

1. Do we actually need it?
2. Is the functionality already available?
3. Is the dependency actively maintained?
4. Does it work across the environments where it will be used?
5. Does it significantly increase bundle size?
6. Does it introduce security or licensing concerns?

Avoid dependency bloat.

For workspace dependencies, use pnpm workspace commands rather than manually editing package manifests where possible.

---

# 33. Security

Security-sensitive code deserves additional review.

This includes:

```text
Authentication
Authorization
API keys
Payments
Webhooks
File uploads
QR tokens
Offline synchronization
Database access
SDK authentication
```

Never commit secrets.

If a secret is accidentally committed:

1. Remove it from the repository.
2. Rotate the secret immediately.
3. Check whether it was exposed publicly.
4. Do not assume deleting the commit makes the secret safe.

---

# 34. File Uploads

User files should be handled through the configured file-storage provider.

Do not store large files directly in PostgreSQL.

The backend should control:

```text
who can upload
what can be uploaded
where files belong
who can access them
```

Never trust client-provided file metadata for authorization.

---

# 35. Payments

Billing and subscription state should be treated as backend-controlled data.

The client may display:

```text
Current plan
Usage
Billing status
Upgrade options
```

but must not determine whether a customer is entitled to a paid feature.

The backend should verify subscription state.

Payment-provider webhooks should be validated before changing billing state.

---

# 36. Performance

Do not optimize prematurely.

First prioritize:

```text
Correctness
Security
Maintainability
Reliability
```

Then optimize measured bottlenecks.

For database-heavy operations:

* avoid unnecessary queries
* use appropriate indexes
* paginate large collections
* avoid loading unnecessary records
* use transactions when atomicity is required

For clients:

* avoid unnecessary network requests
* cache appropriate data
* avoid excessive realtime subscriptions
* keep mobile storage efficient

---

# 37. API Versioning

The API should evolve without unnecessarily breaking existing clients.

Breaking changes should be treated as deliberate architectural changes.

The SDK is especially sensitive because external customers may update their applications independently from Roll SYNC.

Prefer:

```text
additive changes
```

over:

```text
breaking changes
```

when possible.

---

# 38. General Engineering Principles

When making a decision, prefer:

```text
Simple > Clever
Explicit > Magical
Typed > Untyped
Server-authoritative > Client-authoritative
Reusable > Duplicated
Idempotent > Fragile
Documented > Assumed
Measured > Guessed
```

Do not introduce abstraction merely for the sake of abstraction.

Roll SYNC is intended to grow into a real product, but the MVP should remain understandable enough for a small engineering team to maintain.

---

# 39. Definition of Done

A change is considered complete when:

* [ ] The implementation works.
* [ ] TypeScript passes.
* [ ] Relevant tests pass.
* [ ] No unnecessary dependencies were introduced.
* [ ] Security implications were considered.
* [ ] API contracts remain valid.
* [ ] Database migrations are included where required.
* [ ] Offline/realtime behavior is preserved where applicable.
* [ ] Documentation is updated when necessary.
* [ ] Environment variables are documented.
* [ ] No secrets are committed.
* [ ] The change is ready for deployment.

---

# 40. Final Principle

Roll SYNC is not three independent applications.

It is one platform with multiple interfaces:

```text
                    ROLL SYNC
                        │
              ┌─────────┼─────────┐
              │         │         │
             WEB      MOBILE     SDK
              │         │         │
              └─────────┼─────────┘
                        │
                       API
                        │
              ┌─────────┼─────────┐
              │         │         │
           Database    Redis     Storage
              │         │         │
              └─────────┼─────────┘
                        │
                  Core Platform
```

Every engineering decision should preserve this principle.

**Build each interface for its users, but keep the backend authoritative, the domain model shared, the contracts stable, and the system simple enough to evolve.**

```
```
