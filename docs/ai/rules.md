# AI Rules

These rules apply to every AI-assisted change made to Roll SYNC.

## Core

- Use `pnpm`.
- Keep code simple, readable, and human.
- Follow existing project conventions.
- Prefer the simplest correct solution.
- Avoid unnecessary abstractions and dependencies.
- Do not over-engineer.
- Do not over-type code.
- Do not duplicate existing functionality.

## Architecture

- Respect the documented architecture.
- Do not change architectural decisions without approval.
- Do not invent product requirements.
- If requirements or architecture conflict, stop and ask.
- Keep responsibilities within the correct app/package.
- Do not modify unrelated parts of the repository.

## Security

- Never expose secrets or credentials.
- Never hardcode environment-specific secrets.
- Never bypass authentication or authorization.
- Never store sensitive data insecurely.
- Validate data at appropriate boundaries.

## Implementation

- Inspect existing code before creating new code.
- Reuse existing components and utilities where appropriate.
- Do not create placeholder functionality and present it as complete.
- Handle loading, error, and empty states where relevant.
- Keep changes scoped to the current task.
- Do not remove working functionality without approval.

## Verification

- Test the functionality you implement.
- Fix errors you introduce.
- Do not mark work as complete if it has not been verified.
- Update `progress.md` after completing a task.
- Update `changelog.md` when meaningful changes are made.
- Record important new decisions in `decisions.md`.

## When Unsure

Do not guess about:

- Product behaviour
- Data relationships
- Authentication or authorization
- Billing
- Offline synchronization
- Realtime behaviour
- Architectural boundaries

Ask for clarification instead.