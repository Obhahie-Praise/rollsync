# Roll SYNC AI Context

Roll SYNC is attendance infrastructure built for schools, organizations, and events.

It removes the friction from attendance systems by making attendance collection, tracking, realtime updates, reporting, and synchronization work as one system.

## Repository

Roll SYNC is a pnpm monorepo.

```text
apps/
├── api/       Backend API
├── mobile/    Expo mobile application
├── web/       Next.js web application
└── worker/    Background jobs

packages/
├── eslint-config/
├── typescript-config/
└── ui/        Shared UI components
Product

Roll SYNC supports three primary organization types:

Schools
Industries / organizations
Events

Schools always use a multilevel structure. The data model must support different school sizes, levels, departments, classes, and other organizational units without requiring separate models for each school type.

Attendance is not only about whether someone was present. For schools, it also provides a way to measure teacher punctuality and class attendance performance.

Architecture
apps/web handles the web experience.
apps/mobile handles mobile attendance workflows.
apps/api is the backend and API boundary.
apps/worker handles asynchronous/background processing.
PostgreSQL is the primary database.
Prisma is used for database access/schema management.
Redis is used where queueing and background processing are required.
BullMQ runs on top of Redis for background jobs.
Realtime functionality should follow the documented realtime architecture.
Offline attendance follows the documented offline-sync architecture.

Do not move responsibilities between these applications without a clear architectural reason.

Authentication

Authentication is centralized around the API.

Supported authentication methods:

Email/password
Google OAuth

The web and mobile applications are clients of the backend authentication system.

Never create a separate authentication implementation for an individual client.

Billing

Roll SYNC has:

Free
Roll SYNC Plus
Pro
Ultra
Custom

The Custom plan allows organizations to select specific capabilities, including API-only access.

Plan capabilities should be treated as configurable product features rather than scattered hardcoded checks.

Design Language

Roll SYNC uses a clean, modern, infrastructure-focused visual language.

Key characteristics:

SF Pro / system typography
Light mode by default
Light and dark themes
Blue primary accent
Soft blue-gray backgrounds
Restrained borders
Moderate corner rounding
Generous whitespace
Clear information hierarchy
Minimal iconography
Subtle animation
No unnecessary gradients
No excessive glassmorphism
No artificial "AI" styling

The interface should feel polished, calm, precise, and trustworthy.

Development Philosophy

Build the product feature by feature.

Prefer:

Simple code
Clear naming
Existing project conventions
Reusable code when repetition is real
Small, focused changes
Practical solutions

Avoid:

Premature abstractions
Unnecessary dependencies
Excessive type systems
Over-engineering
Large architectural changes
Generic frameworks built before they are needed

Product and architectural decisions come from the project owners, not from assumptions made by an AI coding agent.

When something is unclear or conflicts with existing documentation, stop and ask.


### `docs/ai/decisions.md`

```md
# AI Development Decisions

This file records important implementation decisions made during AI-assisted development.

Only record decisions that future contributors or AI agents need to understand.

---

## Architecture

### Separate API Application

Roll SYNC uses a dedicated backend API instead of putting core backend logic inside the Next.js application.

**Reason:** Web, mobile, and other clients need to communicate with the same backend.

---

### Worker Application

Background and asynchronous processing belongs in `apps/worker`.

**Reason:** Long-running or queued work should not depend on web request lifetimes.

---

### Redis + BullMQ

Redis provides the underlying queue/storage infrastructure and BullMQ manages background jobs on top of Redis.

**Reason:** They serve different roles and are used together where background processing is required.

---

## Database

### PostgreSQL

PostgreSQL is the primary Roll SYNC database.

### Shared Multilevel Organization Model

Schools use the same general organization model regardless of size or complexity.

**Reason:** A single flexible model avoids separate schemas for simple and complex schools while allowing many rows to represent large organizational structures.

---

## Authentication

### API-Centered Authentication

Authentication is handled through the backend rather than independently inside each client.

**Reason:** Web and mobile should share the same authentication and session rules.

### Authentication Methods

Roll SYNC supports:

- Email/password
- Google OAuth

GitHub authentication is not part of the product.

---

## Product

### School Structure

Schools always operate using a multilevel organizational structure.

There is no onboarding choice between "simple" and "multilevel" school structures.

**Reason:** Keeping one model makes the system predictable and allows smaller schools to grow without migrating their structure later.

---

### Attendance

Attendance is also used to measure teacher punctuality in schools.

**Reason:** A class attendance system can provide useful information about when teachers begin and attend their scheduled classes, not only student presence.

---

## Design

### Theme

Roll SYNC supports exactly two themes:

- Light
- Dark

Light is the default.

The theme switcher uses a single icon button.

---

### Typography

SF Pro is the preferred base typeface where legitimately available, with an appropriate system fallback.

No unofficial SF Pro font files should be introduced.

---

## Development

### AI Has Limited Authority

AI coding agents implement approved requirements but do not make product or architectural decisions independently.

When requirements conflict or an important architectural decision is unclear, the agent should stop and ask.

### Keep Code Human

The project intentionally avoids unnecessary abstractions, excessive type safety, and bloated architecture.

The simplest correct implementation is preferred.