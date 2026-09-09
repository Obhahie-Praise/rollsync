# Roll SYNC — Authentication Modal & Onboarding

## Goal

Implement the Roll SYNC authentication experience on the landing page.

The attached **Get Started modal screenshot is the visual source of truth**. Recreate its layout, spacing, proportions, typography, rounded controls, colors, and overall feel as closely as possible while keeping the implementation responsive and consistent with the existing Roll SYNC design system.

The goal is a **minimal, polished, premium authentication flow** with no unnecessary code or UI bloat.

---

## 1. Landing Page Navbar

The existing landing-page navbar must contain:

- **Get Started**
- **Sign In**

Both buttons must open the authentication modal.

Do not navigate to a separate authentication page when either button is clicked.

Use the existing navbar and landing-page styling. Do not redesign unrelated parts of the landing page.

---

## 2. Authentication Modal

Create one reusable authentication modal that supports both:

- `sign-up`
- `sign-in`

Do **not** create separate duplicated modals.

The modal should visually follow the supplied reference:

### Modal appearance

- Soft/light background
- Roll SYNC logo/wordmark at the top
- Large heading
- Large rounded Google button
- Horizontal `or` divider
- Large rounded input fields
- Large rounded primary action button
- Small terms/privacy text at the bottom
- Generous spacing
- Clean, minimal typography
- No unnecessary cards, shadows, badges, illustrations, or extra copy

The modal should feel like part of the Roll SYNC product, not like a generic authentication template.

---

## 3. Get Started Flow

When the user clicks **Get Started**, open the modal in registration mode.

### Registration fields

Show:

- First name
- Last name
- Email
- Password

First name and last name should sit side-by-side on desktop and stack on smaller screens.

Also provide:

- Continue with Google
- Sign up / continue button
- Terms of Service and Privacy acknowledgement

The password field should include a show/hide control matching the simplicity of the reference design.

---

## 4. Phone Verification

After a successful registration, the user must complete phone verification.

Keep this inside the same authentication experience rather than sending the user to an unrelated page.

The verification step should contain only what is necessary:

- Phone number
- Verification code
- Verify/Continue action
- Resend code

Handle:

- Invalid code
- Expired code
- Resend state
- Loading state
- Successful verification

Do not add unnecessary onboarding questions at this stage.

The flow should remain:

```text
Get Started
    ↓
Registration
    ↓
Phone Verification
    ↓
Authenticated
    ↓
Onboarding
```

---

## 5. Sign In Flow

When the user clicks **Sign In**, open the same modal in sign-in mode.

The sign-in form must **NOT** contain:

- First name
- Last name

It should contain only:

- Email
- Password
- Continue with Google
- Sign in button

Reuse the same input, button, divider, and modal components.

Do not duplicate the registration form just to remove two fields.

---

## 6. Framer Motion Animation

Use the existing **Framer Motion** library.

Opening the modal should feel subtle and premium.

### Enter animation

Use a restrained combination similar to:

```text
opacity: 0 → 1
scale: 0.97 → 1
y: 8px → 0
```

The backdrop should fade in at the same time.

### Exit animation

Reverse the animation when the modal closes.

Avoid:

- Large movement
- Bouncy animations
- Excessive spring physics
- Long transitions

The animation should feel almost effortless.

Use a short duration and a polished easing curve.

---

## 7. Modal Interaction

The modal should:

- Close from a visible close button
- Close when clicking outside the modal
- Close with `Escape`
- Prevent background page scrolling while open
- Restore focus appropriately when closed

Use proper dialog semantics and keyboard accessibility.

---

## 8. Better Auth Integration

Use the existing **Better Auth** implementation already configured in the project.

Do not create another authentication system.

Do not mock successful authentication in the final implementation.

The frontend should use the project's existing auth client/API.

Handle at minimum:

```text
idle
loading
success
validation error
authentication error
verification required
verification error
```

Disable the relevant action button while an authentication request is running to prevent duplicate submissions.

Do not expose secrets or server-only environment variables to the client.

---

## 9. Successful Authentication

Once authentication and required phone verification are complete, redirect the user to:

```text
/onboarding
```

The user should not remain inside the authentication modal after successful completion.

For sign-in, successful authentication should go directly to `/onboarding`.

For registration:

```text
Registration
→ Phone Verification
→ /onboarding
```

---

## 10. Onboarding Placeholder

Create the `/onboarding` page.

For now, this is intentionally just a placeholder UI.

Example:

```text
Roll SYNC

Welcome to Roll SYNC

Let's get your workspace set up.

[ Continue ]
```

Keep it minimal.

Do not implement the complete onboarding system yet.

It only needs to prove that the authenticated user has successfully entered the product.

The page should use the existing Roll SYNC design language.

---

## 11. Minimal Component Structure

Keep the implementation small and clean.

Adapt to the repository's existing structure, but the conceptual structure should be approximately:

```text
auth/
  auth-modal
  auth-form

onboarding/
  page
```

Do not create unnecessary abstractions.

### Avoid

- Separate `GetStartedModal`
- Separate `SignInModal`
- Separate duplicated registration/sign-in forms
- Global state management for this flow
- New UI libraries when existing components are sufficient
- New authentication libraries
- Excessive custom hooks
- Generic components for trivial elements
- Unnecessary utility files

A single modal with a small mode/step state is preferred.

For example:

```ts
type AuthMode = "sign-up" | "sign-in";
type AuthStep = "credentials" | "phone-verification";
```

Only introduce additional state when genuinely required.

---

## 12. Responsive Design

### Desktop

- Comfortable modal width
- First/last name fields displayed side-by-side
- Large, spacious controls
- Layout closely follows the reference image

### Mobile

- Modal fits safely inside the viewport
- First/last name fields stack
- Inputs remain comfortably tappable
- Buttons remain full-width
- No awkward horizontal overflow
- Authentication content remains easy to scan

Do not simply shrink the desktop modal.

Adapt the layout properly.

---

## 13. Accessibility

The implementation must support:

- Keyboard navigation
- Escape-to-close
- Focus management
- Semantic dialog behavior
- Accessible input labels
- Accessible buttons
- Visible focus states
- Proper autocomplete/input types
- Sufficient contrast

Accessibility should be implemented without adding unnecessary complexity.

---

## 14. Code Quality

This implementation is intentionally **anti-bloat**.

Follow these rules:

1. Reuse the same modal for sign-in and sign-up.
2. Reuse form controls.
3. Keep state local and simple.
4. Use existing project components where appropriate.
5. Do not introduce unnecessary dependencies.
6. Do not rewrite working authentication infrastructure.
7. Do not create duplicate API/auth logic.
8. Keep TypeScript strict.
9. Do not use `any`.
10. Keep components focused.
11. Prefer straightforward code over clever abstractions.
12. Do not modify unrelated landing-page sections.

The final code should be easy to understand and maintain.

---

## 15. Definition of Done

- [ ] Landing-page navbar contains Get Started and Sign In.
- [ ] Get Started opens the registration modal.
- [ ] Sign In opens the sign-in modal.
- [ ] Both use the same modal implementation.
- [ ] Modal visually follows the supplied reference.
- [ ] Modal has subtle Framer Motion enter/exit animations.
- [ ] Backdrop animates smoothly.
- [ ] Modal closes through close button, outside click, and Escape.
- [ ] Registration contains first name, last name, email, and password.
- [ ] Sign In contains no first-name or last-name fields.
- [ ] Google authentication is available using the existing Better Auth setup.
- [ ] Registration proceeds to phone verification.
- [ ] Phone verification handles loading, errors, resend, and success.
- [ ] Authentication uses the existing Better Auth infrastructure.
- [ ] Successful authentication redirects to `/onboarding`.
- [ ] `/onboarding` has a clean placeholder UI.
- [ ] Mobile layout works properly.
- [ ] Keyboard accessibility works.
- [ ] No unnecessary dependencies are introduced.
- [ ] No unnecessary abstractions are introduced.
- [ ] TypeScript, lint, and build checks pass.

---

## Final Product Direction

The landing page is selling the Roll SYNC experience, so authentication should reinforce the product's core promise:

> **Attendance without friction.**

The user should be able to move from the landing page to an authenticated workspace with almost no friction.

Keep the interface calm.

Keep the animation subtle.

Keep the flow short.

Keep the code clean.
