````md
# Roll SYNC — Attendance

Attendance is the core capability of Roll SYNC.

Roll SYNC is designed to make attendance **fast, flexible, reliable, and usable across different environments** without forcing every organization to use the same method.

The same platform should work for:

- Schools
- Universities
- Companies
- Churches
- Conferences
- Clubs
- Training programs
- Workshops
- Meetings
- Events
- Communities
- Any organization that needs to know who was present

The goal is simple:

> **Record who was there, when they were there, and in what context — with as little friction as possible.**

---

# 1. The Attendance Model

Roll SYNC does not treat attendance as a single action.

Attendance exists within a hierarchy:

```text
Organization
      ↓
Organization Unit
      ↓
Attendance Context
      ↓
Attendance Session
      ↓
Attendance Record
      ↓
Person
````

For example:

```text
University
    ↓
Faculty of Engineering
    ↓
Computer Science Department
    ↓
CSC 301 Attendance
    ↓
August 28, 2026 — Lecture
    ↓
Student Attendance Records
```

Or:

```text
Tech Company
    ↓
Engineering Department
    ↓
Weekly Engineering Meeting
    ↓
August 28, 2026
    ↓
Employee Attendance Records
```

Or:

```text
Conference
    ↓
Main Event
    ↓
Opening Ceremony
    ↓
Day 1
    ↓
Attendee Attendance Records
```

The underlying attendance system remains the same.

---

# 2. Attendance Context

An **Attendance Context** describes what an organization is tracking attendance for.

It is a reusable definition rather than a single attendance event.

Examples:

```text
School Daily Attendance
Staff Attendance
CSC 301
Friday Coding Club
Annual Conference
Employee Training
Sunday Service
Monthly Team Meeting
```

A context may define:

* Name
* Description
* Organization
* Organization unit
* Expected participants
* Default attendance methods
* Rules
* Schedule
* Attendance requirements
* Permissions

A context can have many sessions.

Example:

```text
Context:
CSC 301

Sessions:
├── September 1
├── September 3
├── September 8
├── September 10
└── September 15
```

---

# 3. Attendance Session

A **Session** represents a specific occurrence of an attendance context.

A session answers:

> "When is this particular attendance being taken?"

Examples:

```text
CSC 301
→ September 3, 2026
→ 10:00 AM — 12:00 PM
```

```text
Tech Conference
→ Day 2
→ September 14, 2026
```

```text
Staff Attendance
→ August 28, 2026
→ Morning
```

A session may have:

* Start time
* End time
* Status
* Attendance methods
* Expected participants
* Location
* Attendance rules
* Created by
* Closed by
* Metadata

---

# 4. Session Lifecycle

An attendance session generally follows:

```text
DRAFT
  ↓
OPEN
  ↓
CLOSED
```

Additional states may be introduced if required.

### DRAFT

The session exists but attendance cannot normally be recorded.

### OPEN

Participants can submit attendance.

### CLOSED

The attendance window has ended.

Closing a session should prevent normal new attendance submissions unless an authorized user explicitly reopens or modifies it.

---

# 5. Attendance Record

An **Attendance Record** represents an individual's attendance result for a specific session.

Example:

```text
Session:
CSC 301 — September 3

Person:
John Doe

Record:
PRESENT
```

A record may contain:

```text
Person
Session
Status
Method
Timestamp
Source
Metadata
```

Possible statuses include:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

The exact status set should remain configurable where necessary rather than assuming every organization has identical attendance rules.

---

# 6. Attendance Methods

Roll SYNC supports multiple ways of recording attendance.

The primary methods include:

```text
QR
MOBILE
ROLL_CALL
ID_SCAN
MANUAL
IMPORT
```

Additional methods can be added later without changing the fundamental attendance model.

The important principle is:

> **The method changes how attendance is captured, not what attendance is.**

For example:

```text
QR ────────────┐
Mobile ────────┤
Roll Call ─────┤
ID Scan ───────┼──► Attendance Record
Manual ────────┤
Import ────────┘
```

---

# 7. QR Attendance

QR is designed for fast, low-friction attendance.

A typical flow is:

```text
Organizer opens session
        ↓
Roll SYNC generates attendance QR
        ↓
Participant scans QR
        ↓
Roll SYNC resolves session
        ↓
Participant is identified
        ↓
Attendance is validated
        ↓
Attendance record is created
```

QR codes should contain only the information necessary to safely resolve the attendance session.

The QR payload itself is not the attendance record.

All important validation happens on the backend.

---

# 8. Mobile Attendance

The Roll SYNC mobile application provides the lowest-friction attendance experience for supported users.

The user should be able to initiate attendance without manually completing a traditional form every time.

The key principle is:

> **Capture intent first. Synchronize with the server afterward.**

When online:

```text
User Action
    ↓
Local State
    ↓
API
    ↓
Attendance Confirmed
```

When offline:

```text
User Action
    ↓
Local Persistent Storage
    ↓
Pending Operation
    ↓
Connection Returns
    ↓
API
    ↓
Attendance Confirmed
```

The user should not have to manually retry an operation simply because connectivity disappeared.

---

# 9. Offline Attendance

Offline attendance is a core feature of Roll SYNC's mobile experience.

The mobile application maintains a local queue of pending operations.

A pending attendance operation may conceptually contain:

```text
operationId
sessionId
personId
method
createdAt
payload
status
retryCount
```

The exact implementation is defined by the offline synchronization architecture.

The server remains authoritative.

Offline storage represents:

> **What the user intended to submit.**

It does not automatically represent:

> **What the server has accepted as final.**

---

# 10. Synchronization

When connectivity becomes available, pending attendance operations are synchronized.

```text
Pending
   ↓
Syncing
   ↓
Server Validation
   ↓
Accepted / Rejected / Conflict
```

Possible outcomes include:

```text
SYNCED
REJECTED
CONFLICT
RETRY
```

A successful synchronization should make the local operation consistent with the server state.

---

# 11. Idempotency

Attendance submission must be idempotent.

This is particularly important for mobile and offline synchronization.

Example:

```text
operationId = abc123
```

The client submits:

```text
abc123
```

The server processes it.

If the client does not receive the response and retries:

```text
abc123
```

the server must recognize the existing operation instead of creating a duplicate attendance record.

Therefore:

> **The same attendance operation must not create multiple attendance records simply because it was retried.**

---

# 12. Roll Call

Roll call provides a traditional attendance experience inside Roll SYNC.

An authorized user can see the expected participants:

```text
☐ John
☐ Sarah
☐ David
☐ Michael
☐ Grace
```

and mark attendance directly.

Possible actions include:

```text
Present
Absent
Late
Excused
```

Roll call should support efficient keyboard, touch, and bulk interactions where appropriate.

---

# 13. ID Scanning

ID scanning allows organizations to use an identification mechanism to record attendance.

Examples may include:

* Student IDs
* Employee IDs
* Membership IDs
* Event badges
* Organization-specific identifiers

The flow is:

```text
ID Presented
    ↓
Scanner
    ↓
Identify Person
    ↓
Resolve Session
    ↓
Validate
    ↓
Create Attendance Record
```

The exact scanning technology can evolve independently from the attendance domain.

---

# 14. Manual Attendance

Authorized users can manually create or modify attendance records.

Manual changes should require appropriate permissions.

The system should retain enough information to distinguish between:

```text
Automatically captured attendance
```

and:

```text
Manually modified attendance
```

This is important for accountability and auditing.

---

# 15. Imported Attendance

Organizations may already have attendance data stored elsewhere.

Roll SYNC should support importing attendance where appropriate.

Potential sources include:

```text
CSV
Spreadsheet
Existing systems
External integrations
SDK/API
```

Imports should be validated before records become authoritative.

Large imports should use background processing rather than blocking a normal API request.

---

# 16. Attendance Sources

Attendance records should be able to identify their source.

For example:

```text
source:
  MOBILE

method:
  QR
```

or:

```text
source:
  WEB

method:
  ROLL_CALL
```

or:

```text
source:
  API

method:
  IMPORT
```

This distinction can help with:

* analytics
* debugging
* auditing
* integrations
* reporting

The exact fields should remain minimal and only exist when they provide useful information.

---

# 17. Expected Participants

A session may have an expected participant set.

For example:

```text
CSC 301
Expected:
├── Student A
├── Student B
├── Student C
└── Student D
```

The system can then determine:

```text
Present
Absent
Late
Unaccounted
```

However, not every attendance use case requires a predefined participant list.

An event may allow participants to register or check in dynamically.

Therefore, expected participants should be supported without making them mandatory for every context.

---

# 18. Schools

Schools are one of Roll SYNC's primary use cases.

The same attendance system should support different education levels without creating separate attendance models.

Examples:

```text
Primary School
Secondary School
University
Training Institution
```

A school may have:

```text
School
├── Level
│   ├── Class
│   └── Class
│
├── Department
│   ├── Program
│   └── Program
│
└── Staff
```

The organization-unit hierarchy allows these structures to exist within the same model.

---

# 19. Workplace Attendance

Businesses can use the same system for:

```text
Employee attendance
Shift attendance
Training
Meetings
Team sessions
Workshops
Events
```

Example:

```text
Company
└── Engineering
    ├── Frontend
    ├── Backend
    └── Mobile
```

Attendance contexts can then be attached to the appropriate organizational unit.

---

# 20. Events

Event attendance is intentionally supported by the same architecture.

Example:

```text
Event
└── Main Conference
    ├── Day 1
    ├── Day 2
    └── Day 3
```

Different sessions can use different methods:

```text
Day 1 → QR
Day 2 → ID Scan
Workshop → Roll Call
VIP Room → Manual
```

The organization does not need a separate "event attendance system."

It uses the same Roll SYNC attendance infrastructure.

---

# 21. Attendance Rules

Organizations may require different rules.

Examples:

```text
Attendance opens 15 minutes before session
Attendance closes at session end
Late after 10 minutes
Only one attendance per person
Participant must belong to organization
Participant must be registered for event
```

Rules should be enforced by the backend.

Client applications may communicate these rules to users, but they must not be trusted to enforce them.

---

# 22. Duplicate Prevention

A person should normally have one authoritative attendance record per session.

The system should prevent accidental duplicates regardless of the method used.

For example:

```text
Person A
    ↓
QR scan
    ↓
PRESENT
```

A second scan should not normally create:

```text
Person A
    ↓
QR scan
    ↓
PRESENT
    ↓
NEW RECORD ❌
```

Instead, the system should recognize the existing attendance.

The same applies across methods where business rules require uniqueness.

---

# 23. Late Attendance

Late attendance should be represented as a meaningful attendance state rather than as an entirely separate record type.

For example:

```text
PRESENT
timestamp: 09:04
```

versus:

```text
LATE
timestamp: 09:16
```

The rules determining when someone becomes late belong to the attendance context/session configuration and backend logic.

---

# 24. Attendance Corrections

Authorized users may need to correct attendance.

Examples:

```text
Student incorrectly marked absent
Employee forgot to scan
Duplicate record
Offline synchronization conflict
Incorrect participant identity
```

Corrections should not silently erase history where auditability is important.

The system should retain sufficient information to understand:

```text
Original state
Changed state
Who changed it
When it changed
Why it changed
```

The exact audit model should remain proportional to the product's requirements.

---

# 25. Permissions

Not every user should have the same attendance capabilities.

Potential roles include:

```text
Organization Owner
Administrator
Attendance Manager
Teacher
Staff
Participant
```

Permissions may determine whether someone can:

```text
Create context
Create session
Open session
Close session
Take attendance
Modify attendance
View attendance
Export attendance
Manage participants
```

Authorization is enforced by the backend.

---

# 26. Attendance Reporting

Attendance data should support useful reporting without creating separate reporting-specific attendance models.

Examples:

```text
Attendance percentage
Present count
Absent count
Late count
Session attendance
Participant history
Organization attendance
Unit attendance
```

Reports should be generated from the underlying attendance data.

Large or expensive reports may be processed asynchronously.

---

# 27. Attendance Analytics

Analytics can answer questions such as:

```text
How many people attended?
What percentage were present?
How many arrived late?
Which sessions have low attendance?
Which units have the highest attendance?
```

Analytics should not alter the underlying attendance records.

They are derived views of the attendance domain.

---

# 28. Realtime Attendance

Where appropriate, attendance changes can be reflected in realtime.

For example:

```text
Participant scans QR
        ↓
Backend records attendance
        ↓
Realtime event
        ↓
Organizer dashboard updates
```

This allows an organizer to watch attendance happen without manually refreshing the page.

Realtime is an enhancement to the attendance experience, not the source of truth.

The database remains authoritative.

---

# 29. Security

Attendance information can contain sensitive organizational and personal data.

The system must enforce:

* authentication
* authorization
* organization boundaries
* secure API access
* protected file access
* appropriate auditability

Clients must never be trusted to determine:

```text
Who someone is
Which organization they belong to
Whether they can modify attendance
Whether an attendance record is valid
```

These decisions belong to the backend.

---

# 30. Privacy

Roll SYNC should collect only information required to provide the attendance experience.

Attendance data should be associated with the appropriate organization and access-controlled accordingly.

Features should avoid collecting unnecessary:

```text
location
device information
personal data
biometric information
```

unless explicitly required by a future product feature and appropriately handled.

---

# 31. Core Principles

The attendance system follows these principles:

### 1. Fast

Attendance should take as little time as possible.

### 2. Flexible

Organizations should choose how attendance is taken.

### 3. Unified

Different attendance methods produce the same underlying attendance data.

### 4. Offline-capable

Mobile users should be able to record attendance intent without reliable connectivity.

### 5. Reliable

Retries should not create duplicate attendance.

### 6. Server-authoritative

The backend determines whether attendance is valid.

### 7. Cross-platform

The same attendance infrastructure powers:

```text
Web
Mobile
SDK
Third-party integrations
```

### 8. Extensible

New attendance methods should be possible without rebuilding the core domain.

---

# 32. Canonical Attendance Flow

The complete system can be summarized as:

```text
                 ATTENDANCE CONTEXT
                         │
                         ▼
                    SESSION OPEN
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
           QR       ROLL CALL     ID SCAN
            │            │            │
            └────────────┼────────────┘
                         │
                    MOBILE / API
                         │
                         ▼
                  ATTENDANCE REQUEST
                         │
                         ▼
                  AUTHENTICATION
                         │
                         ▼
                   AUTHORIZATION
                         │
                         ▼
                    VALIDATION
                         │
                         ▼
                 DUPLICATE CHECK
                         │
                         ▼
                ATTENDANCE RECORD
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          DATABASE              REALTIME
                                    │
                                    ▼
                               DASHBOARDS
```

For mobile users operating offline:

```text
              MOBILE ATTENDANCE
                     │
                     ▼
              LOCAL PERSISTENCE
                     │
                     ▼
               PENDING QUEUE
                     │
             Connection Returns
                     │
                     ▼
                    API
                     │
                     ▼
                VALIDATION
                     │
                     ▼
              SERVER RECORD
                     │
                     ▼
             LOCAL RECONCILIATION
```

---

# 33. Product Goal

Roll SYNC should make attendance feel less like filling out a form and more like a simple infrastructure capability.

An organization should be able to say:

> "We need to know who was here."

and Roll SYNC should provide the appropriate mechanism:

```text
Scan.
Tap.
Call.
Scan an ID.
Import.
Integrate.
```

Regardless of how attendance is captured, the result is the same:

> **A reliable, unified record of participation that the organization can trust.**

```
```
