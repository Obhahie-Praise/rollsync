# Roll SYNC — Offline Synchronization Specification

> **Offline-first architecture for reliable attendance capture on mobile devices.**

## 1. Purpose

Roll SYNC's mobile application must remain useful when network connectivity is unavailable, unreliable, slow, or temporarily interrupted.

The core requirement is:

> **A participant should be able to perform an attendance action without waiting for the network, while Roll SYNC eventually synchronizes that action with the authoritative backend.**

Offline support is therefore not simply "cache the app."

It is an **offline mutation and synchronization system**.

The mobile client records user intent locally, then synchronizes that intent with the Roll SYNC API when connectivity becomes available.

---

# 2. Core Principle

The backend is always authoritative.

The mobile application may temporarily operate without the server, but it must never permanently decide that an attendance operation is valid.

```text
Mobile
  │
  │ "The user attempted attendance."
  ▼
Local Database
  │
  │ later
  ▼
Roll SYNC API
  │
  ▼
Server Validation
  │
  ▼
PostgreSQL
  │
  ▼
Confirmed Attendance
```

The distinction between **intent** and **confirmed attendance** is fundamental to the system.

---

# 3. Why Offline-First?

Attendance often happens in environments where connectivity cannot be guaranteed.

Examples:

* School assemblies
* Large events
* Stadiums
* Conference halls
* Outdoor events
* Rural environments
* Crowded locations
* Buildings with poor reception
* Temporary network outages

A conventional application might behave like:

```text
Tap Check In
     ↓
Wait for network
     ↓
Request fails
     ↓
Attendance fails
```

Roll SYNC should behave like:

```text
Tap Check In
     ↓
Save locally
     ↓
Immediate feedback
     ↓
Synchronize automatically
     ↓
Server confirmation
```

---

# 4. Architecture

The mobile application contains four major offline components:

```text
┌─────────────────────────────────────────┐
│               MOBILE APP                │
│                                         │
│  ┌─────────────┐                        │
│  │     UI      │                        │
│  └──────┬──────┘                        │
│         ▼                               │
│  ┌─────────────┐                        │
│  │ Application │                        │
│  │   Logic     │                        │
│  └──────┬──────┘                        │
│         ▼                               │
│  ┌─────────────┐     ┌──────────────┐  │
│  │ Sync Queue  │◄───►│ Local Store  │  │
│  └──────┬──────┘     └──────────────┘  │
│         │                               │
│         ▼                               │
│  ┌─────────────┐                        │
│  │  Network    │                        │
│  │  Monitor    │                        │
│  └──────┬──────┘                        │
└─────────┼───────────────────────────────┘
          │
          │ Internet available
          ▼
     Roll SYNC API
```

---

# 5. Local Storage

The mobile application requires a persistent local database.

It should store:

* Cached events
* Cached attendance sessions
* Cached participant information where appropriate
* Pending attendance operations
* Operation IDs
* Sync status
* Retry information
* Local timestamps
* Server synchronization metadata

The local database is not a replacement for PostgreSQL.

It is a temporary client-side state store.

---

# 6. Mobile Database

The mobile database technology should provide:

* Persistent storage
* Fast local reads/writes
* Transaction support
* Reliable operation on iOS and Android
* Expo compatibility
* Support for structured relational data
* Safe operation during intermittent connectivity

The implementation should be isolated behind a local data-access layer so the underlying database technology can be replaced without rewriting the synchronization engine.

Conceptually:

```text
Mobile Application
       │
       ▼
Local Repository
       │
       ▼
Local Database
```

The rest of the application should not directly manipulate database tables.

---

# 7. Sync Operation

Every offline-capable mutation receives a unique operation ID.

Example:

```text
operationId:
01KXXXXXXXXXXXXXXX
```

The operation contains enough information for the server to understand what the client attempted.

Conceptually:

```json
{
  "operationId": "01K...",
  "type": "ATTENDANCE_CHECK_IN",
  "sessionId": "session_123",
  "participantId": "participant_456",
  "createdAt": "2026-08-28T17:30:00Z"
}
```

The exact payload is defined by the API contract.

---

# 8. Attendance Intent

The local operation represents an **attendance intent**.

It means:

> "This participant attempted to check into this attendance session from this device at this time."

It does **not** mean:

> "The server has confirmed that this attendance is valid."

This distinction allows the system to remain responsive without weakening server-side validation.

---

# 9. Local Operation Lifecycle

Each operation progresses through a defined lifecycle.

```text
CREATED
   │
   ▼
PENDING
   │
   ▼
SYNCING
   │
   ├───────────────┐
   ▼               ▼
CONFIRMED       RETRYABLE_FAILURE
                    │
                    ▼
                 PENDING
```

Permanent failures follow a different path:

```text
SYNCING
   │
   ▼
REJECTED
```

Conflicts may also occur:

```text
SYNCING
   │
   ▼
CONFLICT
```

The exact state machine should remain centralized in the synchronization package.

---

# 10. Creating an Offline Attendance

When the user performs an attendance action:

```text
User
 │
 ▼
Attendance UI
 │
 ▼
Create Operation ID
 │
 ▼
Write Operation Locally
 │
 ▼
Update Local Attendance State
 │
 ▼
Show Confirmation
```

The application does not need to wait for the API before updating the user interface.

This provides the low-friction experience that offline-first attendance requires.

---

# 11. Online vs Offline Decision

The application may use network status to determine whether to attempt immediate synchronization.

However:

> **Network availability must never be treated as proof that a request will succeed.**

A device may report that it is online while the API is unreachable.

Therefore:

```text
Network says ONLINE
        ↓
Attempt API request
        ↓
If successful → Confirm
If transient failure → Queue
```

And:

```text
Network says OFFLINE
        ↓
Write locally
        ↓
Wait for connectivity
```

---

# 12. Synchronization Trigger

The sync engine should attempt synchronization when:

* The application starts
* The application returns to the foreground
* Network connectivity is restored
* A new pending operation is created while online
* A periodic background opportunity occurs
* The user manually requests synchronization

The exact availability of background execution depends on the operating system.

The architecture must therefore **never assume that arbitrary JavaScript can run continuously in the background**.

---

# 13. Background Synchronization

The mobile application should use platform-supported background execution where available.

The goal is:

```text
App inactive
     ↓
Operating system provides execution opportunity
     ↓
Sync engine wakes
     ↓
Process pending operations
     ↓
Stop when work is complete
```

This is different from keeping a permanent background process alive.

iOS and Android control background execution.

The system should therefore be designed around **background opportunities**, not guaranteed continuous execution.

---

# 14. Sync Queue

The local queue contains operations waiting to reach the server.

Example:

```text
Local Sync Queue

┌─────────────────────────────────┐
│ #1 Attendance   PENDING         │
│ #2 Attendance   PENDING         │
│ #3 Attendance   SYNCING         │
│ #4 Attendance   PENDING         │
└─────────────────────────────────┘
```

Operations should normally be processed in creation order unless a specific operation type requires different behavior.

---

# 15. Queue Processing

The sync engine processes pending operations.

```text
Find pending operation
        ↓
Mark SYNCING
        ↓
Send to API
        ↓
Receive response
        │
   ┌────┼─────────────┐
   ▼    ▼             ▼
Success Retryable   Permanent
   │     failure     failure
   ▼      │            │
Confirm   ▼            ▼
        Retry        Reject
```

---

# 16. Retry Strategy

Transient failures should be retried.

Examples:

* Network timeout
* Temporary server error
* Connection reset
* Temporary service unavailable

Retries should use exponential backoff.

Conceptually:

```text
Attempt 1 → immediate
Attempt 2 → short delay
Attempt 3 → longer delay
Attempt 4 → longer delay
...
```

The retry policy should have a maximum delay and should avoid aggressive repeated requests.

---

# 17. Permanent Failures

Some failures should not be retried indefinitely.

Examples:

* Attendance session does not exist
* Participant is not authorized
* Session is permanently closed
* Invalid attendance token
* Operation is malformed

These should result in a terminal state such as:

```text
REJECTED
```

The user should be informed appropriately.

---

# 18. Idempotency

Idempotency is mandatory for offline synchronization.

A device may send the same operation more than once.

For example:

```text
Mobile
  │
  ├── Request ──→ Server
  │
  │   timeout
  │
  ├── Retry ────→ Server
  │
  └── Retry ────→ Server
```

The server must recognize that these requests represent the same operation.

The `operationId` provides the idempotency key.

---

# 19. Server-Side Idempotency

The backend should persist processed operation IDs or an equivalent idempotency record.

Conceptually:

```text
operationId
     │
     ▼
Already processed?
     │
 ┌───┴────┐
 │        │
YES       NO
 │        │
 ▼        ▼
Return   Process
existing  request
result      │
            ▼
        Store result
```

This prevents duplicate attendance records.

---

# 20. Example: Duplicate Submission

Without idempotency:

```text
Request 1 → Attendance #100
Request 2 → Attendance #101
Request 3 → Attendance #102
```

With idempotency:

```text
Request 1 → Attendance #100
Request 2 → Existing operation
Request 3 → Existing operation
```

The final result remains one attendance record.

---

# 21. Server Validation

When an offline operation reaches the backend, it must go through the same authoritative validation pipeline as an online operation.

```text
Offline Intent
      │
      ▼
API
      │
      ▼
Authentication
      │
      ▼
Authorization
      │
      ▼
Session Validation
      │
      ▼
Participant Validation
      │
      ▼
Duplicate Check
      │
      ▼
Attendance Record
```

Offline status should not bypass server validation.

---

# 22. Timestamp Handling

Offline operations have multiple relevant timestamps.

At minimum:

```text
clientCreatedAt
serverReceivedAt
serverConfirmedAt
```

Example:

```text
User checks in
     │
     │ 10:00:03
     ▼
Device records intent
     │
     │ offline
     │
     │ 10:08:31
     ▼
Server receives operation
     │
     ▼
Server confirms
```

The server should record when it actually received and processed the operation.

Client timestamps may be useful for audit and synchronization but must not automatically be trusted for security-sensitive decisions.

---

# 23. Clock Manipulation

Device clocks cannot be assumed to be accurate.

Therefore, client timestamps should not independently determine whether an attendance operation is valid.

For example, a malicious or incorrectly configured device should not be able to simply change its system clock to bypass session rules.

Server-side time remains authoritative for server-controlled validity checks.

---

# 24. Session Expiration

Offline synchronization introduces an important edge case.

Consider:

```text
Session:
09:00 → 10:00

User checks in:
09:59 offline

Synchronization:
10:30
```

The backend must have an explicit policy for whether this operation is valid.

The product specification should eventually define rules such as:

* Whether offline attendance can be accepted after session closure
* Grace periods
* Which timestamps are considered
* Whether organizers can configure offline grace periods

This policy belongs to the backend, not the mobile client.

---

# 25. Conflict Handling

Conflicts occur when the local state and server state disagree.

Examples:

* Participant already checked in
* Session was closed
* Participant was removed
* Session was deleted
* Attendance was manually modified
* Operation was submitted from multiple devices

The synchronization engine should not silently overwrite server state.

Instead:

```text
Local Operation
      │
      ▼
Server Conflict
      │
      ▼
CONFLICT / REJECTED
      │
      ▼
Resolve according to policy
```

---

# 26. Multiple Devices

A participant may use multiple devices.

Example:

```text
Phone A ──→ Check-in
             │
Phone B ──→ Check-in
```

The server must determine whether both operations represent valid attendance.

This cannot be reliably solved by the local mobile application because each device has incomplete information.

Server-side idempotency and attendance rules therefore remain authoritative.

---

# 27. Local Optimistic UI

The mobile UI may immediately show:

```text
✓ Attendance recorded
```

but internally the state should distinguish between:

```text
Pending
```

and:

```text
Confirmed
```

A better user-facing representation may be:

```text
✓ Check-in saved
  Syncing...
```

followed by:

```text
✓ Attendance confirmed
```

This maintains a fast experience without falsely claiming server confirmation.

---

# 28. Offline UI States

The mobile application should clearly communicate synchronization state.

Potential states:

### Synced

```text
✓ Attendance confirmed
```

### Pending

```text
✓ Saved offline
  Waiting for connection
```

### Syncing

```text
↻ Syncing attendance...
```

### Failed

```text
! Couldn't sync yet
  We'll retry automatically
```

### Rejected

```text
× Attendance could not be confirmed
```

The UI should avoid overwhelming users with technical details.

---

# 29. Local Data Expiration

Not all server data should be cached indefinitely.

Cached data should have appropriate freshness policies.

For example:

```text
Event metadata
     ↓
Cache
     ↓
Refresh when necessary
```

Sensitive or unnecessary data should not remain on the device indefinitely.

The mobile cache should be minimized to what is required for the offline experience.

---

# 30. Data Synchronization Direction

The system primarily synchronizes:

```text
Mobile → Server
```

for offline mutations.

However, the mobile client may also need:

```text
Server → Mobile
```

for refreshing cached data.

Therefore:

```text
        ┌───────────────┐
        │ Roll SYNC API │
        └───────┬───────┘
                ▲
                │
          mutations
                │
          ┌─────┴─────┐
          │   Mobile  │
          └─────┬─────┘
                │
             refresh
                ▼
        server state/cache
```

The two directions should be handled independently.

---

# 31. Realtime + Offline

Realtime and offline synchronization serve different purposes.

### Realtime

Provides fast server-state updates while connected.

### Offline Sync

Preserves local mutations when disconnected.

They should not be coupled.

```text
Realtime
   │
   └──→ Live UI updates

Offline Sync
   │
   └──→ Reliable mutation delivery
```

If realtime disconnects, synchronization must continue to function.

---

# 32. Reconnection

When the network returns:

```text
Network restored
       │
       ▼
Sync engine triggered
       │
       ▼
Process pending operations
       │
       ▼
Refresh relevant server state
       │
       ▼
Update UI
```

The mobile application should avoid downloading the entire application state unnecessarily.

Only relevant data should be refreshed.

---

# 33. Sync Ordering

By default, operations should be processed in creation order.

Example:

```text
Operation A
Operation B
Operation C
```

should normally synchronize as:

```text
A → B → C
```

However, operations should not be unnecessarily blocked by unrelated failures.

The synchronization engine may eventually support dependency-aware processing.

For example:

```text
Create Event
      ↓
Create Session
      ↓
Check In
```

The attendance operation depends on the session existing.

The MVP should avoid creating complex dependency chains unless required.

---

# 34. Concurrency

Multiple sync attempts must not process the same local operation simultaneously.

The mobile client should have a synchronization lock.

Conceptually:

```text
Sync Worker A
      │
      ├── acquires lock
      │
      ▼
Processes queue

Sync Worker B
      │
      └── waits / exits
```

This prevents duplicate local processing.

The server's idempotency system remains the final safety mechanism.

---

# 35. Network Detection

The application should use a network monitoring mechanism appropriate for Expo/React Native.

Network status is used as a synchronization trigger, not as a guarantee of connectivity.

```text
OFFLINE
   │
   │ connection detected
   ▼
ONLINE
   │
   ▼
Attempt synchronization
```

An API request remains the final test of actual server availability.

---

# 36. Server-Side Queue vs Mobile Queue

Roll SYNC has two different queue concepts.

## Mobile Sync Queue

Purpose:

> Preserve user operations while the device is offline.

```text
Mobile
  ↓
Local Database
  ↓
Sync Engine
```

## BullMQ Server Queue

Purpose:

> Process asynchronous server-side jobs.

```text
API
 ↓
Redis
 ↓
BullMQ
 ↓
Worker
```

They must not be treated as the same system.

---

# 37. What Happens During a Complete Offline Check-In?

Example:

### 1. User scans QR

```text
QR Scanner
   ↓
Session identified
```

### 2. Mobile checks local information

```text
Session available locally
```

### 3. Operation is created

```text
operationId = unique ID
```

### 4. Operation is persisted

```text
Local DB
└── attendance operation
```

### 5. UI updates

```text
✓ Check-in saved
```

### 6. Network becomes available

```text
Network restored
```

### 7. Sync begins

```text
Local operation
      ↓
POST /attendance
```

### 8. Server validates

```text
Auth
Session
Participant
Idempotency
Attendance rules
```

### 9. Server stores attendance

```text
PostgreSQL
```

### 10. Server responds

```text
CONFIRMED
```

### 11. Mobile updates local state

```text
PENDING → CONFIRMED
```

### 12. UI updates

```text
✓ Attendance confirmed
```

---

# 38. Security Considerations

Offline data introduces additional security concerns.

The mobile application should:

* Minimize locally stored personal data
* Avoid storing unnecessary secrets
* Use secure platform storage where appropriate
* Encrypt sensitive local data where required
* Clear user-specific data on logout
* Prevent unauthorized local access
* Never trust client-side attendance confirmation
* Never embed sensitive credentials in QR codes

Offline support must not become a way to bypass backend authorization.

---

# 39. Logout Behavior

When a user logs out, the application must carefully handle pending operations.

There are two possible classes of local operations:

### User-bound operations

Operations belonging to the authenticated account.

These must not be accidentally submitted under another account.

### Device/application operations

General cached application state.

These can be cleared or retained according to policy.

The MVP should prefer safety:

> **Pending authenticated operations must be associated with the account/session that created them and must not leak across accounts.**

---

# 40. Data Integrity

The system should prioritize:

1. No duplicate attendance
2. No lost user intent where technically possible
3. No unauthorized attendance
4. Clear conflict resolution
5. Server authority

The desired property is:

```text
At-least-once delivery
+
Idempotent server processing
=
Reliable attendance synchronization
```

The system should not depend on exactly-once network delivery, because mobile networks cannot guarantee it.

---

# 41. Observability

Synchronization failures should be observable.

Useful metrics include:

* Pending operations
* Successful syncs
* Failed syncs
* Retry count
* Average sync latency
* Permanent rejection rate
* Conflict rate
* Queue size

The mobile application should also provide useful local diagnostics during development.

---

# 42. MVP Requirements

The first implementation should support:

* Local persistence
* Attendance operation queue
* Unique operation IDs
* Offline attendance intent
* Automatic retry
* Network restoration detection
* Server-side idempotency
* Server validation
* Pending/syncing/confirmed/rejected states
* Basic offline UI
* Safe logout behavior

The MVP does **not** need a generalized offline synchronization framework for every entity.

Attendance is the first and primary offline-capable mutation.

---

# 43. Future Improvements

The architecture can eventually expand to support offline mutations for:

* Event creation
* Session creation
* Participant updates
* Organizer actions
* Forms
* Surveys
* Other Roll SYNC operations

At that point, the synchronization engine can become a generalized client synchronization framework.

---

# 44. Non-Negotiable Rules

### Rule 1 — PostgreSQL is authoritative.

Local state is never the permanent source of truth.

### Rule 2 — Offline means deferred synchronization, not bypassed validation.

Every operation must eventually pass through the backend.

### Rule 3 — Every syncable mutation must have an operation ID.

This provides idempotency.

### Rule 4 — The server must handle duplicate operations safely.

Network retries are expected.

### Rule 5 — Client timestamps are not authoritative.

Server time determines server-side validity.

### Rule 6 — Realtime is optional.

Synchronization cannot depend on a persistent realtime connection.

### Rule 7 — Background execution is opportunistic.

Mobile operating systems control when background work can execute.

### Rule 8 — Local data must be minimized.

Only information required for the offline experience should be persisted.

### Rule 9 — Pending operations must be account-safe.

One user's pending operations must never be submitted under another user's account.

### Rule 10 — The UI must distinguish local state from server confirmation.

"Saved offline" and "Confirmed" are different states.

---

# 45. Final Architecture

The complete offline system can be summarized as:

```text
                         MOBILE
                           │
                    ┌──────▼──────┐
                    │     UI      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Application │
                    │   Logic     │
                    └──────┬──────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      ┌─────────────┐             ┌─────────────┐
      │ Local Store │             │ Sync Engine  │
      └──────┬──────┘             └──────┬──────┘
             │                           │
             │                    Network Available
             │                           │
             └──────────────┬────────────┘
                            ▼
                     ┌─────────────┐
                     │ Roll SYNC   │
                     │     API     │
                     └──────┬──────┘
                            │
                  ┌─────────┼─────────┐
                  ▼         ▼         ▼
              Auth      Validation  Idempotency
                  │         │         │
                  └─────────┼─────────┘
                            ▼
                     PostgreSQL
                            │
                            ▼
                   Attendance Record
                            │
                            ▼
                     Realtime Event
                            │
                            ▼
                         Mobile
```

The core principle is:

> **Capture locally. Synchronize reliably. Validate centrally.**

That is what makes Roll SYNC genuinely offline-first rather than simply an online attendance application with a cache.
