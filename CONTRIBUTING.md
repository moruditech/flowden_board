# Contributing

Thank you for contributing to Team Workspace.

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Production — protected, merge via PR only |
| `develop` | Integration — all PRs target this |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, deps, refactors |
| `docs/*` | Documentation only |

---

## Getting started

```bash
git clone https://github.com/your-org/team-workspace.git
cd team-workspace
cd server && cp .env.example .env && npm install
cd ../client && npm install
```

---

## Making a change

1. Cut a branch from `develop`
2. Write code following the conventions below
3. Add or update tests — PRs without tests for new service methods will not be merged
4. Run checks locally:
   ```bash
   cd server && npm test
   cd ../client && npm run build
   ```
5. Commit using Conventional Commits:
   ```
   feat(tasks): add bulk-move endpoint
   fix(auth): handle expired token in refresh middleware
   docs(email): document weekly digest job
   ```
6. Open a PR against `develop`

---

## Coding conventions

### Server

**Module rule — strictly enforced:**
- `*.validation.js` — Joi schemas only
- `*.service.js` — business logic, DB calls, eventBus emissions. No `req`, no `res`, no socket references
- `*.controller.js` — calls service, shapes HTTP response. Uses `asyncHandler`. No logic
- `*.routes.js` — route wiring only. Applies middleware, calls controller

**Cross-module communication:**
Services never import other module's services. If module A needs to react to module B's
actions, module B emits on `eventBus` and module A listens. This keeps modules independently
testable and deployable.

**Error handling:**
Always throw `AppError` subclasses from services. Never `throw new Error('...')`.
Controllers don't catch — `asyncHandler` forwards to the global `errorHandler`.

**Email:**
Services emit events. `email.module.js` bridges events to queue jobs.
No service ever imports `email.queue.js` or `nodemailer` directly.

### Tests

- Every new service method needs a happy-path and at least one failure-path test
- Use `factories.js` helpers — don't call Mongoose models directly in tests
- Never mock Mongoose — test against real documents in `mongodb-memory-server`
- File naming: `*.service.test.js` for unit, `*.routes.test.js` for integration

### Client

- Data fetching exclusively through TanStack Query hooks in `features/*/hooks/`
- Socket event handlers exclusively in `useBoardSocket.js`
- Zustand stores for auth state and UI state only — never for server data
- Components receive data as props from their parent page — no fetching in leaf components
- No inline styles — Tailwind utility classes only
- No emoji in UI text or labels

---

## Adding a new server module

1. Create `src/modules/<name>/`
2. Add `<name>.validation.js`, `<name>.service.js`, `<name>.controller.js`, `<name>.routes.js`
3. Register the router in `src/routes/index.js`
4. If the module emits events: add listeners in `activity.service.js` and `email.module.js`
5. Add `tests/modules/<name>.test.js`

---

## Adding a new email template

1. Add the template file to `src/modules/email/templates/<name>.hbs`
2. Add a job helper function to `email.queue.js`
3. Add the job handler case to `email.worker.js`
4. Add the eventBus listener to `email.module.js`

---

## PR checklist

- [ ] Branch is off `develop`
- [ ] `npm test` passes with no new failures
- [ ] New service methods have tests
- [ ] No `console.log` in committed code (use `logger`)
- [ ] No `any` or untyped dynamic access without a comment explaining why
- [ ] PR description explains what changed and why
