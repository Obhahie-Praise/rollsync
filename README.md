# Roll SYNC

> **Fast attendance. Reliable infrastructure. Built for everywhere.**

Roll SYNC is a cross-platform, offline-first attendance platform designed to make attendance collection fast, flexible, reliable, and easy to integrate.

Instead of treating attendance as a single form or scanning method, Roll SYNC provides a unified infrastructure that allows organizations to collect, verify, synchronize, analyze, and integrate attendance data through multiple methods and across multiple platforms.

The platform is designed for:

* Schools
* Universities
* Events
* Organizations
* Communities
* Workplaces
* Training programs
* Clubs
* Conferences
* Any environment where knowing who was present matters

---

## Table of Contents

* [What is Roll SYNC?](#what-is-roll-sync)
* [The Core Idea](#the-core-idea)
* [Product Surfaces](#product-surfaces)
* [How the System Works](#how-the-system-works)
* [Repository Structure](#repository-structure)
* [Architecture](#architecture)
* [Client and Server Boundaries](#client-and-server-boundaries)
* [Attendance](#attendance)
* [Offline-First Mobile](#offline-first-mobile)
* [Realtime](#realtime)
* [Background Processing](#background-processing)
* [API and SDK](#api-and-sdk)
* [Authentication](#authentication)
* [Data and Storage](#data-and-storage)
* [Billing](#billing)
* [Technology Stack](#technology-stack)
* [Development](#development)
* [Environment Variables](#environment-variables)
* [Testing](#testing)
* [Deployment](#deployment)
* [Security Principles](#security-principles)
* [Development Principles](#development-principles)
* [Documentation](#documentation)
* [Project Status](#project-status)
* [Long-Term Vision](#long-term-vision)
* [License](#license)

---

# What is Roll SYNC?

Roll SYNC is a unified attendance infrastructure platform.

The simplest way to think about it is:

> **A flexible attendance engine that can be accessed through a web application, mobile application, API, or SDK.**

Traditional attendance systems usually force an organization into one workflow:

* A Google Form
* A spreadsheet
* Manual roll call
* A QR scanner
* An ID card system
* A custom application

These approaches can work individually, but they are often disconnected from each other.

Roll SYNC attempts to unify these workflows.

An organization should be able to create an attendance session and choose how people are allowed to indicate their presence.

Possible methods include:

* QR code scanning
* Roll call
* ID scanning
* Mobile check-in
* Organizer-assisted check-in
* API submissions
* Third-party integrations
* Future hardware-based methods

Regardless of how attendance is collected, the result should eventually become a consistent Roll SYNC attendance record.

---

# The Core Idea

Roll SYNC is built around a simple principle:

> **Attendance should be an action, not a process.**

Someone arriving at an event should not have to spend several minutes filling out a form just to say they are present.

The ideal interaction is:

```text
Arrive
  ↓
Identify / Scan / Confirm
  ↓
Attendance Recorded
```

For users with the Roll SYNC mobile application, the interaction can become even more resilient:

```text
User Action
    ↓
Local Recording
    ↓
Immediate Feedback
    ↓
Synchronization Later
```

This allows the system to continue functioning in environments where network connectivity is poor, unreliable, or temporarily unavailable.

---

# Product Surfaces

Roll SYNC has three primary interfaces:

```text
                         ROLL SYNC
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
            WEB           MOBILE           API
              │              │              │
              └──────────────┼──────────────┘
                             │
                       BACKEND CORE
```

These are not three independent products.

They are three clients/interfaces built around the same backend infrastructure.

## Web Application

Located at:

```text
apps/web
```

The web application is primarily intended for organizers, administrators, organizations, and operators.

It provides interfaces for:

* Creating events
* Creating attendance sessions
* Configuring attendance methods
* Managing participants
* Monitoring attendance
* Viewing live attendance
* Reviewing attendance history
* Exporting data
* Managing organizations
* Managing integrations
* Managing API credentials
* Managing billing
* Viewing analytics

The web application does not communicate directly with the database.

Instead:

```text
Web
 ↓
Roll SYNC API
 ↓
Backend Services
 ↓
Database / External Services
```

---

## Mobile Application

Located at:

```text
apps/mobile
```

The mobile application is intended primarily for attendees and mobile organizers.

It provides capabilities such as:

* Event participation
* QR scanning
* Mobile check-in
* Attendance confirmation
* Offline attendance intent
* Local persistence
* Background synchronization
* Synchronization status
* Notifications

The mobile application is designed around an offline-first philosophy.

A mobile device should not be treated as a frontend that becomes useless when the network disappears.

Instead, it should be capable of safely recording user intent locally and synchronizing it with the backend when connectivity becomes available.

---

## Backend API

Located at:

```text
apps/api
```

The API is the central backend application.

It is deliberately independent of the web application because Roll SYNC has multiple clients.

The API is consumed by:

* The Web application
* The Mobile application
* The Roll SYNC SDK
* Authorized third-party applications

The API is responsible for:

* Authentication
* Authorization
* Organizations
* Users
* Events
* Attendance
* Integrations
* API keys
* Billing
* Webhooks
* File operations
* Realtime functionality
* Job creation
* Server-side validation

The backend is the authoritative source of truth for server-side state.

---

# How the System Works

At a high level:

```text
                    ┌───────────────┐
                    │  Web Client   │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │               │
                    │  Roll SYNC    │
                    │      API      │
                    │               │
                    └───┬───────┬───┘
                        │       │
               ┌────────┘       └─────────┐
               ▼                          ▼
        ┌─────────────┐            ┌─────────────┐
        │ PostgreSQL  │            │    Redis    │
        │    Neon     │            │   BullMQ    │
        └─────────────┘            └──────┬──────┘
                                         │
                                   ┌─────▼─────┐
                                   │  Worker   │
                                   └───────────┘
```

Mobile follows the same server architecture but adds a local persistence and synchronization layer:

```text
                    MOBILE
                       │
                  User Action
                       │
               ┌───────▼────────┐
               │  Local Storage │
               └───────┬────────┘
                       │
                 Pending Intent
                       │
               ┌───────▼────────┐
               │   Sync Engine  │
               └───────┬────────┘
                       │
                Network Available
                       │
                       ▼
                 Roll SYNC API
                       │
                       ▼
                Server Validation
                       │
                       ▼
                  PostgreSQL
```

---

# Repository Structure

Roll SYNC is organized as a monorepo using pnpm workspaces and Turborepo.

```text
roll-sync/
│
├── apps/
│   ├── web/
│   │   └── Next.js web application
│   │
│   ├── mobile/
│   │   └── Expo / React Native mobile application
│   │
│   ├── api/
│   │   └── NestJS backend API
│   │
│   └── worker/
│       └── Background job processor
│
├── packages/
│   ├── database/
│   │   └── Prisma database layer
│   │
│   ├── sdk/
│   │   └── Public Roll SYNC SDK
│   │
│   ├── types/
│   │   └── Shared TypeScript types
│   │
│   ├── validation/
│   │   └── Shared data validation
│   │
│   ├── eslint-config/
│   │   └── Shared ESLint configuration
│   │
│   └── typescript-config/
│       └── Shared TypeScript configuration
│
├── docs/
│   └── Project and architecture documentation
│
├── .github/
│   └── GitHub workflows and repository configuration
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── README.md
```

The exact contents of `packages/` may evolve as the product grows.

The important architectural distinction is:

```text
apps/
```

contains executable applications and services, while:

```text
packages/
```

contains reusable libraries shared by those applications.

---

# Architecture

Roll SYNC follows a client-server architecture with a centralized backend and asynchronous processing infrastructure.

```text
┌─────────────────────────────────────────────────────┐
│                     CLIENTS                         │
│                                                     │
│    Web              Mobile             Third Party  │
│     │                  │                    │        │
└─────┼──────────────────┼────────────────────┼────────┘
      │                  │                    │
      └──────────────────┼────────────────────┘
                         │
                         ▼
                ┌───────────────────┐
                │   Roll SYNC API   │
                │      NestJS       │
                └─────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
       PostgreSQL       Redis      External
         / Neon        / BullMQ    Services
             │            │
             │            ▼
             │          Worker
             │
             ▼
       Persistent State
```

The API handles synchronous operations.

The worker handles asynchronous operations.

---

# Client and Server Boundaries

One of the most important rules in the project is maintaining a strict boundary between clients and backend infrastructure.

## Clients must not access

* PostgreSQL directly
* Prisma directly
* Redis directly
* Private storage credentials
* Billing secrets
* Server authentication secrets
* Internal service credentials

Instead:

```text
Web ─────────┐
             │
Mobile ──────┼──────→ API
             │
SDK ─────────┘
```

The API then communicates with:

```text
API
├── Database
├── Redis
├── File Storage
├── Authentication
├── Billing
└── External Integrations
```

This keeps sensitive infrastructure behind a controlled server boundary.

---

# Attendance

Attendance is the core domain of Roll SYNC.

The system separates several concepts that are often mixed together in simple attendance applications.

At a high level:

```text
Organization
     ↓
Event
     ↓
Attendance Session
     ↓
Attendance Method
     ↓
Participant
     ↓
Attendance Intent
     ↓
Attendance Record
```

An **event** represents the overall activity.

An **attendance session** represents the period during which attendance can be recorded.

An **attendance method** defines how someone can indicate their presence.

An **attendance intent** represents a client's attempt to record attendance.

An **attendance record** represents server-confirmed attendance.

---

## Attendance Methods

The system is designed to support multiple methods without creating separate attendance systems for each method.

Examples include:

```text
QR Code
Roll Call
ID Scan
Mobile Check-in
Organizer Check-in
API
Hardware
```

All methods should eventually converge into the same attendance domain:

```text
QR Scan ────────┐
                │
Roll Call ──────┤
                │
ID Scan ────────┼──→ Attendance Intent
                │
Mobile ────────┤
                │
API ────────────┘
                       ↓
                Server Validation
                       ↓
                Attendance Record
```

This allows new attendance methods to be added without redesigning the entire attendance system.

---

# Offline-First Mobile

Offline support is a fundamental feature rather than an optional enhancement.

The mobile application should be capable of recording attendance intent without an active internet connection.

The fundamental model is:

> **Local availability first. Server authority always.**

When online:

```text
User
 ↓
Mobile App
 ↓
API
 ↓
Server Validation
 ↓
Database
```

When offline:

```text
User
 ↓
Mobile App
 ↓
Local Database
 ↓
Pending Sync Operation
```

When connectivity returns:

```text
Pending Operation
 ↓
Sync Engine
 ↓
API
 ↓
Server Validation
 ↓
Database
 ↓
Sync Confirmation
 ↓
Local State Updated
```

The client therefore does not need to wait for the network before responding to the user's action.

However, local confirmation does not necessarily mean server confirmation.

The backend remains authoritative.

---

## Idempotency

Offline synchronization introduces the possibility of retries.

For example:

```text
Client Sends Attendance
        ↓
Network Timeout
        ↓
Client Does Not Know Whether Server Received It
        ↓
Client Retries
```

Without idempotency, this could create duplicate attendance records.

Therefore, attendance mutations must support idempotency.

Each client operation should have a unique identifier that allows the backend to safely recognize repeated submissions.

---

# Realtime

Some parts of Roll SYNC require live updates.

Examples include:

* Live attendance counts
* Attendance status
* Event activity
* Organizer dashboards
* Synchronization state

The backend provides the realtime layer.

Realtime should be treated as a mechanism for distributing state changes, not as the primary source of truth.

Persistent state remains stored in PostgreSQL.

A simplified flow is:

```text
Attendance Created
       ↓
Database
       ↓
Realtime Event
       ↓
Connected Clients
       ↓
UI Updates
```

If a realtime connection disappears, clients should be able to recover the current state through normal API requests.

---

# Background Processing

Not every operation should happen during an API request.

Long-running, expensive, retryable, or asynchronous operations are handled by the background worker.

The architecture is:

```text
API
 ↓
Create Job
 ↓
Redis
 ↓
BullMQ
 ↓
Worker
 ↓
Process Job
```

Potential background jobs include:

* Offline synchronization processing
* Bulk attendance imports
* Data exports
* Notifications
* Webhook delivery
* Third-party integration synchronization
* Analytics processing
* Scheduled operations

The API should remain responsive instead of performing long-running work inside the request lifecycle.

---

# API and SDK

The Roll SYNC API is more than an internal API for the web application.

It is a product surface.

Third-party organizations should eventually be able to build Roll SYNC functionality into their own applications.

For this reason, the public API and SDK are first-class components.

```text
Third-Party Application
        │
        ▼
   @rollsync/sdk
        │
        ▼
   Roll SYNC API
        │
        ▼
 Roll SYNC Backend
```

The SDK should make common operations easier for developers.

Conceptually, usage may look like:

```ts
const rollsync = new RollSync({
  apiKey: process.env.ROLLSYNC_API_KEY,
});

const event = await rollsync.events.create({
  name: "Annual Conference",
});

const attendance = await rollsync.attendance.record({
  eventId: event.id,
  participantId: participant.id,
});
```

The actual SDK API will be defined from the backend API contract rather than invented independently.

The SDK must never contain privileged server credentials.

---

# Authentication

Authentication is centralized around the backend.

The platform needs to support multiple authentication contexts.

## Web

The web application uses normal user authentication and session management.

## Mobile

The mobile application requires a mobile-compatible authentication flow and secure local credential/session storage.

## SDK

Third-party integrations use API credentials issued by Roll SYNC.

SDK credentials are different from user authentication credentials.

They represent an authorized application or integration.

## API Keys

API keys should support:

* Creation
* Revocation
* Rotation
* Permission scopes
* Usage tracking

API keys must be treated as secrets and must never be exposed through public frontend bundles.

---

# Data and Storage

## PostgreSQL

PostgreSQL is the primary persistent database.

The database is hosted using Neon.

The application accesses PostgreSQL through Prisma.

```text
API
 ↓
@rollsync/database
 ↓
Prisma
 ↓
Neon PostgreSQL
```

The worker may also use the same database package.

Clients never access PostgreSQL directly.

---

## Prisma

Prisma is a server-side concern.

It lives inside the database package and is consumed by trusted backend applications.

```text
packages/database/
├── prisma/
│   └── schema.prisma
└── src/
    └── client.ts
```

The intended dependency boundary is:

```text
Web       → API
Mobile    → API
SDK       → API

API       → Database package
Worker    → Database package
```

Prisma must not be bundled into Web or Mobile applications.

---

## File Storage

UploadThing is used for managed file storage.

Files should not be stored directly inside PostgreSQL.

Instead:

```text
File
 ↓
UploadThing
 ↓
File URL / Identifier
 ↓
Database Metadata
```

The database stores information about the file while the actual file contents remain in file storage.

---

# Billing

Roll SYNC is intended to operate as a commercial SaaS product.

Polar is used for billing and subscription management.

The billing architecture keeps payment logic behind the backend.

```text
User / Organization
       ↓
Web
       ↓
API
       ↓
Polar
       ↓
Subscription State
       ↓
Roll SYNC Database
```

The product is expected to support multiple pricing tiers and potentially usage-based API/SDK pricing.

Possible pricing dimensions include:

* Events
* Attendance records
* Participants
* Organizations
* API requests
* Integrations
* Advanced features

Pricing is expected to evolve through product validation.

---

# Technology Stack

| Area                | Technology             |
| ------------------- | ---------------------- |
| Web                 | Next.js                |
| Mobile              | Expo / React Native    |
| Backend             | NestJS                 |
| Background Worker   | NestJS                 |
| Language            | TypeScript             |
| Package Manager     | pnpm                   |
| Monorepo            | Turborepo              |
| Database            | PostgreSQL             |
| Database Hosting    | Neon                   |
| ORM                 | Prisma                 |
| Queue               | BullMQ                 |
| Queue Storage       | Redis                  |
| File Storage        | UploadThing            |
| Authentication      | Better Auth            |
| Billing             | Polar                  |
| Web Hosting         | Vercel                 |
| Backend Hosting     | Deplexo                |
| Mobile Build System | Expo / EAS             |
| Validation          | Zod                    |
| API                 | REST-oriented HTTP API |
| Version Control     | Git / GitHub           |

Individual technology choices may change as the product evolves.

Architectural boundaries should remain stable even if individual technologies are replaced.

---

# Development

Roll SYNC uses pnpm for package management.

## Install Dependencies

```bash
pnpm install
```

## Run the Development Environment

```bash
pnpm dev
```

## Run the Web Application

```bash
pnpm --filter web dev
```

## Run the Mobile Application

```bash
pnpm --filter mobile start
```

## Run the API

```bash
pnpm --filter api start:dev
```

## Run the Worker

```bash
pnpm --filter worker start:dev
```

## Build the Project

```bash
pnpm build
```

## Run Type Checking

```bash
pnpm typecheck
```

## Run Linting

```bash
pnpm lint
```

## Run Tests

```bash
pnpm test
```

---

# Environment Variables

Secrets must never be committed to Git.

Local environment files should be based on the relevant `.env.example` files.

Expected server-side configuration includes values such as:

```env
DATABASE_URL=
REDIS_URL=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

UPLOADTHING_TOKEN=

POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
```

The exact environment variables will be documented as their respective services are implemented.

## Client Security

Only public configuration may be exposed to Web or Mobile clients.

Private credentials must remain server-side.

In particular, clients must never receive:

* Database URLs
* Redis credentials
* Polar private credentials
* UploadThing server secrets
* Authentication secrets
* Internal service credentials

---

# Testing

Testing should exist at multiple levels.

## Unit Tests

Used for isolated business logic.

Examples:

* Attendance validation
* Permission checks
* Synchronization logic
* Pricing calculations

## Integration Tests

Used to verify interactions between backend components.

Examples:

* API + database
* API + authentication
* API + queue
* Worker + database

## End-to-End Tests

Used to verify complete user flows.

For example:

```text
Create Event
 ↓
Create Attendance Session
 ↓
Generate Attendance Method
 ↓
Submit Attendance
 ↓
Verify Attendance
```

Offline flows should also have dedicated testing.

---

# Deployment

Roll SYNC consists of multiple deployable services.

## Web

```text
GitHub
 ↓
Vercel
 ↓
apps/web
```

## API

```text
GitHub
 ↓
Deplexo
 ↓
apps/api
```

## Worker

```text
GitHub
 ↓
Deplexo
 ↓
apps/worker
```

## Database

```text
Neon PostgreSQL
```

## Queue

```text
Redis
 ↓
BullMQ
```

The Web, API, and Worker are separate runtime concerns even though they live inside the same monorepo.

---

# Security Principles

Security is especially important because attendance data can represent real people and real-world events.

The system should follow these principles.

## Least Privilege

Services should only receive the permissions they need.

## Server Authority

Clients may submit requests, but the backend validates and authorizes them.

## No Direct Client Database Access

Database credentials remain server-side.

## Secrets Stay Server-Side

Private credentials must never be shipped in frontend bundles.

## Idempotent Mutations

Important write operations should safely handle retries.

## Input Validation

All externally supplied data should be validated before entering domain logic.

## Authorization

Authentication answers:

> **Who are you?**

Authorization answers:

> **Are you allowed to perform this action?**

Both are required.

## Auditability

Important operations should be designed so that they can be traced and audited when necessary.

---

# Development Principles

Roll SYNC is being developed rapidly, but speed should not destroy the architecture.

## Build Around Domain Concepts

Features should be designed around real domain entities rather than UI screens.

For example:

```text
Event
Attendance Session
Participant
Attendance Record
Organization
Integration
```

The UI should represent these concepts rather than define them.

## Backend First for Core Logic

Important business rules belong on the server.

Clients may provide optimistic experiences, but they should not become the authoritative implementation of business rules.

## Clients Should Be Replaceable

The backend should not depend on the existence of the current web or mobile application.

A future desktop application, hardware device, partner application, or school management system should be able to consume the same infrastructure.

## APIs Are Contracts

The API should be treated as a stable contract between Roll SYNC and its clients.

Changes to public API behavior should be deliberate and documented.

## Offline Does Not Mean Eventually Correct

Offline functionality must account for:

* Duplicate submissions
* Conflicts
* Retries
* Authentication expiry
* Validation failures
* Expired attendance sessions
* Deleted events
* Changed permissions

Offline support is therefore a synchronization system, not simply local storage.

## Prefer Small Changes

Features should be implemented incrementally.

A typical feature should move through:

```text
Domain Decision
      ↓
Data Model
      ↓
API Contract
      ↓
Backend Implementation
      ↓
Client Implementation
      ↓
Tests
      ↓
Documentation
```

---

# Documentation

The `docs/` directory contains detailed technical and product documentation.

The documentation is organized into four major areas:

```text
docs/
│
├── architecture/
│   ├── architecture.md
│   ├── data-model.md
│   ├── offline-sync.md
│   └── realtime.md
│
├── product/
│   ├── product.md
│   ├── attendance.md
│   └── pricing.md
│
├── engineering/
│   ├── development.md
│   ├── contributing.md
│   └── decisions.md
│
└── api/
    ├── README.md
    ├── overview.md
    └── authentication.md
```

Documentation should evolve alongside the implementation.

Architectural decisions should be recorded rather than relying on informal knowledge.

---

# Project Status

Roll SYNC is currently in the initial engineering and MVP development phase.

## Current Focus

* Monorepo setup
* Web application foundation
* Mobile application foundation
* NestJS backend
* Background worker
* Database architecture
* Authentication
* Offline synchronization
* Attendance engine
* API
* SDK
* Billing
* Deployment infrastructure

## MVP Goal

The MVP should prove that Roll SYNC can provide a complete attendance workflow from creation to confirmation.

The minimum complete flow is expected to resemble:

```text
Organizer
    ↓
Creates Event
    ↓
Creates Attendance Session
    ↓
Chooses Attendance Method
    ↓
Participant Arrives
    ↓
Participant Checks In
    ↓
Attendance Recorded
    ↓
Organizer Sees Attendance
```

The mobile application should additionally demonstrate:

```text
Participant
    ↓
Checks In While Offline
    ↓
Attendance Intent Stored Locally
    ↓
Connectivity Returns
    ↓
Intent Synchronizes
    ↓
Server Confirms Attendance
```

The API/SDK should demonstrate that an external application can interact with the same attendance infrastructure without requiring direct access to Roll SYNC's internal implementation.

---

# Long-Term Vision

Roll SYNC is not intended to remain a simple attendance application.

The long-term vision is to become an **attendance infrastructure layer**.

Instead of asking:

> "How do we build attendance into our application?"

a developer should eventually be able to ask:

> "How do we connect our application to Roll SYNC?"

This is why the platform is designed around:

* An API
* An SDK
* Multiple attendance methods
* Offline synchronization
* Realtime infrastructure
* Organization management
* Integrations
* Usage-based capabilities

The eventual goal is for Roll SYNC to become the infrastructure behind attendance experiences rather than just another attendance interface.

---

# License

License information will be added as the project's distribution strategy is finalized.

---

# Roll SYNC

**Fast attendance. Reliable infrastructure. Built for everywhere.**
#   r o l l s y n c  
 