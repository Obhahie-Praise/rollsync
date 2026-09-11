# Implement: Reports Page

## Goal

Implement the `/[slug]/reports` page as the organization's attendance and operational reporting workspace.

The page should turn the attendance, timetable, people, classes, and session data already present in Roll SYNC into useful reports.

Do NOT redesign the existing workspace shell or introduce a separate analytics architecture.

Inspect the existing project first and reuse the existing schema, queries, authorization, UI components, and attendance infrastructure.

---

# 1. Route

Create:

`/[slug]/reports`

Use the existing workspace layout and navigation.

The page should feel like a natural part of Roll SYNC.

---

# 2. Main Overview

Start with:

**Reports**

Supporting text:

**Understand attendance, classes, and participation across your organization.**

Provide a simple reporting overview.

Show useful high-level metrics only when the underlying data actually exists.

Examples:

- Attendance rate
- Sessions held
- Sessions expected
- Present
- Absent
- Late
- People tracked

Do NOT fabricate data.

If the organization is new and has no attendance data, show a useful empty state instead.

---

# 3. Date Range

Reports should support selecting a reporting period.

Provide simple options such as:

- Today
- This week
- This month
- Custom range

The selected date range should affect the report data.

Use the organization's existing timezone/date conventions.

Do not introduce a complicated calendar system.

---

# 4. Attendance Report

Create a primary attendance report showing real attendance data.

Useful breakdowns may include:

- Overall attendance rate
- Present
- Absent
- Late
- Excused, if supported by the existing model

Allow useful filtering by:

- Class
- Person type
- Teacher
- Subject
- Date range

Only expose filters that can actually be supported by the existing schema.

---

# 5. Class Attendance

Provide a class-level breakdown.

Example:

| Class | Sessions | Attendance | Present | Absent |
|---|---:|---:|---:|---:|
| SS2A | 24 | 94% | 226 | 14 |
| SS2B | 22 | 89% | 196 | 24 |

Use actual data.

Clicking a class should provide a sensible path into the relevant class/attendance context if those routes already exist.

Do not invent routes just for navigation.

---

# 6. People Attendance

Provide a people-level report.

Example:

| Person | Type | Attendance | Present | Absent | Late |
|---|---|---:|---:|---:|---:|
| John Doe | Student | 94% | 17 | 1 | 0 |
| Jane Smith | Student | 88% | 15 | 2 | 1 |

Use the existing Person model.

Attendance records must remain associated with People, not Better Auth Users.

Do not expose unnecessary personal information.

---

# 7. Teacher / Class Operations

Because Roll SYNC's timetable infrastructure knows what should happen and attendance knows what actually happened, reports should eventually be able to surface operational information such as:

- scheduled sessions
- sessions started
- sessions not started
- late teacher check-ins
- missed/unconfirmed sessions
- cancelled sessions
- rescheduled sessions

Only implement metrics that the current timetable/attendance implementation actually supports.

Do not invent teacher attendance data.

A useful distinction should remain:

**Expected → Actual**

The timetable defines what should have happened.

Attendance sessions define what actually happened.

---

# 8. Trends

Where enough historical data exists, provide a simple attendance trend.

For example:

- attendance over time
- weekly attendance
- monthly attendance

Keep visualizations simple.

Do not introduce a charting dependency unless the project already uses one.

If there is not enough data, show a clean empty state instead of a meaningless chart.

---

# 9. Report Filters

Filters should work together.

For example:

```text
Date
[ This month ]

Class
[ All classes ]

Teacher
[ All teachers ]

Subject
[ All subjects ]

Person type
[ Students ]
````

Changing filters should update the report.

Use server-side querying for authoritative report data.

Do not fetch the entire organization's attendance dataset into the browser just to filter it client-side.

---

# 10. Export

If the existing project already has an export/report infrastructure, reuse it.

Otherwise, add a minimal export capability only if it can be implemented cleanly with the existing stack.

A useful first export is:

**Export CSV**

The exported data should respect:

* current organization
* current filters
* current date range
* current authorization

Do not build a large document-generation system for this page.

---

# 11. Authorization

Reports contain organization data and must be protected.

Server-side:

1. Authenticate the current user.
2. Resolve the organization from `[slug]`.
3. Verify organization membership.
4. Check the existing report/attendance permissions.
5. Only return data the user is authorized to see.

Do not rely on client-side authorization.

Do not allow a user to access another organization's reports by modifying the slug.

If the existing architecture already has role/permission restrictions for attendance or reports, reuse them.

---

# 12. Performance

Reports may eventually contain a large amount of attendance data.

Use efficient server-side queries.

Avoid:

* loading every Person into memory
* loading every AttendanceRecord into memory
* calculating everything in React
* unnecessary repeated database queries

Prefer database aggregation where appropriate.

Keep the first implementation simple and readable rather than prematurely optimizing the entire analytics system.

---

# 13. Empty States

A new organization may have no data.

Create useful empty states such as:

**No attendance data yet**

> Attendance reports will appear here once classes begin recording attendance.

Do not display fake percentages or placeholder numbers.

---

# 14. UI / UX

Match the existing Roll SYNC design language.

Keep it:

* clean
* spacious
* modern
* useful
* responsive
* accessible

Use subtle interactions for:

* filters
* date selection
* table rows
* export
* expandable report sections

Include:

* loading states
* error states
* empty states
* disabled states

Respect reduced-motion preferences.

Avoid:

* excessive cards
* giant dashboards
* unnecessary gradients
* AI-style visual effects
* decorative analytics that don't communicate useful information

---

# 15. Reuse Existing Infrastructure

Do not create duplicate:

* Person models
* Class models
* Timetable models
* Attendance models
* authentication
* authorization
* audit systems
* database clients
* background queues

Use the existing Prisma setup and existing application patterns.

BullMQ remains the existing async infrastructure if an asynchronous export/job is ever required.

Do not add realtime/WebSockets.

---

# 16. Important Data Rules

Respect the existing Roll SYNC architecture:

```text
People
   ↓
Classes
   ↓
Timetable
   ↓
Attendance Sessions
   ↓
Attendance Records
```

Reports should derive their information from these existing relationships.

Remember:

**Timetable = what should happen**

**Attendance Session = what actually happened**

**Attendance Record = who was actually present**

Do not treat a missing attendance record as automatically equivalent to an absence unless the existing attendance rules explicitly define that behavior.

---

# 17. Production Checks

After implementation:

```bash
pnpm lint
pnpm run build
```

Fix all errors caused by the implementation.

Do not use:

* `any`
* `@ts-ignore`
* unsafe casts
* eslint suppression to hide real problems

---

# Definition of Done

The implementation is complete when:

* `/[slug]/reports` exists
* it uses the existing workspace shell
* organization authorization is enforced server-side
* date ranges work
* reports use real database data
* attendance overview works
* class-level attendance works
* people-level attendance works
* supported operational/session metrics work
* filters work
* empty states work
* no fake data is displayed
* export works if existing infrastructure supports it
* report queries respect organization boundaries
* no duplicate infrastructure is introduced
* UI matches the existing Roll SYNC design
* responsive and accessible states are handled
* `pnpm lint` passes
* `pnpm run build` passes

Before finishing, provide a short summary of:

1. What was implemented
2. Which existing data/infrastructure was reused
3. Which reporting features were intentionally left unavailable because the underlying data does not exist yet
4. Confirmation that lint and build pass

```
```
