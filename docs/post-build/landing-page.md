# Roll SYNC — LANDING PAGE FINAL BUILD

## Role

Act as a **senior product designer + senior frontend/design engineer** working on an existing production-quality application.

Your job is NOT to invent a new product.

Your job is to understand what Roll SYNC already is, understand what has already been built, and then create a polished landing page that communicates that product clearly.

Prioritize:

- product understanding
- visual quality
- strong information hierarchy
- responsive design
- interaction quality
- clean implementation
- minimal code
- reuse of existing infrastructure
- zero unnecessary architecture changes

Do not bloat the application.

---

# 1. UNDERSTAND THE PROJECT BEFORE WRITING CODE

DO NOT start by immediately editing the landing page.

First inspect the repository and understand the existing project.

Read the project's documentation files completely.

Look for and read relevant:

- README
- product documentation
- architecture documentation
- product specifications
- attendance documentation
- pricing documentation
- data model documentation
- authentication documentation
- API documentation
- engineering/development documentation
- design documentation
- decision records
- any other `.md` / `.mdx` documentation relevant to understanding Roll SYNC

Read the documentation in a sensible order.

Then inspect the actual application and compare the documentation against the implementation.

Understand:

- what Roll SYNC is
- who it is for
- what problem it solves
- the core product model
- organization structure
- People
- Classes
- Subjects
- Timetable
- Teachers
- Attendance Sessions
- Class QR
- teacher check-in
- organization/admin workspace
- teacher workspace
- authentication
- current product capabilities
- what is actually implemented
- what is planned but NOT implemented

Do not advertise features that do not currently exist as if they are already available.

The landing page should represent the actual product.

---

# 2. IMPORTANT PRODUCT UNDERSTANDING

The landing page should communicate Roll SYNC as a real attendance platform, not as a generic SaaS dashboard.

The core product idea is:

> Roll SYNC connects people, classes, timetables and attendance into one system.

The system understands:

- who belongs to an organization
- what classes exist
- who teaches what
- where classes happen
- when classes are expected
- when teachers actually check in
- what attendance sessions occurred

The product currently has a working web MVP.

Mobile offline-first attendance is a future capability.

Do NOT pretend offline mobile is already available.

It may be presented as a future/coming-soon direction where appropriate.

---

# 3. VISUAL REFERENCE

Use the attached landing-page reference image as a **visual/compositional reference only**.

The reference establishes the general design language we want:

- premium SaaS presentation
- dark dramatic hero
- very large typography
- strong editorial layout
- asymmetrical content
- generous whitespace
- restrained navigation
- small section labels
- large visual sections
- carefully controlled gradients
- strong visual hierarchy
- rounded modern UI
- subtle motion
- product-focused visuals
- transition between dark and light sections

DO NOT copy the reference literally.

Do NOT copy:

- its wording
- brand
- logo
- illustrations
- exact layouts
- exact gradients
- exact cards
- exact copy
- exact visual assets

Treat it like a **design template/reference for composition and quality**, then reinterpret it entirely for Roll SYNC.

The result must clearly feel like Roll SYNC.

---

# 4. ROLL SYNC VISUAL DIRECTION

Use Roll SYNC's identity.

Primary visual accent:

**Blue**

Use blue as the main expressive accent rather than the purple accent in the reference.

The visual language should feel:

- modern
- confident
- useful
- technical
- clean
- premium
- slightly futuristic
- human
- trustworthy

Avoid making it feel:

- corporate-template-like
- overly playful
- AI-generated
- overly futuristic
- childish
- excessively gradient-heavy

Use gradients intentionally.

A dark hero can transition through deep/electric blue into lighter sections.

Do not put a gradient behind every section.

---

# 5. LANDING PAGE ONLY

This task is ONLY about the public landing page.

Do not redesign or modify:

- dashboard
- organization workspace
- teacher workspace
- timetable
- attendance
- reports
- settings
- onboarding
- database
- Prisma schema
- Better Auth architecture
- API
- server actions
- authorization
- UploadThing
- Polar
- deployment configuration

Do not create new backend infrastructure.

Do not create new database models.

Do not modify existing product functionality except the minimal auth-modal behavior described below.

---

# 6. LANDING PAGE CONTENT STRUCTURE

Create a complete landing page, not just a hero.

Use the following structure as the conceptual direction.

Adapt the exact copy naturally to the real Roll SYNC product.

## A. Navigation

Create a clean premium navigation.

Include:

- Roll SYNC logo/brand
- appropriate product navigation if useful
- minimal links
- Sign in
- Get started

Keep the navbar visually restrained.

On mobile, use a clean responsive navigation.

Do not overload the navbar.

---

# B. HERO

The hero should immediately communicate what Roll SYNC does.

Use:

- dark background
- large typography
- blue accent
- strong visual hierarchy
- short supporting description
- primary CTA
- secondary CTA where useful

The headline should communicate the core idea of synchronized attendance.

Do NOT blindly use generic SaaS phrases such as:

> Simplify. Automate. Scale.

Write copy specifically for Roll SYNC.

The user should understand the product within a few seconds.

Use an appropriate product visual or composition beneath/alongside the hero.

Prefer actual Roll SYNC UI where possible rather than generic stock photography.

---

# C. PRODUCT / PROBLEM SECTION

Introduce the problem Roll SYNC solves.

Conceptually communicate:

People  
Classes  
Timetables  
Attendance

are often fragmented.

Roll SYNC brings them together.

Use strong editorial composition rather than a boring four-card grid.

Keep text concise.

---

# D. CORE PRODUCT SECTION

Create a visually strong section around the core Roll SYNC model.

Use concepts such as:

### People
Know who belongs.

### Classes
Know who belongs together.

### Timetable
Know what should happen.

### Attendance
Know what actually happened.

This section should visually explain the relationship rather than simply listing features.

Use product UI/screenshots/visual elements where appropriate.

---

# E. HOW IT WORKS

Create a concise product flow.

For example:

```text
Set up your organization
        ↓
Create classes and timetable
        ↓
Teachers check in
        ↓
Attendance stays organized
````

Use visual sequencing.

Do not over-explain.

---

# F. BUILT FOR DIFFERENT USE CASES

Roll SYNC can support:

* Schools
* Organizations
* Events

Communicate this without making the product feel unfocused.

The core system remains the same:

**people + schedules + attendance**

Use carefully selected imagery or product visuals where useful.

---

# G. MOBILE / FUTURE DIRECTION

Introduce mobile offline as a future direction.

Do NOT claim that it is currently available.

Possible messaging direction:

> Attendance shouldn't stop when the internet does.

Then explain briefly that:

> Offline-first mobile attendance is coming to Roll SYNC.

This section should feel like a product roadmap/teaser, not a fake feature.

---

# H. FINAL CTA

Finish with a strong, minimal CTA.

The user should know exactly what to do.

Examples of direction:

> Keep everyone in sync.

Then:

**Get started**

Do not make the final section unnecessarily complicated.

---

# 7. IMAGERY

For photography or contextual imagery, use reputable freely accessible image sources such as:

* Unsplash
* Pexels
* other appropriate free image sources

Do not download random copyrighted marketing assets.

Prefer imagery that actually supports the story.

For example:

* classroom
* teacher
* people checking in
* organizational environments
* event environments

Do NOT fill the page with stock photos just because the page needs images.

Actual Roll SYNC UI should be preferred when showing the product.

If image URLs are used, keep the implementation clean and reliable.

Do not add an image dependency/library unless one is genuinely necessary.

---

# 8. PRODUCT UI VISUALS

Where the landing page needs product visuals, inspect the existing application and reuse real UI concepts/components/screens where practical.

Do not create fake dashboards that claim to represent functionality the product does not have.

If a visual mockup is needed:

* keep it lightweight
* use existing components/styles where possible
* avoid duplicating entire application interfaces
* do not create a second design system

The landing page should make the actual product feel tangible.

---

# 9. AUTH MODAL — VERY SMALL CHANGE ONLY

The existing authentication modal is already functional.

DO NOT redesign it.

DO NOT replace it.

DO NOT change its authentication architecture.

The only requested improvement:

### While the auth modal is open:

The user must be able to switch between:

**Sign in**

and

**Sign up**

without closing the modal.

For example:

```text
┌─────────────────────────────┐
│                             │
│        Sign in              │
│                             │
│        form                 │
│                             │
│ Don't have an account?      │
│ Sign up                     │
│                             │
└─────────────────────────────┘
```

and:

```text
┌─────────────────────────────┐
│                             │
│        Sign up              │
│                             │
│        form                 │
│                             │
│ Already have an account?    │
│ Sign in                     │
│                             │
└─────────────────────────────┘
```

The modal should transition cleanly between states.

Keep the existing:

* authentication logic
* Better Auth integration
* validation
* loading states
* error handling
* redirects
* existing visual design

Only add the mode-switching behavior.

Do not turn this into an auth redesign.

---

# 10. ANIMATION

Use animation to make the landing page feel premium.

Keep it restrained.

Good examples:

* hero elements entering subtly
* text reveal
* image movement
* section reveal on scroll
* hover transitions
* button interactions
* card/image hover
* smooth modal state transition

Avoid:

* excessive parallax
* constant movement
* distracting animations
* giant animated gradients
* unnecessary libraries

Respect:

```text
prefers-reduced-motion
```

Use existing Framer Motion if it is already installed.

Do NOT install another animation library.

---

# 11. RESPONSIVE DESIGN

The landing page must be designed intentionally for:

* desktop
* tablet
* mobile

Do not simply shrink the desktop layout.

On mobile:

* typography should remain impactful
* sections should maintain hierarchy
* navigation should become compact
* visuals should not overflow
* CTAs should remain accessible
* spacing should remain intentional
* animations should remain restrained

Test common viewport sizes.

---

# 12. PERFORMANCE

The landing page is public-facing.

Prioritize:

* fast initial render
* optimized images
* minimal JavaScript
* server-rendered content where appropriate
* no unnecessary client components
* no unnecessary dependencies
* no giant assets
* no unnecessary API requests

Do not turn the entire landing page into a client component just to animate it.

Use client components only where interaction requires them.

---

# 13. SEO / METADATA

Make sure the landing page has appropriate:

* title
* description
* metadata
* semantic headings

Use real Roll SYNC language.

Do not add a giant SEO system.

---

# 14. ACCESSIBILITY

Ensure:

* proper heading hierarchy
* semantic buttons/links
* keyboard navigation
* visible focus states
* accessible modal behavior
* alt text
* sufficient contrast
* reduced-motion support

Do not sacrifice accessibility for visual effects.

---

# 15. CODE QUALITY

Act like a senior frontend engineer.

Keep the implementation clean.

Prefer:

* small reusable components
* existing components where appropriate
* clear section boundaries
* minimal abstractions
* strict TypeScript
* no `any`
* no dead code
* no duplicated components

Do NOT create:

* giant monolithic landing-page component
* unnecessary design-system abstraction
* generic "SectionWrapperFactory"
* excessive configuration objects
* unnecessary hooks
* unnecessary state
* unnecessary dependencies

The implementation should be easy for another engineer to understand.

---

# 16. IMPORTANT: DO NOT BLOAT THE APP

This is a hard requirement.

Before adding anything ask:

> Does the landing page actually need this?

If no, don't add it.

Do not introduce:

* new libraries
* new backend routes
* new database tables
* new APIs
* new state management
* new auth infrastructure
* new CMS
* new analytics infrastructure
* new image libraries
* new animation libraries

Reuse what already exists.

---

# 17. EXISTING FUNCTIONALITY MUST REMAIN INTACT

Before finishing, verify that your landing-page changes have not broken:

* authentication
* auth modal
* sign in
* sign up
* auth modal switching
* redirects
* `/new-org`
* existing protected routes
* teacher workspace
* organization workspace

Do not make unrelated fixes.

If you discover unrelated bugs, report them instead of expanding the scope unless the bug directly prevents the landing page/auth modal from working.

---

# 18. VISUAL QUALITY BAR

The final result should feel like a **real modern SaaS product**, not a school-project website.

The attached reference should influence:

* composition
* whitespace
* scale
* typography
* visual rhythm
* section transitions
* premium feel

But the resulting design must be unmistakably:

# ROLL SYNC

The design should communicate:

**people → classes → timetable → attendance → sync**

without requiring the user to read a wall of text.

---

# 19. FINAL VALIDATION

After implementation run:

```bash
pnpm lint
pnpm run build
```

Do not leave errors.

Fix issues caused by the implementation.

Do not use:

* `@ts-ignore`
* `eslint-disable`
* `any`
* ignored build errors

as shortcuts.

---

# 20. FINAL REPORT

When finished, report only:

### Landing page

* sections created
* major visual direction
* responsive status

### Auth modal

* how sign-in/sign-up switching works
* confirmation that existing auth behavior remains intact

### Assets

* image sources used
* whether any external dependencies were added

### Validation

```text
pnpm lint: PASS/FAIL
pnpm run build: PASS/FAIL
```

### Files changed

List the important files only.

### Scope confirmation

Confirm that:

* no database changes were made
* no backend architecture was changed
* no authentication architecture was changed
* no workspace functionality was redesigned
* no unnecessary dependencies were added

Do not claim success if validation fails.

```

### The philosophy behind this prompt

The **first part is deliberately long**, because I don't want the agent jumping straight into:

> “Okay, I'll make a beautiful SaaS landing page.”

and then giving you some random Linear/Stripe/AI-startup website.

It needs to discover that **Roll SYNC's actual story is the design material**.

And the hard boundary at the end is important. You've finally got the MVP working. This phase should be:

**polish the surface → don't destabilize the machine.**

The auth change should literally be the tiny exception: **same modal, same auth, just Sign in ↔ Sign up while open.**
```
