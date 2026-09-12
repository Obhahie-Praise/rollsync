# Roll SYNC — FINAL WEB MVP POLISH + PRODUCTION STABILIZATION

## Objective

This is the final stabilization pass for the Roll SYNC web MVP.

The product functionality is largely implemented.

DO NOT add major features.

The goal is to make the existing web MVP:

- clean
- production-safe
- deployable
- consistent
- role-correct
- free of build/install errors
- free of unnecessary dependencies/configuration
- polished enough to present publicly

The mobile/offline experience is a future phase and must NOT be implemented in this task.

---

# 1. FIRST: AUDIT, DO NOT REWRITE

Before changing anything, inspect the entire current application and identify:

- package.json
- pnpm-workspace.yaml
- pnpm-lock.yaml
- .npmrc if present
- Prisma configuration
- Better Auth configuration
- Next.js configuration
- environment variable usage
- UploadThing configuration
- Polar configuration
- database configuration
- route protection
- shared layouts
- teacher workspace
- organization workspace
- settings
- reports
- timetable
- attendance
- class QR
- production/deployment configuration

Do not rewrite working systems.

Make the smallest set of changes required to reach a clean production state.

---

# 2. FIX PNPM INSTALL FIRST

Current production/deployment failure:

```text
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.

Error: Command "pnpm install" exited with 1
````

This is the highest-priority issue.

Determine exactly which dependency build scripts pnpm is blocking.

Inspect the current pnpm 11 configuration and existing dependency requirements.

DO NOT simply approve every dependency.

DO NOT run an interactive-only solution that will fail again on Vercel/CI.

Use the current pnpm configuration mechanism supported by the installed pnpm version.

Only allow build scripts that are genuinely required for Roll SYNC to install/build correctly.

In particular, verify whether the following require build scripts in the current dependency tree:

* Prisma engines
* Prisma
* Next.js dependencies
* sharp
* unrs-resolver
* other native/build dependencies

Do not enable unnecessary scripts.

If a dependency does NOT need its install/build script, keep it blocked.

The final repository must allow:

```bash
pnpm install
```

to complete successfully in a clean, non-interactive environment.

Do not depend on:

```bash
pnpm approve-builds
```

being manually run by the deployment server.

---

# 3. PACKAGE / DEPENDENCY CLEANUP

Audit dependencies.

Remove packages only when they are genuinely unused.

Do NOT remove packages simply because they are not imported from one obvious file.

Check:

* production dependencies
* dev dependencies
* scripts
* build tooling
* Prisma
* Better Auth
* UploadThing
* Polar
* Framer Motion
* Lucide
* PostCSS/Tailwind
* TypeScript
* ESLint

There must not be:

* duplicate libraries solving the same problem
* abandoned packages
* unnecessary realtime packages
* Socket.IO
* WebSocket infrastructure
* NestJS dependencies
* obsolete API infrastructure
* duplicate authentication libraries
* unused teacher authentication infrastructure
* obsolete invitation/claim infrastructure if it is genuinely unused

Do not introduce replacements just for the sake of cleanup.

---

# 4. PRESERVE THE CURRENT ARCHITECTURE

The final web MVP architecture remains:

```text
Next.js App Router
        │
        ├── Web UI
        ├── Server Components
        ├── Server Actions
        └── Route Handlers
                 │
                 ├── Better Auth
                 ├── Prisma
                 ├── PostgreSQL
                 ├── UploadThing
                 └── existing async infrastructure
```

Do NOT introduce:

* NestJS
* a second API server
* realtime/WebSockets
* Socket.IO
* a new backend
* another ORM
* another authentication system
* another database
* another state-management framework
* unnecessary abstractions

Keep the architecture simple.

---

# 5. PRISMA

Keep Prisma **7.10.0**.

Do NOT migrate to Prisma 8.

Do NOT install Prisma Next.

Do NOT add Prisma AI tooling.

Verify:

```bash
pnpm prisma generate
```

works correctly.

Verify the generated client is correctly imported by the application.

Verify production build can generate Prisma Client.

Do not introduce unnecessary Prisma configuration changes.

---

# 6. BETTER AUTH

Verify the current Better Auth setup.

Confirm:

* catch-all auth route works
* sign up works
* sign in works
* sign out works
* trusted origins are correct
* production base URL handling is correct
* session lookup works server-side
* organization membership resolution works
* teacher context works
* admin/owner context works

Do not create a second authentication system.

Do not expose credentials or secrets.

Do not hard-code production secrets.

---

# 7. ROLE / WORKSPACE BOUNDARY

Final web MVP must have a clean distinction between:

```text
Organization workspace
        ↓
Admin / Owner / permitted organization members

Teacher workspace
        ↓
Teachers
```

Teachers must not have access to organization-only functionality.

This must be enforced server-side.

At minimum verify:

* `/[slug]/overview`
* `/[slug]/organization`
* `/[slug]/people`
* `/[slug]/reports`
* `/[slug]/developers`
* `/[slug]/settings`

are not accessible to teacher-only users.

Teacher landing page:

```text
/[slug]/teacher/today
```

Admin/Owner landing page:

```text
/[slug]/overview
```

Dual-role users must retain both capabilities.

Do not solve this by simply hiding navigation items.

---

# 8. TEACHER EXPERIENCE

The teacher experience should feel intentional, not like a restricted admin dashboard.

Teacher navigation should contain only relevant functionality.

At minimum:

* Today
* My Classes
* Timetable
* Attendance/check-in
* Profile

Teacher login should land on:

```text
/[slug]/teacher/today
```

The Today page should answer:

> What do I need to do right now?

Verify the existing:

* today's timetable
* next class
* check-in
* class QR scanning
* attendance session
* class status
* teacher identity

works using authenticated server-side context.

Do not add new teacher features.

---

# 9. ORGANIZATION EXPERIENCE

Admin/Owner experience should remain intact.

Verify:

* Overview
* People
* Classes
* Subjects
* Rooms
* Timetable
* Reports
* Organization
* Developers
* Settings

continue to work according to existing permissions.

Do not accidentally restrict legitimate organization functionality while fixing teacher access.

---

# 10. ATTENDANCE + QR

Audit the existing teacher class check-in implementation.

Verify:

```text
Admin creates Class
        ↓
Class gets stable publicCode
        ↓
QR represents Class identity
        ↓
Teacher scans QR
        ↓
Server resolves Class
        ↓
Server resolves authenticated Teacher
        ↓
Server resolves timetable
        ↓
Server validates assignment/time/exceptions
        ↓
Teacher confirms
        ↓
Attendance Session created/retrieved
```

Important:

The QR must NOT contain:

* internal database IDs unnecessarily
* teacher identity
* attendance status
* timestamps
* arbitrary client-controlled attendance information

The QR identifies the class.

The server determines everything else.

Verify session creation remains idempotent.

Do not implement student QR attendance in this task.

---

# 11. TIMETABLE / SCHOOL INFRASTRUCTURE

Do not redesign the existing infrastructure.

Verify the current relationships remain coherent:

```text
Organization
 ├── People
 ├── Classes
 ├── Class Memberships
 ├── Subjects
 ├── Teacher Assignments
 ├── Rooms
 └── Timetable
```

Verify that:

* teacher assignments are organization-scoped
* classes are organization-scoped
* timetable entries are organization-scoped
* teacher access uses authenticated identity
* cross-organization access is impossible

---

# 12. ROUTE + DATA SECURITY AUDIT

Search for common security mistakes.

Fix any instances of:

* trusting client-provided user IDs
* trusting client-provided organization IDs
* trusting client-provided roles
* trusting client-provided teacher IDs
* trusting client-provided timestamps for important decisions
* cross-organization database queries
* missing authorization checks
* IDOR vulnerabilities
* sensitive data loaded before authorization
* secrets returned to the browser
* secrets logged
* internal CUIDs unnecessarily exposed

Use authenticated server-side context wherever possible.

---

# 13. ENVIRONMENT VARIABLES

Audit every environment variable.

Separate:

### Server-only

Examples:

```text
DATABASE_URL
BETTER_AUTH_SECRET
UPLOADTHING_TOKEN
POLAR_SECRET
```

from:

### Browser-safe

Examples:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL
```

Do not expose secrets through `NEXT_PUBLIC_*`.

Do not add unnecessary environment variables.

Ensure missing optional integrations fail gracefully where appropriate.

Do not commit `.env`.

Ensure `.env.example` contains only safe placeholders.

---

# 14. NEXT.JS PRODUCTION CHECK

Verify:

* App Router conventions
* server/client boundaries
* async server components
* route handlers
* dynamic routes
* loading/error states where appropriate
* not-found handling
* redirects
* authorization before data fetching
* no accidental server secrets imported into client components

Do not refactor the application into another architecture.

---

# 15. UI POLISH

This is NOT a redesign.

Only fix obvious MVP-quality issues that are discovered during the audit:

* broken links
* dead buttons
* incorrect redirects
* inconsistent labels
* missing loading states
* broken empty states
* obvious overflow issues
* obvious mobile layout issues
* console errors
* hydration issues
* accidental admin UI shown to teachers
* awkward route transitions

Keep the existing visual language.

Do not introduce:

* new design systems
* unnecessary animations
* excessive cards
* gradients everywhere
* AI-looking UI
* decorative components without purpose

The product should feel modern, clean and useful.

---

# 16. ACCESSIBILITY + UX BASICS

Fix obvious issues with:

* keyboard navigation
* button labels
* form labels
* focus states
* disabled/loading states
* modal Escape behavior
* reduced motion
* image alt text
* interactive elements that are not actually buttons/links

Do not turn this into a full accessibility rewrite.

---

# 17. ERROR HANDLING

Audit production error paths.

Important actions should have understandable failure states.

Examples:

* failed login
* unauthorized route
* missing organization
* invalid class QR
* expired/invalid timetable context
* cancelled class
* duplicate check-in
* failed upload
* failed database operation

Do not expose raw database errors, stack traces, secrets, or internal implementation details to users.

---

# 18. REMOVE DEAD / OBSOLETE CODE

Search for code left behind from earlier architecture iterations.

Especially look for:

* NestJS remnants
* old API routes
* realtime code
* Socket.IO
* WebSocket code
* obsolete teacher invitation flows
* obsolete claim flows
* duplicate teacher authentication
* unused attendance implementations
* duplicate organization logic
* unused components
* stale TODOs describing already-completed architecture
* references to removed infrastructure

Only remove code when you are confident it is unused.

Do not delete working code blindly.

---

# 19. PRODUCTION BUILD VALIDATION

Run the following from a clean state:

```bash
pnpm install
pnpm lint
pnpm prisma generate
pnpm run build
```

The most important requirement is:

```bash
pnpm install
```

must succeed WITHOUT interactive approval.

Then:

```bash
pnpm lint
```

must complete cleanly.

Then:

```bash
pnpm run build
```

must complete successfully.

Fix the actual causes of failures.

Do not suppress errors with:

* `eslint-disable`
* `@ts-ignore`
* `any`
* empty catch blocks
* ignored build failures
* fake fallbacks

unless there is a genuine documented reason.

---

# 20. DEPLOYMENT CHECK

Assume deployment runs:

```bash
pnpm install
pnpm run build
```

in a clean environment.

There must be no dependency configuration that assumes a developer has previously run an interactive command locally.

Verify:

* lockfile is committed
* package manager version is consistent
* pnpm configuration is committed
* build scripts are deterministic
* Prisma generation works
* environment variables are documented
* no local-only paths
* no localhost production assumptions

---

# 21. FINAL MVP STANDARD

After this task, Roll SYNC should be presentable as:

> A working web attendance platform for organizations, with a dedicated teacher workflow, timetable/class infrastructure, class QR check-in, attendance sessions, organization management and reporting.

Mobile/offline should remain a future roadmap item.

Do NOT implement mobile in this task.

---

# HARD CONSTRAINTS

DO NOT:

* add major features
* redesign the product
* migrate Prisma
* add realtime
* add WebSockets
* add NestJS
* add a second API
* add new authentication
* add new database infrastructure
* add unnecessary dependencies
* build student QR attendance
* build offline sync
* rewrite working architecture

Prefer:

```text
existing infrastructure
        ↓
small targeted fix
        ↓
verify
```

over:

```text
existing infrastructure
        ↓
rewrite everything
```

---

# FINAL REPORT

At the end, report:

## 1. Production blockers found

List only actual blockers.

## 2. Changes made

Short bullet list.

## 3. PNPM install

State exactly whether:

```bash
pnpm install
```

works non-interactively.

Explain which build scripts were allowed and why.

## 4. Architecture cleanup

List obsolete code/dependencies removed, if any.

## 5. Access control

Confirm teacher vs organization workspace boundaries.

## 6. Validation

```text
pnpm install: PASS/FAIL
pnpm lint: PASS/FAIL
pnpm prisma generate: PASS/FAIL
pnpm run build: PASS/FAIL
```

## 7. Remaining issues

Only list genuine remaining blockers.

Do not claim the application is production-ready if any of the required checks fail.

````

### One thing I'd watch closely

Your immediate error is **not really a Roll SYNC application bug**. It's the dependency-install layer:

```text
pnpm install
      ↓
pnpm build-script policy
      ↓
❌ interactive approval required
````

So tell the agent **not to “fix” it by running `pnpm approve-builds` and calling it done**. The repository needs to contain the configuration that makes a clean CI/deployment install succeed without human interaction.

Given that your local setup previously worked with pnpm 11.11.0 and the `allowBuilds` configuration, I'd have the agent **inspect and reconcile the current `pnpm-workspace.yaml`, lockfile, package manager version, and deployment environment** rather than blindly changing packages.
