# Implement Create New Organization Page

Implement the `/new-org` page using the attached UI screenshot as the visual reference.

The screenshot is the source of truth for the visual layout. Do not redesign the page or introduce a different visual direction.

## 1. Preserve the existing design

Match the screenshot closely:

- Roll SYNC logo in the top-left.
- Small "New" indicator/text in the top-right.
- Centered "Create new organization" heading.
- Narrow, focused form area.
- Very light blue page background.
- Rounded pill-style controls.
- Blue primary action button.
- Grey secondary/cancel button.
- Clean typography.
- Generous whitespace.
- No sidebar.
- No unnecessary cards, borders, gradients, illustrations, or extra sections.

Use the project's existing styling, components, icons, fonts, and design tokens where appropriate.

Do not replace the existing design with a generic dashboard/form UI.

---

## 2. Organization logo input

Implement the logo input as part of this page.

There is currently an `org-logo` UploadThing route intended for this purpose. Inspect the existing UploadThing implementation and use it rather than creating another upload system.

### Initial state

Add a compact logo upload area that fits naturally into the existing form.

It should communicate:

- Add organization logo
- Optional

Do not make the logo required.

### After selecting/uploading a logo

Show a preview of the actual uploaded/selected image.

The preview should look polished and fit the minimal design.

### Hover interaction

When the user hovers over the logo preview:

- Show a subtle overlay.
- Display a clear `Change logo` action/button.
- Keep the original logo visible underneath the overlay.
- Use a subtle opacity/scale transition.
- Do not use excessive animation.

Clicking `Change logo` should reopen the file picker.

Also allow clicking the preview itself to change the logo if that fits the existing component naturally.

### Upload behaviour

- Use the existing `org-logo` UploadThing endpoint.
- Support the image formats already supported by that route.
- Do not create a second upload endpoint.
- Do not make organization creation dependent on the logo upload.
- Handle upload/loading/error states gracefully.
- Prevent accidental multiple uploads while an upload is in progress.
- If the upload fails, show a small inline error and allow the user to retry.
- If the user removes/replaces the logo before submitting, make sure the form uses the latest logo URL.

Do not add image processing or unnecessary storage logic.

---

## 3. Organization type

Keep the existing:

- School
- Organization
- Event

selector.

It must be functional.

The selected type should control the terminology used by the form.

Examples:

### School
`School name`

### Organization
`Organization name`

### Event
`Event name`

Do not create separate forms for each type.

Keep one shared form with dynamic terminology.

---

## 4. Organization name

The name field should:

- Be required.
- Use the existing validation conventions in the project.
- Provide useful client-side validation.
- Never trust client-side validation alone.

Do not invent a new validation library if the project already has a validation approach.

---

## 5. Workspace URL / slug

Keep the workspace preview shown in the screenshot.

Generate the slug from the organization name using the project's existing slug conventions.

Example:

`John Does School`

becomes:

`john-does-school`

Display the resulting workspace URL as a preview.

The slug should be validated server-side.

If the slug already exists:

- Do not create the organization.
- Return a useful validation error.
- Allow the user to correct the name/custom slug according to the existing backend protocol.

Do not create organizations just to test slug availability.

---

## 6. Form submission

The form MUST follow the existing backend protocol and data model.

Before implementing submission:

1. Inspect the existing organization/entity schema.
2. Inspect the existing onboarding creation flow.
3. Inspect the existing server action/API used for organization creation.
4. Reuse the existing validation and creation logic wherever possible.
5. Reuse the existing membership/ownership logic.
6. Reuse the existing slug-generation logic if available.

Do NOT create a parallel organization-creation implementation if the existing backend already handles this.

The new page should be another client of the existing backend protocol.

### On successful creation

The backend should handle the existing creation contract, including whatever is already required for:

- authenticated user
- organization/entity creation
- entity type
- name
- slug
- logo URL, if provided
- owner membership
- required onboarding/completion state

After successful creation, redirect the user to the newly created workspace, following the existing workspace routing convention:

`/[slug]/overview`

---

## 7. Authentication and authorization

This page must use the existing Better Auth setup.

Do not trust client-side authentication.

The server must verify the current authenticated user before creating anything.

If an unauthenticated user somehow reaches `/new-org`, handle it using the project's existing authentication/redirect conventions.

Do not introduce a second authentication system.

---

## 8. Loading and submission states

The Create organization button should become a proper loading state while submitting.

For example:

`Creating...`

with the existing subtle loading treatment.

Prevent duplicate submissions.

The Cancel button should return the user to the appropriate previous/home/workspace location according to the existing routing conventions.

---

## 9. Error handling

Handle errors without destroying the user's form state.

At minimum:

- Empty/invalid organization name
- Invalid organization type
- Duplicate slug
- Unauthorized request
- Upload failure
- Server/database failure
- Network/request failure

Errors should be displayed inline and naturally within the existing design.

Do not use large generic error screens for normal form errors.

---

## 10. Persistence and UX

If the page is refreshed while the user is filling the form, do not create anything automatically.

Do not create partial organizations.

The organization should only be created after the user explicitly presses:

`Create organization →`

Logo uploads may happen before submission, but the uploaded logo must not trigger organization creation.

---

## 11. Animations

Add only subtle premium interactions:

- button hover/press feedback
- type selector transitions
- logo upload/preview transition
- logo hover overlay
- loading state
- validation/error transitions where appropriate

Respect `prefers-reduced-motion`.

Do not make the page feel like an animation demo.

---

## 12. Important constraints

- Do NOT redesign the screenshot.
- Do NOT rebuild onboarding.
- Do NOT create a new onboarding flow.
- Do NOT create a new organization backend if one already exists.
- Do NOT create another UploadThing endpoint.
- Do NOT modify Better Auth unnecessarily.
- Do NOT modify the Prisma schema unless the existing backend genuinely lacks a required field.
- Do NOT introduce realtime/WebSockets.
- Do NOT introduce unnecessary dependencies.
- Do NOT upgrade package versions.
- Keep the implementation small and maintainable.
- Use strict TypeScript.
- No `any`.
- Reuse existing components/utilities where appropriate.
- Follow the project's existing naming and folder conventions.

## 13. Production checks

After implementation, run:

```bash
pnpm lint
pnpm run build

Fix all errors introduced by this implementation.

Also verify manually that:

/new-org loads correctly.
School/Organization/Event selection works.
Name changes the workspace slug preview.
Logo can be selected.
Logo preview appears.
Hovering the preview reveals Change logo.
Changing the logo works.
Upload errors are handled.
Empty/invalid form submission is blocked.
Duplicate submission is prevented.
Successful creation creates the correct entity and membership.
Successful creation redirects to /{slug}/overview.
Refreshing the form does not create an organization.
Unauthenticated creation attempts are rejected server-side.

Do not stop at making the UI look correct. Make the entire create-organization flow actually work with the existing backend architecture.


### One thing I'd specifically emphasize to the agent

The **logo should be treated as an optional attachment to the creation flow, not as the thing that creates the organization**.

So the lifecycle should effectively be:

**select logo → upload → preview → fill form → Create organization → backend creates everything → redirect**

rather than:

**upload logo → organization gets created → form finishes later**

That keeps the data model clean and prevents abandoned `/new-org` pages from creating half-finished organizations.