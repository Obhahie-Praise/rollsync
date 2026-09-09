````md
# Roll SYNC — Development Guide

This document defines how Roll SYNC is developed, run, tested, and prepared for deployment.

It focuses on the **day-to-day engineering workflow** rather than the architecture itself.

For architectural decisions, see [`decisions.md`](./decisions.md).

For the overall system design, see [`../docs/architecture.md`](../docs/architecture.md).

---

## 1. Development Philosophy

Roll SYNC is being built as a real product, not as three disconnected school-project demos.

Development should therefore prioritize:

- correctness
- strong typing
- clear boundaries
- simple abstractions
- reusable code
- predictable APIs
- security
- reliable offline behavior
- production-ready foundations

At the same time, the project should not be unnecessarily over-engineered.

The rule is:

> Build what the product needs now, while keeping the architecture ready for what it will need next.

---

# 2. Repository

Roll SYNC is a pnpm monorepo.

The repository contains multiple applications and shared packages.

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
├── engineering/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── pnpm-lock.yaml
````

All development commands should normally be run from the repository root.

---

# 3. Required Tooling

The development environment requires:

* Node.js
* pnpm
* Git

The project uses the Node.js version declared in the root `package.json`.

Check the installed versions:

```bash
node --version
pnpm --version
git --version
```

If the repository specifies a newer Node.js version, use that version before developing.

---

# 4. Installing the Project

Clone the repository:

```bash
git clone <repository-url>
cd roll-sync
```

Install all workspace dependencies:

```bash
pnpm install
```

Do not run separate `npm install` or `yarn install` commands inside applications.

The workspace is managed by pnpm.

---

# 5. Environment Configuration

Each application should provide an example environment file where required.

Never commit actual secrets.

Typical configuration may include:

```text
DATABASE_URL
BETTER_AUTH_SECRET
REDIS_URL
UPLOADTHING_TOKEN
POLAR_ACCESS_TOKEN
API_URL
NEXT_PUBLIC_API_URL
```

The exact variables depend on the application.

The expected development process is:

```text
.env.example
     ↓
.env.local / .env
     ↓
Local application
```

Environment files containing secrets must remain untracked.

---

# 6. Running Development

Run the full development environment:

```bash
pnpm dev
```

When working on a specific application, use pnpm filters.

### Web

```bash
pnpm --filter web dev
```

### API

```bash
pnpm --filter api dev
```

### Mobile

```bash
pnpm --filter mobile start
```

The exact package names may change as the monorepo evolves.

---

# 7. Workspace Commands

pnpm filters allow commands to target a specific workspace.

General form:

```bash
pnpm --filter <package> <command>
```

Examples:

```bash
pnpm --filter web build
pnpm --filter api test
pnpm --filter mobile lint
```

Use filtered commands when debugging or developing a single application.

Use root commands when validating the entire repository.

---

# 8. Build

The repository uses Turborepo to coordinate builds across the monorepo.

Build everything:

```bash
pnpm build
```

Build one workspace:

```bash
pnpm --filter <package> build
```

A successful local build should be treated as a requirement before deployment.

---

# 9. Type Checking

Roll SYNC is strongly typed.

Run the repository's type-checking command:

```bash
pnpm typecheck
```

If a root script is not available, run the appropriate workspace command:

```bash
pnpm --filter <package> typecheck
```

Type errors should not be ignored or hidden with unnecessary casts.

Avoid:

```ts
const value = something as any;
```

Prefer correcting the underlying type.

---

# 10. Linting

Run linting before committing:

```bash
pnpm lint
```

Linting should catch:

* unused variables
* invalid imports
* problematic patterns
* inconsistent code
* framework-specific issues

Do not disable lint rules globally to make an error disappear.

If an exception is genuinely required, keep the exception as narrow as possible and document why.

---

# 11. Formatting

Roll SYNC uses Prettier.

Format the repository using the configured script:

```bash
pnpm format
```

If checking formatting without modifying files:

```bash
pnpm format:check
```

Do not manually fight the formatter.

The repository's formatting configuration is the source of truth.

---

# 12. Testing

Tests should be added alongside meaningful functionality.

Prioritize testing for:

* authentication
* authorization
* attendance
* offline synchronization
* API behavior
* database operations
* background jobs
* billing
* SDK behavior
* integrations

Run the project's test suite with:

```bash
pnpm test
```

For a specific package:

```bash
pnpm --filter <package> test
```

---

# 13. Development Order

When implementing a new feature that crosses multiple surfaces, generally work from the domain outward.

Preferred order:

```text
1. Domain requirements
        ↓
2. Database model
        ↓
3. Backend service
        ↓
4. API endpoint / contract
        ↓
5. Shared types / schemas
        ↓
6. Web implementation
        ↓
7. Mobile implementation
        ↓
8. SDK implementation
        ↓
9. Tests
        ↓
10. Documentation
```

This prevents clients from inventing their own versions of backend behavior.

Not every feature requires every step.

Use judgment.

---

# 14. Backend Development

The backend is the authoritative application layer.

Backend code is responsible for:

* authentication
* authorization
* validation
* business rules
* database access
* transactions
* background jobs
* integrations
* billing enforcement
* API responses

The backend should not contain UI concerns.

Likewise, clients should not contain authoritative backend business rules.

---

# 15. Database Development

Prisma belongs to the backend.

The normal data flow is:

```text
Client
  ↓
API
  ↓
Service / Domain Logic
  ↓
Prisma
  ↓
PostgreSQL
```

Do not import Prisma into:

```text
Web client code
Mobile code
SDK client code
```

---

# 16. Database Migrations

When the database schema changes, create a Prisma migration.

For development:

```bash
pnpm prisma migrate dev
```

Review generated migrations before committing them.

Do not manually modify migration files unless you understand exactly why the change is necessary.

A schema change should normally include:

```text
Schema
+
Migration
+
Updated backend code
+
Updated types
+
Tests
```

when applicable.

---

# 17. Database Seed Data

Development seed data should be safe and deterministic.

Seed data may represent:

```text
Organizations
People
Organization units
Attendance contexts
Sessions
Attendance records
Development users
```

Never put real customer data into development seeds.

Never commit production credentials into seed scripts.

---

# 18. API Development

The API is the common backend interface for:

```text
Web
Mobile
SDK
Third-party applications
```

When adding an endpoint:

1. Define the purpose.
2. Define request input.
3. Define authentication requirements.
4. Define authorization requirements.
5. Validate input.
6. Execute domain logic.
7. Return a predictable response.
8. Handle errors.
9. Add tests.
10. Update documentation where appropriate.

---

# 19. API Route Structure

Avoid putting large amounts of business logic directly inside route handlers.

Prefer:

```text
Route
  ↓
Validation
  ↓
Service / Domain Logic
  ↓
Repository / Prisma
```

Instead of:

```text
Route
  ↓
200 lines of business logic
  ↓
Database
```

Route handlers should primarily coordinate requests and responses.

---

# 20. Validation

Validate data at the API boundary.

Client validation is useful for user experience but is not a security mechanism.

The server must assume all incoming data is untrusted.

For example:

```text
Mobile
  ↓
"attendanceStatus": "PRESENT"
  ↓
API validation
  ↓
Authorization
  ↓
Business rules
  ↓
Database
```

Shared schemas may be used where appropriate to keep clients consistent with the API.

---

# 21. Authentication Development

Authentication is centralized.

The web, mobile application, and SDK should ultimately interact with the same identity system.

When modifying authentication, consider all surfaces:

```text
Web
Mobile
API
SDK
```

Do not create a separate authentication implementation for each client.

Authentication secrets must never be committed.

---

# 22. Authorization Development

Every protected operation must perform server-side authorization.

Never rely on:

```text
hidden buttons
disabled UI
client-side route protection
```

as the actual security boundary.

For organization-owned resources:

```text
Authenticated User
        ↓
Organization Membership
        ↓
Required Permission
        ↓
Requested Resource
```

The API must verify the complete chain.

---

# 23. Offline Development

Offline functionality is primarily a mobile concern.

A mobile operation should follow:

```text
User Action
    ↓
Local Persistence
    ↓
Pending Operation
    ↓
Connection Available
    ↓
API Request
    ↓
Server Result
    ↓
Local Reconciliation
```

Do not design offline functionality as:

```text
Try API
↓
If it fails, maybe save locally
```

The local operation should be considered first-class.

Read:

```text
../docs/offline-sync.md
```

before changing synchronization behavior.

---

# 24. Offline Operation Requirements

Every synchronizable operation should have a stable operation identity.

Conceptually:

```text
operation_id
```

This allows the backend to recognize retries.

Example:

```text
Mobile
  ↓
operation_id = abc123
  ↓
API
  ↓
Attendance created
```

If the mobile application retries:

```text
operation_id = abc123
```

the backend should not create another attendance record.

This is essential for reliable offline behavior.

---

# 25. Realtime Development

Realtime functionality should be implemented around meaningful domain events.

Examples:

```text
Attendance recorded
Attendance updated
Session opened
Session closed
Participant joined
```

Avoid using realtime as a replacement for normal data fetching.

The normal model is:

```text
Fetch initial state
       ↓
Subscribe to relevant events
       ↓
Update local state
```

Read:

```text
../docs/realtime.md
```

before changing realtime behavior.

---

# 26. Background Jobs

Background work should not unnecessarily block API requests.

Preferred pattern:

```text
API
 ↓
Persist required state
 ↓
Create queue job
 ↓
Return response
```

Worker:

```text
Queue
 ↓
Worker
 ↓
Process
 ↓
Update state
```

Background jobs should be retry-safe.

Do not assume a job executes only once.

---

# 27. Queue Development

When creating a new queue:

1. Define the job purpose.
2. Define the payload.
3. Define retry behavior.
4. Define failure behavior.
5. Define idempotency strategy.
6. Define monitoring/logging.
7. Define what happens after permanent failure.

Keep queue payloads small.

Do not put unnecessary database records or large objects inside queue messages.

Prefer IDs and minimal context.

---

# 28. SDK Development

The SDK is an external-facing interface.

SDK code must communicate with the public API.

```text
External App
    ↓
Roll SYNC SDK
    ↓
Roll SYNC API
```

The SDK should:

* provide a simple developer experience
* expose stable domain concepts
* handle authentication appropriately
* provide useful types
* provide predictable errors
* avoid leaking internal implementation details

Do not expose Prisma models as the SDK's public API.

---

# 29. SDK Compatibility

SDK changes require additional caution because external applications may not update at the same time as the Roll SYNC backend.

Prefer additive changes.

For example:

```text
Existing endpoint
+
New optional field
```

is generally safer than:

```text
Rename required field
+
Remove old field
```

Breaking changes should be deliberate and documented.

---

# 30. Web Development

The web application should primarily handle:

* organization setup
* dashboards
* attendance configuration
* reporting
* administration
* event management
* account management

Web components should not directly access backend infrastructure.

Use the API.

---

# 31. Mobile Development

The mobile application should prioritize:

* fast attendance actions
* minimal friction
* offline operation
* synchronization
* device capabilities
* clear synchronization status

Network availability should not unnecessarily block the user from recording attendance intent.

The UI should communicate synchronization state when necessary without making users think about the underlying infrastructure.

---

# 32. Attendance Feature Development

Attendance features should use the shared attendance domain.

Different methods may include:

```text
QR
Roll Call
ID Scan
Manual
Mobile
Import
```

The method is metadata about how an attendance record was created.

Do not create a completely separate data model for every attendance mechanism.

---

# 33. QR Development

QR codes are a mechanism for initiating attendance operations.

The QR payload should not be treated as the attendance record itself.

Typical flow:

```text
QR Scan
   ↓
Resolve attendance context/session
   ↓
Validate token/session
   ↓
Identify participant
   ↓
Authorize
   ↓
Create attendance record
```

Any security-sensitive decision must happen on the backend.

---

# 34. File Storage

Files should be stored using the configured file-storage provider.

The database should generally contain file metadata or references rather than large binary files.

Typical flow:

```text
Client
  ↓
Upload
  ↓
Storage Provider
  ↓
File Reference
  ↓
Backend / Database
```

Access control remains a backend responsibility.

---

# 35. Billing Development

Billing is an organization-level concern.

The application should determine feature access based on server-side subscription state.

Conceptually:

```text
Organization
    ↓
Subscription
    ↓
Plan
    ↓
Entitlements
```

Clients may display billing information, but they must not decide whether an organization has paid access.

---

# 36. Error Handling

Errors should be predictable.

The API should distinguish between categories such as:

```text
400 — Invalid input
401 — Unauthenticated
403 — Unauthorized
404 — Resource not found
409 — Conflict
429 — Rate limited
500 — Internal server error
```

Exact conventions may depend on the API framework.

Never expose internal stack traces, secrets, or infrastructure details to users.

---

# 37. Logging

Logs should answer:

> What happened, where, and why?

Useful logs include:

```text
Attendance synchronization failed
Background job retrying
Webhook delivery failed
Session created
Authentication failure
```

Never log:

```text
Passwords
Access tokens
API secrets
Authentication secrets
Sensitive personal information
```

Use structured logs when possible.

---

# 38. Git Workflow

Before beginning work:

```bash
git pull
```

Create a focused branch:

```bash
git checkout -b feat/attendance-session
```

or:

```bash
git checkout -b fix/offline-sync
```

Keep commits focused.

---

# 39. Commit Convention

Use descriptive conventional-style commits.

Examples:

```text
feat: add attendance session creation
fix: prevent duplicate offline attendance
refactor: simplify attendance validation
docs: update offline sync documentation
test: add attendance authorization tests
chore: update dependencies
```

Avoid:

```text
update
stuff
changes
final
fix
```

---

# 40. Pre-Commit Checklist

Before committing:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use only the commands configured by the repository.

If one of these commands does not exist yet, use the appropriate workspace command.

Check Git:

```bash
git status
git diff
```

Make sure there are no:

* secrets
* debug logs
* accidental files
* generated files that should not be committed
* unrelated changes

---

# 41. Pull Request Checklist

Before opening a pull request:

* [ ] Feature works locally.
* [ ] Types pass.
* [ ] Lint passes.
* [ ] Relevant tests pass.
* [ ] Build succeeds.
* [ ] Database migrations are included if necessary.
* [ ] Environment variables are documented.
* [ ] No secrets are committed.
* [ ] API changes are documented.
* [ ] Offline behavior is considered where relevant.
* [ ] Realtime behavior is considered where relevant.
* [ ] SDK compatibility is considered where relevant.
* [ ] Documentation is updated where necessary.

---

# 42. Deployment Workflow

The preferred development lifecycle is:

```text
Local Development
       ↓
Type Check
       ↓
Lint
       ↓
Tests
       ↓
Build
       ↓
Commit
       ↓
Push
       ↓
Deployment
       ↓
Production Verification
```

Do not use production as the first place to discover whether the application builds.

---

# 43. Environment Separation

Roll SYNC should distinguish between:

```text
Development
Staging
Production
```

where the infrastructure supports it.

Development data must never accidentally point at production databases.

Production secrets must never be used in local development unless explicitly required and secured.

---

# 44. Production Safety

Before making production changes:

1. Understand the change.
2. Check whether database migrations are involved.
3. Check whether API contracts change.
4. Check whether mobile clients may still be using an older API.
5. Check whether SDK consumers may be affected.
6. Consider rollback.
7. Verify environment variables.
8. Monitor the deployment afterward.

---

# 45. Adding a New Feature

A new cross-platform feature should generally follow this process:

### Step 1 — Define the requirement

Describe the user problem.

### Step 2 — Define the domain

Determine what entities and relationships are involved.

### Step 3 — Define the API

Determine how clients interact with the feature.

### Step 4 — Implement the backend

Add validation, authorization, business logic, and persistence.

### Step 5 — Implement clients

Add the appropriate Web and/or Mobile experience.

### Step 6 — Add SDK support

If the capability is intended for external developers, expose it through the SDK.

### Step 7 — Add tests

Test the critical paths.

### Step 8 — Update documentation

Document architectural or API changes.

---

# 46. Avoiding Bloat

Before introducing a new abstraction, ask:

> Does this solve a real problem we currently have?

Avoid creating:

```text
services
managers
factories
repositories
event buses
microservices
utility packages
```

without a clear reason.

Abstractions should make the system easier to understand, not merely more technically impressive.

---

# 47. Dependency Rules

Before adding a dependency:

* verify that the functionality is actually needed
* check whether the project already has an equivalent
* verify compatibility with the affected platform
* consider bundle size
* consider maintenance
* consider security
* consider licensing

Use pnpm to add dependencies.

Example:

```bash
pnpm add <package> --filter <workspace>
```

For development dependencies:

```bash
pnpm add -D <package> --filter <workspace>
```

---

# 48. Source of Truth

When multiple pieces of code appear to know the same thing, identify the authoritative source.

Generally:

```text
Database
    ↓
Backend
    ↓
API
    ↓
Clients
```

The database is the persistent source of truth.

The backend is the business authority.

The API is the client-facing contract.

Clients maintain local representations for performance and offline behavior.

---

# 49. When Things Go Wrong

Do not immediately rewrite the architecture.

First determine:

```text
What failed?
Where did it fail?
Why did it fail?
Is the failure local or architectural?
Can the smallest change fix it?
```

Prefer fixing the smallest responsible layer.

For example:

```text
UI bug
→ Fix UI

API validation bug
→ Fix API

Database query bug
→ Fix database/backend layer

Offline reconciliation bug
→ Fix synchronization layer
```

Do not solve every problem by adding another abstraction.

---

# 50. Documentation Rule

If implementation changes the system's behavior, architecture, or public interface, documentation should change with it.

Important documentation includes:

```text
README.md
docs/product.md
docs/architecture.md
docs/data-model.md
docs/offline-sync.md
docs/realtime.md
engineering/contributing.md
engineering/decisions.md
engineering/development.md
```

Documentation should explain decisions and contracts, not simply repeat code.

---

# 51. Definition of Done

A development task is complete when:

```text
[ ] Requirements are satisfied
[ ] Implementation is typed
[ ] Validation exists
[ ] Authorization exists where required
[ ] Tests cover important behavior
[ ] Offline behavior works where required
[ ] Realtime behavior works where required
[ ] Database migrations are correct
[ ] API contracts are stable
[ ] SDK compatibility is considered
[ ] Documentation is updated
[ ] Build succeeds
[ ] No secrets are committed
[ ] Changes are committed cleanly
```

---

# 52. The Golden Rule

When developing Roll SYNC, remember:

> **The client handles experience. The API handles authority. The database holds state. The queue handles work that does not need to happen immediately.**

And across the entire system:

```text
WEB ──────┐
          │
MOBILE ───┼──► API ───► DOMAIN ───► DATABASE
          │      │
SDK ──────┘      ├──────► REDIS / WORKERS
                 │
                 ├──────► FILE STORAGE
                 │
                 └──────► BILLING / EXTERNAL SERVICES
```

Keep these boundaries clear, keep the code strongly typed, and keep the implementation as simple as the product allows.

```
```
