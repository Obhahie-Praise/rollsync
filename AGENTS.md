## Project

Roll SYNC is a full-stack Next.js application for attendance management.

The application is intentionally being kept simple at this stage. Do not introduce unnecessary infrastructure or abstractions.

---

## Core Architecture

This project uses:

- Next.js
- TypeScript
- Prisma 7
- PostgreSQL
- Better Auth
- BullMQ for background jobs
- Redis as the BullMQ backend

### IMPORTANT

Next.js is the application backend.

Do NOT create or reintroduce:

- NestJS
- Express
- Fastify
- A separate API application
- `apps/api`
- Realtime/WebSocket infrastructure
- Socket.IO
- SSE
- Redis Pub/Sub
- Any previous Roll SYNC realtime architecture

The web application should handle:

- UI
- Server Components
- Server Actions where appropriate
- Route Handlers where appropriate
- Authentication
- Database access
- Business logic

A separate worker may be introduced later for BullMQ processing, but do not create unnecessary worker infrastructure until it is actually required.

---

# Database

## Prisma

The project uses **Prisma 7**.

Do not upgrade Prisma to Prisma 8, Prisma Next, or any prerelease version.

Do not introduce:

- `@prisma/orm-postgres`
- Prisma Next
- Prisma Developer Platform-specific workflows
- Prisma contract/migration workflows from the previous architecture

Use the standard Prisma 7 workflow supported by the installed project dependencies.

Before executing Prisma commands:

1. Inspect the installed Prisma version.
2. Inspect `prisma.config.ts`.
3. Inspect `package.json`.
4. Inspect the existing Prisma schema.
5. Use commands compatible with the installed Prisma version.

Never blindly assume a Prisma command exists.

The PostgreSQL database is the source of truth for production data.

---

# Prisma Client

Use a single Prisma client throughout the Next.js application.

Keep the Prisma client in:

`src/lib/prisma.ts`

Use the standard development-safe singleton pattern so Next.js hot reload does not create excessive database connections.

Do not create multiple Prisma clients.

Do not import Prisma directly into every component.

Database access belongs in server-side code.

---

# Authentication

Authentication uses **Better Auth**.

Better Auth is responsible for:

- user authentication
- email/password authentication
- sessions
- OAuth providers when configured
- authentication state

Do not create a second authentication system.

Do not manually implement session handling if Better Auth already provides the required functionality.

Do not replace Better Auth with:

- NextAuth/Auth.js
- custom JWT authentication
- Clerk
- Supabase Auth
- Firebase Auth

---

# Better Auth + Prisma

Better Auth uses the Prisma adapter.

The Better Auth database models must remain compatible with the actual Prisma schema and database.

If Better Auth reports a schema mismatch:

1. Inspect the Better Auth configuration.
2. Inspect the Prisma schema.
3. Inspect the generated Prisma client.
4. Inspect the live database schema.
5. Determine which source is incorrect.
6. Fix the root cause.

Do not randomly add fields or tables.

Do not modify the database manually without understanding the migration state.

Do not assume that "generate" means the same thing across Prisma and Better Auth.

Always inspect the installed package versions and available CLI commands first.

---

# Redis / BullMQ

Redis is used ONLY for BullMQ/background jobs.

There is no realtime system.

Do not implement:

- WebSockets
- Socket.IO
- SSE
- realtime subscriptions
- Redis Pub/Sub
- realtime presence
- live event broadcasting

BullMQ may be used for:

- background processing
- asynchronous sync jobs
- scheduled work
- heavy processing
- retryable tasks

Do not use Redis simply because it is available.

If a task does not require a background job, keep it inside the normal Next.js request/server flow.

---

# Routing

Organization/workspace routes use a generic dynamic `slug`.

Do NOT call this `school_slug`.

A slug may represent:

- school
- organization
- event
- other supported organization types

Current application routes:

- `/<slug>/overview`
- `/<slug>/attendance/session`
- `/<slug>/attendance/record`
- `/<slug>/people`
- `/<slug>/organization`
- `/<slug>/reports`
- `/<slug>/developers`
- `/<slug>/settings`
- `/<slug>/help`

The dynamic route must remain generic.

---

# Authentication + Dynamic Routes

Dynamic workspace routes are protected.

When a user accesses:

`/<slug>/*`

the application must verify that:

1. The user has a valid Better Auth session.
2. The requested organization/workspace exists.
3. The user has access to that organization/workspace.

Do not rely on the slug alone for authorization.

A valid session does not automatically grant access to every slug.

The organization membership must be checked server-side.

Unauthenticated users should be redirected to the appropriate authentication flow.

Authenticated users without an organization should be sent through onboarding where appropriate.

---

# Onboarding

Onboarding creates the user's initial organization/workspace.

The organization type may represent:

- school
- organization
- event

Do not assume every workspace is a school.

The slug is generated from the organization/workspace name and must handle collisions safely.

Onboarding should only require information that is actually necessary to create the organization.

Do not make optional fields block onboarding.

For example:

- logo is optional
- description is optional
- other presentation metadata is optional

If an optional field fails, onboarding should not unnecessarily fail.

---

# Frontend

Use standard Next.js patterns.

Prefer:

- Server Components by default
- Client Components only when interactivity requires them
- Server-side authentication checks
- Server-side authorization checks
- Server Actions where they simplify mutations
- Route Handlers where an HTTP endpoint is actually needed

Do not turn entire pages into Client Components unnecessarily.

---

# UI

Keep the UI clean and modern.

Do not introduce unnecessary design systems or dependencies.

Do not add fancy fonts unless explicitly requested.

Use the existing styling system and component library already present in the repository.

Do not redesign existing UI unless the task explicitly requests it.

---

# Code Quality

TypeScript must remain strict.

Do not use:

```ts
any
````

unless there is an unavoidable third-party typing issue and the reason is documented.

Prefer:

* explicit types
* interfaces/types where appropriate
* small focused functions
* clear naming
* server/client boundaries that are obvious

Avoid unnecessary abstraction.

Do not create files simply to make the architecture look sophisticated.

---

# Dependencies

Before installing a package:

1. Check whether the functionality already exists in the project.
2. Check whether an existing dependency can solve the problem.
3. Only install a new dependency when it provides clear value.

Do not upgrade major dependencies unless explicitly requested.

Do not change Prisma versions.

Do not introduce infrastructure from the previous backend architecture.

---

# Environment Variables

Environment variables belong in `.env.local` for local Next.js development unless the project already has a deliberate environment strategy.

Never hardcode:

* database credentials
* Better Auth secrets
* OAuth secrets
* Redis credentials
* API keys
* payment credentials

Never print secret values in logs, reports, or terminal output.

When debugging environment variables, verify that the variable exists without exposing its value.

---

# Existing Project Before Adding Code

Before changing architecture or creating new files:

1. Inspect the repository structure.
2. Inspect `package.json`.
3. Inspect `prisma.config.ts`.
4. Inspect `prisma/schema.prisma`.
5. Inspect Better Auth configuration.
6. Inspect `src/lib/prisma.ts`.
7. Inspect existing route structure.
8. Reuse existing code when appropriate.

Do not assume files exist.

Do not recreate infrastructure that already exists.

---

# Task Execution Rules

For every task:

### 1. Investigate first

Understand the existing implementation before modifying it.

### 2. Make the smallest correct change

Do not refactor unrelated parts of the application.

### 3. Preserve the architecture

Do not reintroduce the old NestJS/realtime architecture.

### 4. Verify the result

After completing the task, ALWAYS run appropriate checks.

At minimum, when applicable:

* TypeScript/typecheck
* ESLint
* relevant tests
* Next.js build
* Prisma validation/generation checks

Use the commands actually defined by the repository.

Do not claim a task is complete without checking the result.

### 5. Fix newly introduced errors

If the checks reveal errors caused by the changes, fix them before declaring success.

### 6. Report honestly

At the end of every task, report:

* what changed
* files changed
* checks run
* whether checks passed
* any remaining unrelated issues

Never say "done" when the project has known errors introduced by the task.

---

# Important Architectural Rule

When uncertain between a simple Next.js solution and introducing another service/system:

**Choose the simple Next.js solution.**

The project is intentionally starting over with a clean Next.js full-stack architecture.

Do not bring back complexity from the previous Roll SYNC backend.

````