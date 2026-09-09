
---

# Prompt to clean up the Better Auth mess

I would give the agent this as a **separate investigation/fix task**, rather than mixing it with UI work:

```md
# Fix Better Auth Completely

Conduct a full investigation of the current Better Auth + Prisma setup and permanently fix all authentication-related errors.

Do not make assumptions and do not blindly reinstall packages.

## Current Architecture

This project is now a single Next.js full-stack application.

Stack:

- Next.js
- TypeScript
- Prisma 7
- PostgreSQL
- Better Auth
- BullMQ/Redis for background jobs only

There is NO NestJS backend and NO realtime system.

Do not reintroduce either.

## Goal

Make Better Auth completely functional and consistent with Prisma 7 and the current PostgreSQL database.

Email/password authentication must work reliably.

The authentication system must be clean enough that we can proceed with onboarding and dashboard development without repeatedly fighting authentication/database issues.

## Investigation

First inspect the entire authentication setup:

- package.json
- pnpm-lock.yaml
- Better Auth package version
- Better Auth Prisma adapter version
- Prisma version
- @prisma/client version
- prisma.config.ts
- prisma/schema.prisma
- src/lib/prisma.ts
- Better Auth configuration
- auth route handler
- auth client
- environment variable usage
- middleware/proxy if present
- login/sign-up UI
- session retrieval code
- protected route logic

Also inspect the actual database schema where necessary.

Do not assume Prisma 8 commands.

This repository uses Prisma 7.

## Prisma

Verify that Prisma and @prisma/client are on compatible versions.

There must not be:

- Prisma 8
- Prisma Next
- @prisma/orm-postgres
- multiple conflicting Prisma versions
- multiple Prisma clients

Verify the Prisma client can be generated successfully using the commands supported by the installed Prisma 7 version.

Verify that the generated client matches the current schema.

## Better Auth

Verify that Better Auth is correctly configured with the Prisma adapter.

Verify the adapter points to the correct Prisma client.

Verify the Better Auth schema/models match the Prisma schema and database.

If Better Auth requires schema generation, determine the correct command from the installed Better Auth version rather than guessing.

If schema changes are required:

1. update the Prisma schema correctly
2. generate the Prisma client
3. create/apply the appropriate migration
4. verify the live database
5. verify Better Auth again

Do not manually edit the database to hide a schema mismatch.

## Environment

Verify that the required authentication environment variables exist.

Do NOT print secret values.

Check:

- DATABASE_URL
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- any required application URL
- OAuth credentials only if OAuth is configured

If an environment variable is missing or incorrectly named, correct the configuration.

## Email Authentication

Test the complete flow:

1. Sign up
2. Sign in
3. Session creation
4. Session retrieval
5. Access a protected server route
6. Sign out
7. Confirm the session is invalid after sign out

Use the actual running Next.js application.

Do not rely only on static code inspection.

## Dynamic Workspace Authentication

Verify that protected dynamic routes such as:

/[slug]/overview

correctly handle:

- unauthenticated users
- authenticated users
- authenticated users without an organization
- authenticated users with access to the requested organization
- authenticated users attempting to access an organization they do not belong to

Authorization must be checked server-side.

Do not use the slug as proof of authorization.

## Onboarding Compatibility

Make sure authentication provides everything onboarding needs.

The expected flow is:

Sign up/sign in
→ authenticated session
→ onboarding if no organization exists
→ organization creation
→ redirect to /[slug]/overview

Do not require optional organization fields such as logos just to complete onboarding.

## Do Not

Do not:

- introduce NestJS
- introduce a separate API
- introduce realtime
- introduce WebSockets
- introduce Socket.IO
- introduce another authentication provider
- downgrade/upgrade Prisma without a clear compatibility reason
- blindly delete migrations
- reset the production database
- hardcode credentials
- expose secrets
- rewrite unrelated application code

## Final Verification

After fixing everything, ALWAYS run the appropriate checks.

At minimum:

- Prisma validation
- Prisma client generation
- TypeScript/typecheck
- ESLint
- Next.js build
- actual auth flow tests

If any check fails, investigate and fix it before declaring the task complete.

At the end provide a concise report containing:

1. Root cause(s)
2. Files changed
3. Dependency versions
4. Database changes
5. Authentication tests performed
6. Checks performed
7. Remaining issues, if any

Do not report success based only on compilation.

The task is complete only when the actual authentication flow works.