# Design & Implement: Roll SYNC Overview

## Goal

Design and implement the main workspace overview at:

`/[slug]/overview`

This is the primary dashboard for an organization.

It should give users an immediate understanding of:

- what is happening today
- what needs their attention
- attendance activity
- scheduled classes/sessions
- people activity
- organization health
- relevant next actions

The Overview must be consistent with the existing Roll SYNC dashboard, not feel like a separate product.

The existing workspace shell, sidebar, header, navigation, People, Timetable, Attendance, Reports, Organization, Developers, and Settings implementations already exist.

Inspect them first and build the Overview so it feels like they were designed as one system.

---

# 1. Design Direction

The design should follow the existing Roll SYNC visual language:

- very clean
- spacious
- modern
- professional
- subtle blue accents
- light backgrounds
- strong typography hierarchy
- restrained use of cards
- soft borders
- subtle shadows only where useful
- rounded corners consistent with the existing application
- subtle micro-interactions

Do NOT create a completely new visual language.

The Overview should feel like the most polished page in the application without looking visually different from the rest of the dashboard.

Avoid:

- excessive gradients
- excessive glassmorphism
- huge colorful statistics
- AI-style interfaces
- unnecessary decorative illustrations
- giant hero sections
- excessive cards
- fake analytics
- dense enterprise dashboards

---

# 2. The Core Principle

The Overview is NOT simply a collection of statistics.

It should answer three questions immediately:

### What is happening?

Today's classes, sessions, attendance activity, etc.

### What needs my attention?

Late teachers, unconfirmed sessions, incomplete attendance, configuration issues, etc.

### What can I do next?

Start attendance, view timetable, review attendance, add people, configure the organization, etc.

The page should prioritize **actionable information over decoration**.

---

# 3. Role-Aware Overview

The Overview must adapt to the authenticated user's organization role and permissions.

Do not show the exact same dashboard to everyone.

At minimum, support:

### Teacher

Focus on:

- today's timetable
- next class
- sign-in
- active attendance session
- classes already completed
- classes remaining today
- attendance they need to take
- relevant personal attendance activity

### Administrator

Focus on:

- organization-wide activity
- today's attendance
- expected vs actual sessions
- teacher check-ins
- sessions requiring attention
- attendance trends
- organization setup/health
- quick administrative actions

### Other Members

Show only information allowed by their existing permissions.

For example:

- relevant schedules
- attendance information they can view
- appropriate organization activity

Do not expose sensitive organization-wide data to users who cannot access it.

Use the existing authorization system.

---

# 4. Greeting / Context

At the top of the page, provide a lightweight contextual greeting.

Example:

```text
Good morning, Jane

Here's what's happening today.
````

For an administrator:

```text
Good morning, Praise

Here's what's happening at Demo School today.
```

Do not make this a giant hero section.

Keep it compact.

The organization name should come from the current `[slug]` context.

---

# 5. Today's Snapshot

Create a compact summary of the most important information.

For an administrator, examples could include:

```text
Today's overview

18
Scheduled sessions

15
Started

2
Completed

1
Needs review
```

For a teacher:

```text
Today's overview

5
Classes

2
Completed

1
Active

2
Upcoming
```

Use actual data.

Never fabricate statistics.

If there is no data, show useful zero/empty states rather than fake activity.

---

# 6. Next Class — Teacher Priority

For teachers, the most prominent actionable element should be their next relevant class.

Example:

```text
Next class

Mathematics
SS2A

08:00 – 08:40
Room 12

Starts in 12 minutes

[ Sign in ]
```

If the teacher is already signed in:

```text
Mathematics
SS2A

08:00 – 08:40
Room 12

● Active session

[ Take attendance ]
```

If the class has already finished:

Move the next upcoming class into focus.

If there are no more classes:

```text
You're done for today.

No more classes are scheduled.
```

Do not invent classes.

Use the existing timetable and attendance-session infrastructure.

---

# 7. Teacher Today's Schedule

Below the primary next-class area, show the teacher's schedule for today.

Example:

```text
Today's classes

08:00
Mathematics · SS2A
Room 12
✓ Completed

09:00
Physics · SS3B
Science Lab
● Active

11:00
Chemistry · SS2A
Room 12
Upcoming

13:00
Computer Science · SS1A
Computer Lab
Upcoming
```

Each class should reflect actual session state.

Possible states:

* Upcoming
* Active
* Completed
* Needs review

Do not automatically treat a missing check-in as a teacher absence.

Respect the existing attendance/session rules.

---

# 8. Administrator: Today's Operations

For administrators, the Overview should become an organization operations dashboard.

Show something like:

```text
Today's attendance

Expected
18 sessions

Started
15

Completed
12

Needs review
1
```

Then a live-ish operational list based on current database state:

```text
Today's sessions

08:00
Mathematics · SS2A
Jane Smith
Early
Completed

09:00
Physics · SS3B
Mike Adams
Late
Active

10:00
Chemistry · SS1A
Sarah Williams
Needs review
```

Do not implement realtime/WebSockets.

The page can use normal server-rendered data and refresh/navigation where appropriate.

---

# 9. Attention / Needs Review

Create a section specifically for things that require action.

Examples:

* teacher has not checked into an expected session
* session has unusual/missing attendance
* timetable conflict
* organization setup incomplete
* failed/unfinished attendance
* other existing system warnings

Example:

```text
Needs attention

1 session has no teacher check-in
Physics · SS3B · 09:00

3 students remain unmarked
Mathematics · SS2A

Timetable setup is incomplete
2 teachers have no scheduled classes
```

Only show warnings supported by real data.

Do not create noisy notifications.

If there is nothing to review:

```text
Everything looks good.

No outstanding issues.
```

This should feel reassuring rather than empty.

---

# 10. Attendance Snapshot

For administrators and users with appropriate permissions, provide a concise attendance snapshot.

Example:

```text
Attendance today

92%

Attendance rate

Present     184
Absent       11
Late          7
Unmarked      3
```

Use real attendance records.

The time period must be clear.

Do not calculate "absence" simply from missing records unless the existing attendance rules explicitly define it that way.

Provide a link:

**View reports →**

to:

`/[slug]/reports`

---

# 11. Attendance Trend

For users with reporting permissions, provide a simple historical trend.

Example:

```text
Attendance

Last 7 days

[ simple trend visualization ]

Mon   91%
Tue   94%
Wed   89%
Thu   93%
Fri   92%
```

Only show this when enough historical data exists.

Do not add a charting library unless one already exists.

If there is insufficient data:

```text
Attendance trends will appear here
once enough attendance has been recorded.
```

Do not manufacture trend data.

---

# 12. Organization Health

For administrators, provide a compact setup/health section.

Reuse the Organization page's existing readiness logic.

Example:

```text
Organization setup

✓ People configured
✓ Classes configured
✓ Subjects configured
✓ Teachers assigned
✓ Rooms configured
✓ Timetable configured

[ View organization ]
```

Do not create a second setup system.

Use the same underlying logic/data already used by:

`/[slug]/organization`

---

# 13. Quick Actions

Provide context-aware quick actions.

For teachers:

```text
Quick actions

[ Start attendance ]
[ View timetable ]
[ View my classes ]
```

For administrators:

```text
Quick actions

[ Add person ]
[ Manage timetable ]
[ View attendance ]
[ View reports ]
```

Only show actions the current user is authorized to perform.

Use existing routes.

Do not create duplicate flows.

---

# 14. Recent Activity

If the existing audit/activity infrastructure supports it, show a compact recent activity section.

Examples:

```text
Recent activity

Jane Smith signed in to Mathematics · SS2A
2 minutes ago

Attendance completed for SS3B
18 minutes ago

New person added
1 hour ago
```

Only use real activity.

Do not create a new activity/audit architecture just for the Overview.

If existing activity data is unavailable, omit this section.

---

# 15. Empty Organization

The Overview must work beautifully for a newly created organization.

Instead of displaying a giant empty dashboard:

```text
Welcome to Roll SYNC

Your organization is ready.

Start by adding people and building your timetable.

[ Add people ]
[ Set up timetable ]
```

Use the existing onboarding/setup state.

As the organization becomes configured, the dashboard should naturally transition into the normal operational Overview.

Do not fabricate metrics to make a new organization look active.

---

# 16. Teacher With No Timetable

Handle this specifically.

Example:

```text
No classes scheduled today

Your timetable doesn't contain any classes for today.

[ View timetable ]
```

Do not show an empty dashboard with meaningless statistics.

---

# 17. Responsive Design

The Overview must work well on:

* desktop
* tablet
* mobile

On smaller screens:

* prioritize next action
* collapse secondary information
* maintain readable tables/lists
* avoid horizontal overflow
* preserve the important status information

Do not simply shrink the desktop dashboard.

Adapt the layout intelligently.

---

# 18. Interactions

Add subtle interactions:

* cards/rows respond to hover
* buttons have tactile feedback
* sections animate naturally when appropriate
* loading states are smooth
* navigation feels immediate
* status transitions are clear

Respect:

`prefers-reduced-motion`

Do not make the dashboard distracting.

---

# 19. Data & Architecture

Reuse the existing:

* Organization
* Person
* User
* Membership
* Class
* Class Membership
* Subject
* Teaching Assignment
* Room
* Timetable
* Attendance Session
* Attendance Record
* existing reports/query logic
* existing permissions
* existing audit system

Do not create duplicate models.

Do not create duplicate queries if reusable query functions already exist.

Prefer server-side data fetching for authoritative dashboard data.

Avoid loading the entire organization dataset into the browser.

---

# 20. Authorization

Every section must respect existing permissions.

Examples:

A teacher should not see:

* organization-wide sensitive reports
* another teacher's private information
* administrative controls

unless their existing permissions explicitly allow it.

An administrator should see the organization-wide information their permissions allow.

A normal member should see only permitted information.

Enforce this server-side.

Do not rely on simply hiding components in React.

---

# 21. Performance

The Overview is the page users will visit most frequently.

Keep it fast.

Avoid:

* huge database queries
* fetching every attendance record
* unnecessary client-side computation
* duplicate requests
* unnecessary API round trips

Aggregate data server-side where appropriate.

Use existing query patterns.

Do not prematurely introduce caching infrastructure unless the project already has an appropriate pattern.

---

# 22. Visual Hierarchy

The final page should have a clear visual hierarchy similar to:

```text
Good morning, Jane
Here's what's happening today.

┌──────────────────────────────────────────────┐
│ Next class / Primary action                  │
│ Mathematics · SS2A                           │
│ 08:00 – 08:40 · Room 12        [Sign in]    │
└──────────────────────────────────────────────┘

Today's overview
[ Classes ] [ Active ] [ Completed ] [ Upcoming ]

Today's classes
───────────────────────────────────────────────
08:00  Mathematics · SS2A       ✓
09:00  Physics · SS3B           ●
11:00  Chemistry · SS2A         →

Needs attention
───────────────────────────────────────────────
...

Attendance
───────────────────────────────────────────────
92%                 [View reports]
...
```

This is a conceptual layout, not a requirement to copy this exact arrangement.

Use your judgment to create the best composition consistent with the existing dashboard.

---

# 23. Important Design Constraint

The Overview should NOT become a generic SaaS dashboard.

Roll SYNC has a very specific domain.

The dashboard should visually communicate:

**People + Schedule + Classes + Attendance + Action**

not:

**Revenue + random charts + vanity metrics + generic analytics.**

Every piece of information should answer a useful organizational question.

---

# 24. Do Not Touch Unrelated Systems

Do NOT redesign:

* workspace shell
* sidebar
* People
* Classes
* Timetable
* Attendance
* Reports
* Organization
* Developers
* Settings
* Better Auth
* UploadThing
* BullMQ

Integrate with them.

Do not add:

* WebSockets
* Socket.IO
* realtime infrastructure
* duplicate authentication
* duplicate authorization
* duplicate analytics systems
* unnecessary dependencies

---

# 25. Production Checks

After implementation:

```bash
pnpm lint
pnpm run build
```

Fix all errors caused by this implementation.

Do not use:

* `any`
* `@ts-ignore`
* unsafe casts
* unnecessary eslint disables

---

# Definition of Done

The Overview is complete when:

* `/[slug]/overview` exists and is polished
* it matches the existing Roll SYNC dashboard
* it is role-aware
* teachers see their actual daily work
* administrators see organization operations
* other members only see permitted information
* next class is surfaced intelligently
* teacher sign-in can be reached naturally
* today's timetable is represented accurately
* attendance activity uses real data
* sessions needing attention are surfaced
* organization readiness is represented where appropriate
* empty/new organization states are handled
* no fake data is displayed
* all authorization is enforced server-side
* existing infrastructure is reused
* no duplicate architecture is introduced
* responsive behavior works
* loading/error/empty states work
* subtle interactions and reduced-motion support work
* `pnpm lint` passes
* `pnpm run build` passes

Before finishing, provide a short summary of:

1. What was implemented
2. How the Overview differs by role
3. Which existing systems/data were reused
4. Any sections intentionally omitted because the underlying data does not exist
5. Confirmation that lint and build pass

```
```
