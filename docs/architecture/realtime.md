# Roll SYNC — Realtime Architecture

> **Realtime communication for keeping connected Roll SYNC surfaces synchronized with the latest server state.**

## 1. Purpose

Roll SYNC has three primary surfaces:

* **Web** — event creation, attendance management, dashboards, analytics and administration.
* **Mobile** — participant attendance, offline synchronization and mobile workflows.
* **API** — the central interface consumed by Roll SYNC clients and external integrations.

Realtime communication allows connected clients to receive important changes without repeatedly requesting the server.

The goal is:

> **When something changes on the Roll SYNC backend, relevant connected clients should see that change as quickly as possible.**

---

# 2. Realtime Is Not the Source of Truth

Realtime is a **delivery mechanism**, not a database.

The authoritative state remains:

```text
PostgreSQL
```

Realtime simply communicates changes originating from that state.

```text
PostgreSQL
     │
     │ state change
     ▼
Realtime Layer
     │
     ├──────────► Web
     │
     ├──────────► Mobile
     │
     └──────────► Connected Clients
```

A client must never assume that because it received a realtime event, the event itself is the complete source of truth.

---

# 3. Realtime vs Offline Sync

Realtime and offline synchronization solve different problems.

### Realtime

Answers:

> "Something changed on the server. Tell connected clients."

### Offline Sync

Answers:

> "The user made a change while disconnected. Deliver it to the server later."

```text
                 Roll SYNC
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Realtime            Offline Sync
          │                   │
          ▼                   ▼
Server → Client          Client → Server
```

They should remain independent systems.

---

# 4. Proposed Technology

Roll SYNC should use a dedicated realtime layer rather than attempting to turn the API into a permanent realtime server.

The preferred architecture is:

```text
NestJS API
     │
     ▼
PostgreSQL
     │
     ▼
Realtime Service
     │
     ▼
WebSocket Clients
```

The realtime service should support:

* WebSocket connections
* Authentication
* Room/channel subscriptions
* Event broadcasting
* Connection management
* Horizontal scaling
* Redis-backed pub/sub where required

The exact implementation may use a WebSocket gateway within the backend infrastructure or a dedicated realtime service as the system grows.

---

# 5. Why WebSockets?

Roll SYNC requires two-way persistent communication for some experiences.

WebSockets provide:

* Persistent connections
* Low-latency communication
* Server → client events
* Client → server messages when required
* Efficient communication for live dashboards

This is particularly useful for attendance dashboards.

Example:

```text
Participant checks in
        │
        ▼
       API
        │
        ▼
   PostgreSQL
        │
        ▼
 Realtime Event
        │
        ├────────► Organizer Dashboard
        │
        └────────► Other Authorized Clients
```

The organizer does not need to refresh the page.

---

# 6. Realtime Events

Realtime events should use strongly typed event definitions.

Conceptually:

```typescript
type RealtimeEvent =
  | AttendanceCreatedEvent
  | AttendanceUpdatedEvent
  | AttendanceRejectedEvent
  | SessionUpdatedEvent
  | SessionClosedEvent
  | ParticipantUpdatedEvent;
```

Every event should contain enough information for the client to understand what happened without exposing unnecessary data.

Example:

```json
{
  "type": "attendance.created",
  "eventId": "evt_123",
  "sessionId": "session_123",
  "attendanceId": "attendance_456",
  "occurredAt": "2026-08-28T18:30:00Z"
}
```

The actual event contracts should live in the shared API/types package.

---

# 7. Event IDs

Every realtime event should have a unique `eventId`.

Example:

```text
evt_01KXXXXXXXX
```

This allows clients to identify duplicate events.

A client may receive the same event more than once due to:

* Reconnection
* Network instability
* Server retries
* Subscription restoration
* Infrastructure behavior

Therefore, realtime consumers should be designed to tolerate duplicate events.

---

# 8. Attendance Realtime Flow

The most important realtime flow is attendance.

```text
Participant
     │
     ▼
Mobile / Web
     │
     ▼
POST /attendance
     │
     ▼
NestJS API
     │
     ▼
Validate
     │
     ▼
PostgreSQL
     │
     ▼
Attendance Created
     │
     ▼
Publish attendance.created
     │
     ├───────────────┐
     ▼               ▼
Organizer Web      Other Clients
Dashboard
```

The organizer dashboard can therefore update immediately.

---

# 9. Server-First Event Publishing

Realtime events should be emitted **after the authoritative database operation succeeds**.

Incorrect:

```text
Client Request
     │
     ▼
Publish Realtime Event
     │
     ▼
Database Write
     │
     ✕ fails
```

This can cause clients to display information that does not actually exist.

Preferred:

```text
Client Request
     │
     ▼
Validate
     │
     ▼
Database Transaction
     │
     ▼
Commit
     │
     ▼
Publish Event
```

The event represents committed server state.

---

# 10. Transactional Event Consideration

There is an important failure scenario:

```text
Database commit succeeds
        │
        ▼
Realtime publishing fails
```

The attendance still exists even though connected clients did not receive the event.

Therefore, realtime delivery must not be considered guaranteed.

Clients should have a way to recover through normal API fetching.

The architecture should eventually consider an **event/outbox pattern** for critical events.

---

# 11. Outbox Pattern

For highly reliable realtime delivery, the backend can use an outbox table.

Conceptually:

```text
                    Transaction
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        PostgreSQL            Outbox
        Data Change            Event
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
                   Event Worker
                        │
                        ▼
                 Realtime Layer
                        │
                        ▼
                     Clients
```

This ensures that the database change and the intent to publish an event are committed together.

The MVP does not necessarily need the full outbox implementation, but the architecture should leave room for it.

---

# 12. Redis and Realtime

Roll SYNC already uses:

```text
Redis + BullMQ
```

for asynchronous server-side jobs.

Redis can also assist realtime infrastructure.

However:

> **BullMQ and realtime pub/sub are different responsibilities.**

BullMQ:

```text
Job Queue
```

Realtime pub/sub:

```text
Message Distribution
```

They may share Redis infrastructure where appropriate, but application responsibilities must remain separate.

---

# 13. Realtime Channels

Clients should subscribe only to channels they are authorized to access.

Example:

```text
rollsync:event:{eventId}
```

or:

```text
rollsync:session:{sessionId}
```

A connected organizer may subscribe to:

```text
session:abc123
```

while a participant may only receive events relevant to their own attendance state.

---

# 14. Authorization

Realtime connections must be authenticated.

A client should not be able to simply subscribe to:

```text
session:secret-event
```

and receive private attendance information.

The backend must verify:

```text
User
  │
  ▼
Authenticated?
  │
  ▼
Authorized for resource?
  │
  ▼
Allow subscription
```

Authorization must happen server-side.

---

# 15. Connection Authentication

The client establishes a realtime connection using the authenticated application session.

Conceptually:

```text
Client
  │
  │ authenticated session
  ▼
Realtime Gateway
  │
  ▼
Validate identity
  │
  ▼
Establish connection
```

The exact authentication mechanism must remain consistent with the main Roll SYNC authentication architecture.

Realtime should not introduce an entirely separate user identity system.

---

# 16. Connection Lifecycle

Clients should handle:

```text
CONNECTING
CONNECTED
DISCONNECTED
RECONNECTING
FAILED
```

Example:

```text
CONNECTING
    │
    ▼
CONNECTED
    │
    │ network lost
    ▼
DISCONNECTED
    │
    ▼
RECONNECTING
    │
    ▼
CONNECTED
```

The client should automatically reconnect where appropriate.

---

# 17. Reconnection

Realtime connections are inherently temporary.

A connection can disappear because of:

* Wi-Fi changes
* Mobile data changes
* Device sleep
* Server restart
* Network outage
* Proxy timeout
* Application backgrounding

Therefore:

> **Realtime must be recoverable.**

After reconnecting, the client should refresh or reconcile relevant state.

---

# 18. Reconnection Recovery

A simple recovery strategy is:

```text
Realtime disconnected
        │
        ▼
Reconnect
        │
        ▼
Re-authenticate
        │
        ▼
Restore subscriptions
        │
        ▼
Fetch latest relevant state
        │
        ▼
Resume realtime updates
```

This prevents missed events from leaving the UI permanently stale.

---

# 19. Event Ordering

Realtime events may not always arrive exactly once or in perfect order.

Events should therefore contain ordering metadata where necessary.

For example:

```json
{
  "eventId": "evt_123",
  "sequence": 184,
  "type": "attendance.created"
}
```

Clients should only depend on ordering when the particular feature requires it.

For simple dashboard counters, a subsequent server refresh may be sufficient.

---

# 20. Snapshot + Events

A robust realtime architecture should follow the principle:

> **Fetch a snapshot, then subscribe to changes.**

Example:

```text
GET /sessions/:id
        │
        ▼
Initial State
        │
        ▼
Subscribe to realtime
        │
        ▼
Receive changes
```

This is safer than assuming the client can reconstruct the entire state from realtime events.

---

# 21. Live Attendance Dashboard

The organizer dashboard is a primary realtime consumer.

Example:

```text
Attendance
─────────────────────
Present        142
Absent          38
Pending          4
─────────────────────
```

When a participant checks in:

```text
142
 ↓
143
```

without requiring a page refresh.

The dashboard can also update:

* Recent attendees
* Attendance counts
* Session status
* Participant states
* Check-in timestamps
* Attendance charts
* Alerts

---

# 22. Mobile Realtime

Mobile realtime should be used selectively.

The mobile application does not need a permanent WebSocket connection for every feature.

Realtime is appropriate for:

* Session status
* Attendance confirmation
* Event updates
* Organizer announcements
* Changes relevant to the current user

It should not be required for offline attendance.

---

# 23. Offline + Realtime Interaction

When offline:

```text
Realtime
   ✕ unavailable

Offline Sync
   ✓ continues locally
```

When connectivity returns:

```text
Offline Sync
   ↓
API
   ↓
Database
   ↓
Realtime
   ↓
Connected Clients
```

This creates a clean separation between local reliability and live communication.

---

# 24. External SDK Realtime

Roll SYNC's SDK may eventually allow third-party applications to subscribe to events.

For example:

```text
School App
     │
     ▼
Roll SYNC SDK
     │
     ▼
Realtime API
     │
     ▼
attendance.created
```

SDK consumers should only receive events permitted by their API credentials and configured scopes.

Realtime access must therefore respect the same authorization model as REST/API access.

---

# 25. SDK Event Contract

External developers should consume stable event contracts rather than internal database models.

Example:

```typescript
rollsync.attendance.onCreated((attendance) => {
  // Handle attendance
});
```

The SDK should hide:

* WebSocket connection management
* Reconnection
* Authentication
* Subscription management
* Event parsing
* Heartbeats
* Duplicate handling

The developer should interact with a simple typed interface.

---

# 26. Realtime API Versioning

Realtime event contracts are public API surfaces.

Therefore, breaking changes must be versioned.

Example:

```text
v1
  attendance.created

v2
  attendance.created
```

Internal database changes must not automatically become external event changes.

The SDK should depend on the public event contract.

---

# 27. Rate Limiting

Realtime infrastructure must protect itself from abuse.

Potential controls include:

* Maximum connections per account
* Maximum subscriptions per connection
* Event rate limits
* Authentication rate limits
* SDK/API plan limits

Paid customers may eventually receive higher realtime limits based on their subscription.

---

# 28. Scaling

The realtime system must eventually support multiple backend instances.

Example:

```text
                  Load Balancer
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      API Node 1   API Node 2   API Node 3
          │            │            │
          └────────────┼────────────┘
                       ▼
                    Redis
                       │
                       ▼
              Realtime Distribution
```

Redis or an equivalent broker allows events produced by one server instance to reach clients connected to another.

---

# 29. Realtime Does Not Replace API Fetching

Clients should always have normal API endpoints for retrieving state.

Realtime provides:

```text
"Something changed."
```

The API provides:

```text
"Here is the current state."
```

This distinction makes the architecture more resilient.

---

# 30. Failure Handling

If realtime fails:

```text
Realtime unavailable
       │
       ▼
Application continues
       │
       ▼
API remains usable
```

For the web dashboard, the UI should indicate that live updates are temporarily unavailable where useful.

Example:

```text
● Live updates disconnected
  Reconnecting...
```

The application should not become completely unusable.

---

# 31. Security Requirements

Realtime must:

* Authenticate connections
* Authorize subscriptions
* Validate event destinations
* Avoid leaking private attendance data
* Enforce tenant boundaries
* Respect API scopes
* Rate-limit connections
* Avoid trusting client-provided authorization claims
* Disconnect invalid sessions
* Never expose database credentials

Multi-tenant isolation is especially important.

An organization must never receive another organization's events.

---

# 32. Multi-Tenant Isolation

Every realtime subscription must be scoped to an organization or resource the authenticated user can access.

Conceptually:

```text
User
 │
 ▼
Organization
 │
 ▼
Event
 │
 ▼
Session
 │
 ▼
Realtime Channel
```

Authorization should follow this hierarchy.

---

# 33. Realtime and Analytics

Realtime should not directly power permanent analytics.

For example:

```text
Realtime Event
```

may update the dashboard immediately.

But historical analytics should be calculated from:

```text
PostgreSQL
```

This prevents temporary realtime failures from corrupting historical reporting.

---

# 34. Observability

The realtime infrastructure should monitor:

* Active connections
* Connection failures
* Reconnection rate
* Events published
* Events delivered
* Event latency
* Subscription count
* Authentication failures
* Dropped connections
* Broker health

Useful metric:

```text
event_created_at
        ↓
event_received_at
        ↓
delivery_latency
```

---

# 35. MVP Realtime Scope

The MVP should implement realtime for the most valuable flows first.

### Required

* Authenticated realtime connections
* Session subscriptions
* Attendance creation events
* Session status events
* Web dashboard live attendance updates
* Automatic reconnection
* Initial state fetch
* Basic authorization
* Typed event contracts

### Not required initially

* Complex event replay
* Full event sourcing
* Advanced presence tracking
* Arbitrary client-generated realtime events
* Sophisticated cross-region infrastructure
* Full outbox infrastructure

These can be introduced as Roll SYNC scales.

---

# 36. Recommended Event Categories

The initial event vocabulary should remain small.

```text
attendance.created
attendance.updated
attendance.rejected

session.started
session.updated
session.closed

participant.updated

event.updated
```

More events can be added as actual product requirements emerge.

Avoid creating events simply because a database table exists.

Events should represent meaningful product-level changes.

---

# 37. Recommended Data Flow

The canonical flow is:

```text
                  ┌─────────────┐
                  │    Client   │
                  └──────┬──────┘
                         │
                         ▼
                    Roll SYNC API
                         │
                         ▼
                    Authorization
                         │
                         ▼
                     Validation
                         │
                         ▼
                    PostgreSQL
                         │
                    transaction
                         │
                         ▼
                  Committed State
                         │
                         ▼
                  Realtime Publisher
                         │
                         ▼
                       Redis
                         │
                         ▼
                 Realtime Gateway
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
            Web       Mobile       SDK
```

---

# 38. Architectural Rules

### Rule 1 — PostgreSQL is authoritative.

Realtime is never the source of truth.

### Rule 2 — Events represent committed state.

Do not broadcast successful-looking events before the database operation succeeds.

### Rule 3 — Realtime is best-effort delivery.

Clients must be able to recover through API requests.

### Rule 4 — Every connection must be authenticated.

Anonymous access must not be assumed.

### Rule 5 — Every subscription must be authorized.

Knowing a channel name must never grant access.

### Rule 6 — Events must be typed.

Realtime contracts are part of the public architecture.

### Rule 7 — Reconnection is expected.

A disconnected client is normal, not exceptional.

### Rule 8 — Realtime must not be required for offline sync.

Offline attendance must continue functioning without a live connection.

### Rule 9 — External SDK events must use public contracts.

Internal database models must never become accidental SDK APIs.

### Rule 10 — Realtime failure must degrade gracefully.

The API and core application must continue operating.

---

# 39. Final Architecture

Roll SYNC's realtime system should ultimately follow this model:

```text
                         ROLL SYNC
                             │
                    ┌────────┴────────┐
                    │                 │
                PostgreSQL          Redis
                    │                 │
              Source of Truth    Distribution
                    │                 │
                    └────────┬────────┘
                             │
                      Realtime Layer
                             │
               ┌─────────────┼─────────────┐
               │             │             │
               ▼             ▼             ▼
             Web           Mobile         SDK
               │             │             │
               ▼             ▼             ▼
          Live UI       Live Updates   Integrations
```

The fundamental model is:

> **PostgreSQL stores the truth. The API changes the truth. Realtime announces the change. Clients reconcile with the truth.**

This keeps Roll SYNC's live experience fast without making the system dependent on realtime connectivity.
