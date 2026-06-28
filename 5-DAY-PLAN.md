# Team Workspace — 5-Day Development Plan

Based on the approved plan: 138 files, 14 phases, built in strict order.
Each day has a clear goal, file list, and a testable deliverable by end of day.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DAY 1 — Foundation & Infrastructure
Goal: Server boots. MongoDB and Redis connect. All models, middleware,
      and utilities exist and are importable. No business logic yet.

  FILES TO BUILD (29 files)

  Morning Session — Server skeleton + config + utilities
  -------------------------------------------------------
  server/server.js                          Entry point
  server/app.js                             Express factory
  server/package.json                       Dependencies
  server/.env.example                       Environment template
  server/src/config/env.js                  Env validation + export
  server/src/config/database.js             MongoDB connect/disconnect
  server/src/config/redis.js                Redis main client + BullMQ factory
  server/src/shared/utils/AppError.js       Error class + factory shortcuts
  server/src/shared/utils/asyncHandler.js   try/catch wrapper
  server/src/shared/utils/apiResponse.js    success / created / noContent
  server/src/shared/utils/logger.js         Winston singleton
  server/src/shared/utils/jwt.js            sign + verify access & refresh
  server/src/shared/utils/bcrypt.js         hash + compare passwords
  server/src/shared/utils/crypto.js         generateToken / hashToken / positionBetween
  server/src/shared/utils/pagination.js     parsePagination / buildMeta
  server/src/shared/events/eventBus.js      Node EventEmitter singleton

  Afternoon Session — Models
  ---------------------------
  server/src/shared/models/User.model.js
  server/src/shared/models/RefreshToken.model.js
  server/src/shared/models/Organization.model.js
  server/src/shared/models/Membership.model.js
  server/src/shared/models/Board.model.js
  server/src/shared/models/Task.model.js
  server/src/shared/models/Invite.model.js
  server/src/shared/models/ActivityLog.model.js

  Evening Session — Middleware + Routes registry
  -----------------------------------------------
  server/src/shared/middleware/authenticate.js
  server/src/shared/middleware/authorize.js
  server/src/shared/middleware/validate.js
  server/src/shared/middleware/rateLimiter.js
  server/src/shared/middleware/requestLogger.js
  server/src/shared/middleware/notFound.js
  server/src/shared/middleware/errorHandler.js
  server/src/routes/index.js

  END-OF-DAY CHECKPOINT
  ✓ npm start runs without error
  ✓ GET /health returns { status: 'ok' }
  ✓ MongoDB connection log appears
  ✓ Redis connection log appears
  ✓ All 8 models importable without errors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DAY 2 — Auth Module + Complete Email System
Goal: Users can register, login, logout, reset password, verify email.
      Every email is queued and delivered via BullMQ + Nodemailer +
      13 Handlebars templates. Auth is fully tested.

  FILES TO BUILD (22 files)

  Morning Session — Auth module
  ------------------------------
  server/src/modules/auth/auth.validation.js
  server/src/modules/auth/auth.service.js
  server/src/modules/auth/auth.controller.js
  server/src/modules/auth/auth.routes.js

  Afternoon Session — Email module (JS layer)
  --------------------------------------------
  server/src/modules/email/email.service.js
  server/src/modules/email/email.queue.js
  server/src/modules/email/email.worker.js
  server/src/modules/email/email.module.js

  Evening Session — All 14 Handlebars templates
  -----------------------------------------------
  server/src/modules/email/templates/layouts/base.hbs
  server/src/modules/email/templates/welcome.hbs
  server/src/modules/email/templates/verify-email.hbs
  server/src/modules/email/templates/password-reset.hbs
  server/src/modules/email/templates/password-reset-success.hbs
  server/src/modules/email/templates/team-invite.hbs
  server/src/modules/email/templates/invite-accepted.hbs
  server/src/modules/email/templates/member-removed.hbs
  server/src/modules/email/templates/role-changed.hbs
  server/src/modules/email/templates/task-assigned.hbs
  server/src/modules/email/templates/task-due-reminder.hbs
  server/src/modules/email/templates/weekly-digest.hbs
  server/src/modules/email/templates/security-alert.hbs
  server/src/modules/email/templates/account-deleted.hbs

  END-OF-DAY CHECKPOINT
  ✓ POST /api/v1/auth/register creates user + queues welcome & verify-email jobs
  ✓ POST /api/v1/auth/login returns access token + sets refresh cookie
  ✓ POST /api/v1/auth/refresh rotates token pair
  ✓ POST /api/v1/auth/forgot-password queues password-reset email
  ✓ POST /api/v1/auth/reset-password changes password + queues confirmation email
  ✓ POST /api/v1/auth/verify-email sets emailVerified: true
  ✓ BullMQ email worker processes jobs (check Mailtrap / SMTP logs)
  ✓ All 13 templates render without Handlebars errors
  ✓ tests/modules/auth.test.js all passing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DAY 3 — Business Modules + Real-time + Jobs + Tests
Goal: Full REST API is complete. Socket.io broadcasts live. BullMQ
      cleanup jobs run. All test suites pass.

  FILES TO BUILD (43 files)

  Morning Session — Core business modules
  ----------------------------------------
  server/src/modules/users/user.validation.js
  server/src/modules/users/user.service.js
  server/src/modules/users/user.controller.js
  server/src/modules/users/user.routes.js

  server/src/modules/organizations/organization.validation.js
  server/src/modules/organizations/organization.service.js
  server/src/modules/organizations/organization.controller.js
  server/src/modules/organizations/organization.routes.js

  server/src/modules/boards/board.validation.js
  server/src/modules/boards/board.service.js
  server/src/modules/boards/board.controller.js
  server/src/modules/boards/board.routes.js

  server/src/modules/tasks/task.validation.js
  server/src/modules/tasks/task.service.js
  server/src/modules/tasks/task.controller.js
  server/src/modules/tasks/task.routes.js

  Afternoon Session — Invites + Activity + Real-time + Jobs
  ----------------------------------------------------------
  server/src/modules/invites/invite.validation.js
  server/src/modules/invites/invite.service.js
  server/src/modules/invites/invite.controller.js
  server/src/modules/invites/invite.routes.js

  server/src/modules/activity/activity.service.js
  server/src/modules/activity/activity.controller.js
  server/src/modules/activity/activity.routes.js

  server/src/modules/realtime/socketAuth.js
  server/src/modules/realtime/handlers/board.handler.js
  server/src/modules/realtime/handlers/presence.handler.js
  server/src/modules/realtime/socket.js

  server/src/jobs/queues.js
  server/src/jobs/workers/email.worker.js
  server/src/jobs/workers/cleanup.worker.js
  server/src/jobs/index.js

  Evening Session — Tests + Seed
  --------------------------------
  server/tests/setup.js
  server/tests/helpers/factories.js
  server/tests/helpers/request.js
  server/tests/modules/auth.test.js
  server/tests/modules/organization.test.js
  server/tests/modules/board.test.js
  server/tests/modules/task.test.js
  server/tests/modules/invite.test.js
  server/scripts/seed.js

  DevOps files
  -------------
  server/Dockerfile
  server/ecosystem.config.js
  docker-compose.yml (root)

  END-OF-DAY CHECKPOINT
  ✓ All REST endpoints respond correctly (test with Postman / curl)
  ✓ Socket.io connects with valid JWT
  ✓ Task move on one client appears on second client within 200ms
  ✓ Presence shows correct users in board room
  ✓ BullMQ cleanup worker runs and logs purge counts
  ✓ npm test → all 5 test suites green (auth, org, board, task, invite)
  ✓ node scripts/seed.js creates demo data without errors
  ✓ docker compose up starts mongo + redis + server cleanly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DAY 4 — Client Foundation + UI Component Library
Goal: React client boots, connects to API, handles auth silently.
      Every reusable UI primitive is built and ready for features.

  FILES TO BUILD (35 files)

  Morning Session — Client config + API layer + state
  ----------------------------------------------------
  client/package.json
  client/vite.config.js
  client/tailwind.config.js
  client/postcss.config.js
  client/index.html
  client/src/index.css

  client/src/api/client.js
  client/src/api/auth.api.js
  client/src/api/organization.api.js
  client/src/api/board.api.js
  client/src/api/task.api.js
  client/src/api/invite.api.js
  client/src/api/activity.api.js

  client/src/lib/queryClient.js
  client/src/lib/socket.js

  client/src/store/authStore.js
  client/src/store/uiStore.js

  client/src/utils/position.js
  client/src/utils/date.js
  client/src/utils/cn.js

  client/src/hooks/useDebounce.js
  client/src/hooks/useClickOutside.js

  Afternoon Session — UI primitives + Layout + Shared
  ----------------------------------------------------
  client/src/components/ui/Button.jsx
  client/src/components/ui/Input.jsx
  client/src/components/ui/Modal.jsx
  client/src/components/ui/Avatar.jsx
  client/src/components/ui/Badge.jsx
  client/src/components/ui/Spinner.jsx
  client/src/components/ui/Skeleton.jsx
  client/src/components/ui/ConfirmDialog.jsx

  client/src/components/layout/AppLayout.jsx
  client/src/components/layout/Sidebar.jsx
  client/src/components/layout/Header.jsx

  client/src/components/shared/ErrorBoundary.jsx
  client/src/components/shared/ProtectedRoute.jsx
  client/src/components/shared/EmptyState.jsx

  Evening Session — App shell
  ----------------------------
  client/src/main.jsx
  client/src/App.jsx

  END-OF-DAY CHECKPOINT
  ✓ npm run dev starts Vite without errors
  ✓ Navigating to /login shows login form
  ✓ Logging in sets auth store + access token in memory
  ✓ Page refresh silently restores session (calls /auth/refresh)
  ✓ Unauthenticated access to / redirects to /login
  ✓ All 8 UI primitives render in isolation (test manually)
  ✓ Sidebar renders with org switcher placeholder
  ✓ Socket connects after login (check network tab)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DAY 5 — Client Features + Documentation + Final QA
Goal: Complete, working application. Every page functional.
      Kanban drag-and-drop works. Real-time sync confirmed.
      Documentation complete. Ready to deploy.

  FILES TO BUILD (33 files)

  Morning Session — Auth pages + Organization features
  -----------------------------------------------------
  client/src/features/auth/LoginPage.jsx
  client/src/features/auth/RegisterPage.jsx
  client/src/features/auth/ForgotPasswordPage.jsx
  client/src/features/auth/ResetPasswordPage.jsx
  client/src/features/auth/VerifyEmailPage.jsx
  client/src/features/auth/useAuth.js

  client/src/features/organizations/components/OrgSwitcher.jsx
  client/src/features/organizations/components/CreateOrgModal.jsx
  client/src/features/organizations/components/MemberCard.jsx
  client/src/features/organizations/components/InviteModal.jsx
  client/src/features/organizations/hooks/useOrganizations.js
  client/src/features/organizations/hooks/useMembers.js
  client/src/features/organizations/OrgDashboard.jsx
  client/src/features/organizations/MembersPage.jsx
  client/src/features/organizations/InvitesPage.jsx

  Afternoon Session — Board + Task + Activity + Invites
  ------------------------------------------------------
  client/src/features/boards/hooks/useBoards.js
  client/src/features/boards/hooks/useTasks.js
  client/src/features/boards/hooks/useBoardSocket.js
  client/src/features/boards/components/BoardCard.jsx
  client/src/features/boards/components/BoardColumn.jsx
  client/src/features/boards/components/TaskCard.jsx
  client/src/features/boards/components/CreateBoardModal.jsx
  client/src/features/boards/components/TaskDetailModal.jsx
  client/src/features/boards/BoardsListPage.jsx
  client/src/features/boards/BoardPage.jsx

  client/src/features/activity/useActivity.js
  client/src/features/activity/ActivityFeed.jsx

  client/src/features/invites/InviteAcceptPage.jsx

  Evening Session — Documentation + CI
  --------------------------------------
  README.md
  CONTRIBUTING.md
  server/docs/api.md
  server/docs/email-setup.md
  .github/workflows/ci.yml

  END-OF-DAY CHECKPOINT — Full system test
  ✓ Register → receive welcome email → verify email → login
  ✓ Create organization → invite member → member receives invite email
  ✓ Member accepts invite → inviter receives accepted email
  ✓ Create board with custom columns
  ✓ Create tasks → assign to member → member receives task-assigned email
  ✓ Drag task between columns on Browser A → Browser B updates within 200ms
  ✓ Presence indicator shows who else is on the board
  ✓ Click forgot password → receive reset email → reset → login with new password
  ✓ Activity feed shows all events in chronological order
  ✓ docker compose up → docker compose down → all clean
  ✓ npm test → 100% suites passing
  ✓ README has setup instructions that work from scratch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILE COUNT PER DAY

  Day 1    29 files    Foundation + models + middleware
  Day 2    22 files    Auth module + email module + 13 templates
  Day 3    43 files    6 business modules + realtime + jobs + tests + devops
  Day 4    35 files    Client foundation + API layer + all UI components
  Day 5    33 files    Client features + documentation + final QA

  TOTAL   162 files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## RULES TO FOLLOW DURING BUILD

  1. Files are built in the exact order listed above. No jumping ahead.
  2. Each file is written completely — no TODOs, no stub functions.
  3. No file combines two responsibilities.
  4. The end-of-day checkpoint must pass before moving to the next day.
  5. If a file depends on another not yet built, that dependency is built first.
  6. Every module follows: validation → service → controller → routes.
  7. Services emit events on eventBus. They never import socket.io or email queue.
  8. email.module.js is the only file that bridges eventBus and emailQueue.
  9. board.handler.js is the only file that bridges eventBus and socket.io rooms.
  10. Tests use mongodb-memory-server. No external DB needed for test runs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build starts on Day 1 immediately upon your approval.
