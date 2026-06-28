# Team Workspace — Project Plan

A production-grade, open-source multi-tenant team collaboration tool.
Users belong to organizations. Each organization has Kanban boards.
Boards have columns and tasks. Tasks sync in real time across all
connected users via Socket.io. A complete email system handles every
lifecycle event through a BullMQ job queue and 13 Handlebars templates.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 1 — TECHNOLOGY STACK

| Layer             | Technology                          | Reason                                          |
|-------------------|-------------------------------------|-------------------------------------------------|
| Runtime           | Node.js 20 LTS                      | Stable, async I/O, wide ecosystem               |
| Framework         | Express 4                           | Unopinionated, middleware-first                 |
| Database          | MongoDB 7 + Mongoose 8              | Flexible documents, embedded columns            |
| Cache / PubSub    | Redis 7 via ioredis                 | Rate limiter, BullMQ backend, session store     |
| Real-time         | Socket.io 4                         | Rooms, auto-reconnect, fallback transport       |
| Job queue         | BullMQ 5                            | Persistent, retries, repeating jobs, Redis-backed |
| Email delivery    | Nodemailer                          | SMTP, zero vendor lock-in                       |
| Email templates   | Handlebars (nodemailer-express-handlebars) | Partials, layouts, no build step          |
| Input validation  | Joi 17                              | Expressive schemas, excellent error messages    |
| Auth              | JWT access (15 min) + JWT refresh (7 days, httpOnly cookie) | Stateless API + secure sessions |
| Password hashing  | bcryptjs cost factor 12             | Industry standard                               |
| Logging           | Winston + winston-daily-rotate-file | JSON in prod, coloured in dev, log rotation     |
| Process manager   | PM2 (ecosystem.config.js)           | Cluster mode, auto-restart, zero-downtime       |
| Frontend          | React 18 + Vite 5                   | Fast HMR, tree-shaking                         |
| Server state      | TanStack Query v5                   | Cache, deduplication, optimistic updates        |
| UI state          | Zustand 4                           | Minimal boilerplate, no context hell            |
| Drag and drop     | @dnd-kit                            | Accessible, actively maintained                 |
| Styling           | Tailwind CSS 3                      | Utility-first, no runtime overhead              |
| HTTP client       | Axios                               | Interceptors for silent token refresh           |
| Testing           | Jest + Supertest + mongodb-memory-server | Real DB in memory, no mocks             |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 2 — REPOSITORY LAYOUT

    team-workspace/
    ├── server/
    ├── client/
    ├── docker-compose.yml
    ├── .env.example
    ├── .gitignore
    ├── README.md
    └── .github/
        └── workflows/
            └── ci.yml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 3 — SERVER FILE TREE (83 files)

    server/
    ├── server.js                       Entry point. Creates HTTP server, boots
    │                                   MongoDB, Redis, Socket.io, BullMQ workers.
    │                                   Registers graceful shutdown (SIGTERM/SIGINT).
    │
    ├── app.js                          Express factory. Applies all global middleware
    │                                   then mounts routes/index.js at /api/v1.
    │                                   Does NOT start listening — server.js does that.
    │
    ├── package.json
    ├── .env.example
    ├── Dockerfile
    ├── ecosystem.config.js             PM2 cluster config (2 workers per CPU core)
    │
    └── src/
        │
        ├── config/
        │   ├── env.js                  Reads process.env, applies defaults, exports
        │   │                           one frozen config object. Throws on missing
        │   │                           required vars so the server fails fast.
        │   │
        │   ├── database.js             connectDB() — Mongoose connect with pool options.
        │   │                           Listens to disconnected/error events and logs.
        │   │
        │   └── redis.js               connectRedis() — main ioredis client (DB 0).
        │                               getRedis() — returns singleton.
        │                               getBullConn() — new connection for BullMQ (DB 1).
        │                               Separate connections required by BullMQ spec.
        │
        ├── shared/
        │   │
        │   ├── models/                 One Mongoose model per file. All schemas use
        │   │   │                       toJSON transform: adds id, removes _id + __v.
        │   │   │
        │   │   ├── User.model.js       Fields: name, email (unique), passwordHash
        │   │   │                       (select:false), avatarUrl, isActive,
        │   │   │                       emailVerified, emailVerificationToken (select:false),
        │   │   │                       emailVerificationExpires, passwordResetToken
        │   │   │                       (select:false), passwordResetExpires.
        │   │   │                       Index: { email: 1 }
        │   │   │
        │   │   ├── RefreshToken.model.js  Fields: user (ref), tokenHash (unique,
        │   │   │                       select:false), expiresAt, userAgent, ip.
        │   │   │                       TTL index on expiresAt (auto-purge).
        │   │   │                       Index: { user: 1 }
        │   │   │
        │   │   ├── Organization.model.js  Fields: name, slug (unique, lowercase),
        │   │   │                       description, logoUrl, createdBy (ref).
        │   │   │
        │   │   ├── Membership.model.js    Fields: user (ref), organization (ref),
        │   │   │                       role (owner | admin | member).
        │   │   │                       Compound unique index: { user, organization }.
        │   │   │                       Index: { organization, role }.
        │   │   │
        │   │   ├── Board.model.js      Fields: organization (ref), name, description,
        │   │   │                       columns [{ _id, name, order }] (embedded),
        │   │   │                       createdBy (ref), isArchived.
        │   │   │                       Index: { organization, isArchived, createdAt: -1 }
        │   │   │
        │   │   ├── Task.model.js       Fields: board (ref), column (ObjectId pointing
        │   │   │                       to Board.columns._id), title, description,
        │   │   │                       assignee (ref, nullable), position (Number,
        │   │   │                       fractional), labels ([String]), dueDate,
        │   │   │                       createdBy (ref).
        │   │   │                       Index: { board, column, position } — primary read.
        │   │   │
        │   │   ├── Invite.model.js     Fields: organization (ref), email, role
        │   │   │                       (admin | member), tokenHash (unique, select:false),
        │   │   │                       invitedBy (ref), expiresAt, acceptedAt.
        │   │   │                       TTL index on expiresAt (auto-purge).
        │   │   │                       Index: { organization, email }
        │   │   │
        │   │   └── ActivityLog.model.js  Fields: organization (ref), board (ref,
        │   │                           nullable), actor (ref), action (String),
        │   │                           metadata (Mixed). Append-only (no updatedAt).
        │   │                           Index: { organization, createdAt: -1 }
        │   │                           Index: { board, createdAt: -1 }
        │   │
        │   ├── middleware/             One file per concern. Imported individually
        │   │   │                       by routes — never as a barrel.
        │   │   │
        │   │   ├── authenticate.js     Reads Authorization: Bearer <token>.
        │   │   │                       Calls verifyAccessToken(). Attaches req.user
        │   │   │                       = { id, email }. Forwards errors to next().
        │   │   │
        │   │   ├── authorize.js        authorize(minRole) factory. Looks up Membership
        │   │   │                       for req.user.id + req.params.orgId. Checks
        │   │   │                       role rank. Attaches req.membership. Returns
        │   │   │                       403 if insufficient role.
        │   │   │
        │   │   ├── validate.js         validate(joiSchema, target='body') factory.
        │   │   │                       Runs schema.validate(), strips unknown fields,
        │   │   │                       replaces req[target] with sanitised value.
        │   │   │                       Returns 422 with field-level errors on failure.
        │   │   │
        │   │   ├── rateLimiter.js      globalLimiter: 200 req / 15 min per IP.
        │   │   │                       authLimiter: 10 req / 15 min per IP.
        │   │   │                       Both use express-rate-limit. Both skipped in
        │   │   │                       test environment.
        │   │   │
        │   │   ├── requestLogger.js    Logs method, url, status, duration, ip via
        │   │   │                       Winston. Used in production. Morgan used in dev.
        │   │   │
        │   │   ├── notFound.js         Catches any route not matched. Returns 404
        │   │   │                       with { success: false, error: { code, message }}.
        │   │   │
        │   │   └── errorHandler.js     4-argument Express error handler (must be last).
        │   │                           Handles: AppError, Mongoose ValidationError,
        │   │                           Mongoose CastError, duplicate key (11000),
        │   │                           JWT errors, unknown errors. Always returns
        │   │                           { success: false, error: { code, message }}.
        │   │
        │   └── utils/                  One file per utility. No barrel exports.
        │       │                       Each file imported directly where needed.
        │       │
        │       ├── AppError.js         class AppError extends Error with statusCode
        │       │                       and errorCode. Static factories: badRequest(),
        │       │                       unauthorized(), forbidden(), notFound(),
        │       │                       conflict(), validation(), tooMany(), internal().
        │       │
        │       ├── asyncHandler.js     (fn) => (req, res, next) =>
        │       │                       Promise.resolve(fn(req,res,next)).catch(next)
        │       │                       Eliminates try/catch in every controller.
        │       │
        │       ├── apiResponse.js      success(res, data, statusCode=200, meta=null)
        │       │                       created(res, data, meta=null)
        │       │                       noContent(res)
        │       │
        │       ├── logger.js           Winston singleton. JSON format in production
        │       │                       with daily log rotation. Coloured dev format.
        │       │                       Silent in test environment.
        │       │
        │       ├── jwt.js              signAccessToken(payload) — signs with ACCESS_SECRET
        │       │                       signRefreshToken(payload) — signs with REFRESH_SECRET
        │       │                       verifyAccessToken(token) — throws on invalid/expired
        │       │                       verifyRefreshToken(token) — throws on invalid/expired
        │       │                       getAccessExpiresMs() — returns TTL in milliseconds
        │       │
        │       ├── bcrypt.js           hashPassword(plain) — bcrypt.hash, cost 12
        │       │                       comparePassword(plain, hash) — bcrypt.compare
        │       │
        │       ├── crypto.js           generateToken(bytes=48) — random hex string
        │       │                       hashToken(token) — SHA-256 hex (store this, not raw)
        │       │                       positionBetween(before, after) — fractional index
        │       │                       midpoint for task ordering. Handles null edges.
        │       │
        │       └── pagination.js       parsePagination(query) — returns { page, limit, skip }
        │                               buildMeta(total, page, limit) — returns pagination
        │                               meta object for API responses.
        │
        ├── modules/
        │   │
        │   │   Rule: each module owns its routes, controller, service, validation.
        │   │   Modules communicate only through eventBus — never by importing
        │   │   each other's services directly.
        │   │
        │   ├── auth/
        │   │   ├── auth.validation.js  Joi schemas: register, login, forgotPassword,
        │   │   │                       resetPassword, verifyEmail, changePassword.
        │   │   │
        │   │   ├── auth.service.js     register() — creates user, hashes password,
        │   │   │                       generates emailVerificationToken, issues tokens,
        │   │   │                       emits auth.registered event.
        │   │   │                       login() — validates credentials, detects new
        │   │   │                       device/IP, issues tokens, emits auth.login event.
        │   │   │                       refresh() — verifies refresh JWT + DB record,
        │   │   │                       rotates token pair.
        │   │   │                       logout(jti) — deletes RefreshToken document.
        │   │   │                       logoutAll(userId) — deletes all user's tokens.
        │   │   │                       forgotPassword() — generates reset token (hashed
        │   │   │                       in DB), emits auth.forgotPassword event.
        │   │   │                       resetPassword() — validates token, updates hash,
        │   │   │                       revokes all sessions, emits auth.passwordReset.
        │   │   │                       verifyEmail() — validates token, sets emailVerified.
        │   │   │                       resendVerification() — regenerates token, emits event.
        │   │   │
        │   │   ├── auth.controller.js  Thin HTTP layer. Calls auth.service methods.
        │   │   │                       Manages refresh_token httpOnly cookie (set on
        │   │   │                       login/register/refresh, cleared on logout).
        │   │   │                       All methods wrapped in asyncHandler.
        │   │   │
        │   │   └── auth.routes.js      POST /register (authLimiter + validate)
        │   │                           POST /login    (authLimiter + validate)
        │   │                           POST /refresh
        │   │                           POST /logout
        │   │                           POST /logout-all          (authenticate)
        │   │                           GET  /me                   (authenticate)
        │   │                           POST /forgot-password      (authLimiter + validate)
        │   │                           POST /reset-password       (validate)
        │   │                           POST /verify-email         (validate)
        │   │                           POST /resend-verification  (authenticate)
        │   │
        │   ├── users/
        │   │   ├── user.validation.js  Joi schemas: updateProfile, changePassword.
        │   │   ├── user.service.js     getById(), updateProfile(), changePassword()
        │   │   │                       (validates current password, revokes sessions).
        │   │   │                       deleteAccount() — soft delete, revokes sessions.
        │   │   ├── user.controller.js
        │   │   └── user.routes.js      PATCH /me (authenticate + validate)
        │   │                           PATCH /me/password (authenticate + validate)
        │   │                           DELETE /me (authenticate)
        │   │
        │   ├── organizations/
        │   │   ├── organization.validation.js  createOrg, updateOrg, updateMemberRole
        │   │   ├── organization.service.js     create() — makes creator owner.
        │   │   │                               listForUser() — orgs with user's role.
        │   │   │                               getById(), update(), delete() — cascades
        │   │   │                               boards, tasks, members, invites.
        │   │   │                               listMembers(), updateMemberRole(),
        │   │   │                               removeMember() — both emit events.
        │   │   ├── organization.controller.js
        │   │   └── organization.routes.js
        │   │                           GET    /                  (authenticate)
        │   │                           POST   /                  (authenticate + validate)
        │   │                           GET    /:orgId            (authenticate + member+)
        │   │                           PATCH  /:orgId            (authenticate + admin+)
        │   │                           DELETE /:orgId            (authenticate + owner)
        │   │                           GET    /:orgId/members    (authenticate + member+)
        │   │                           PATCH  /:orgId/members/:uid (authenticate + admin+)
        │   │                           DELETE /:orgId/members/:uid (authenticate + admin+)
        │   │
        │   ├── boards/
        │   │   ├── board.validation.js  createBoard, updateBoard
        │   │   ├── board.service.js     create() — adds ObjectId-keyed columns.
        │   │   │                        listForOrg(), getById(), update() — replaces
        │   │   │                        columns preserving existing _ids. delete() —
        │   │   │                        cascades tasks, requires admin+.
        │   │   ├── board.controller.js
        │   │   └── board.routes.js
        │   │                           GET    /org/:orgId  (authenticate + member+)
        │   │                           POST   /org/:orgId  (authenticate + member+)
        │   │                           GET    /:boardId    (authenticate)
        │   │                           PATCH  /:boardId    (authenticate)
        │   │                           DELETE /:boardId    (authenticate)
        │   │
        │   ├── tasks/
        │   │   ├── task.validation.js  createTask, updateTask, moveTask
        │   │   ├── task.service.js     create() — appends to column end using
        │   │   │                       positionBetween. Emits task.created.
        │   │   │                       listForBoard() — sorted by column+position,
        │   │   │                       populates assignee + createdBy.
        │   │   │                       update() — emits task.updated. If assignee
        │   │   │                       changed emits task.assigned.
        │   │   │                       move() — updates column + position, emits
        │   │   │                       task.moved. Schedules due reminder job if
        │   │   │                       dueDate exists. delete() — emits task.deleted.
        │   │   ├── task.controller.js
        │   │   └── task.routes.js
        │   │                           GET    /board/:boardId  (authenticate)
        │   │                           POST   /board/:boardId  (authenticate + validate)
        │   │                           GET    /:taskId         (authenticate)
        │   │                           PATCH  /:taskId         (authenticate + validate)
        │   │                           PATCH  /:taskId/move    (authenticate + validate)
        │   │                           DELETE /:taskId         (authenticate)
        │   │
        │   ├── invites/
        │   │   ├── invite.validation.js  createInvite, acceptInvite
        │   │   ├── invite.service.js     create() — revokes existing pending invite,
        │   │   │                         creates new with hashed token, emits
        │   │   │                         invite.created (triggers email job).
        │   │   │                         accept() — validates token, creates Membership,
        │   │   │                         marks invite accepted, emits invite.accepted.
        │   │   │                         listForOrg() — pending only.
        │   │   │                         revoke() — deletes invite document.
        │   │   ├── invite.controller.js
        │   │   └── invite.routes.js
        │   │                           GET    /org/:orgId       (authenticate + admin+)
        │   │                           POST   /org/:orgId       (authenticate + admin+)
        │   │                           DELETE /org/:orgId/:id   (authenticate + admin+)
        │   │                           POST   /accept           (authenticate + validate)
        │   │
        │   ├── activity/
        │   │   ├── activity.service.js  log(orgId, actorId, action, meta, boardId)
        │   │   │                        — fire-and-forget, never blocks.
        │   │   │                        listForOrg(orgId, query) — paginated.
        │   │   │                        registerListeners() — subscribes to ALL
        │   │   │                        eventBus events and calls log(). Called once
        │   │   │                        at startup from app.js.
        │   │   ├── activity.controller.js
        │   │   └── activity.routes.js
        │   │                           GET /org/:orgId  (authenticate + member+)
        │   │                           Supports ?page, ?limit, ?boardId filters.
        │   │
        │   ├── email/
        │   │   ├── email.service.js    Nodemailer transporter factory (SMTP config
        │   │   │                       from env). renderTemplate(name, context) —
        │   │   │                       compiles Handlebars template from templates/
        │   │   │                       directory, renders HTML string + plain text.
        │   │   │                       send({ to, subject, template, context }) —
        │   │   │                       calls renderTemplate then transporter.sendMail.
        │   │   │                       Logs success/failure. Never throws — errors
        │   │   │                       are caught and logged (email must not break API).
        │   │   │
        │   │   ├── email.queue.js      Creates BullMQ Queue('email', { connection }).
        │   │   │                       Exports typed addJob helpers: addWelcomeJob,
        │   │   │                       addVerifyEmailJob, addPasswordResetJob,
        │   │   │                       addPasswordResetSuccessJob, addTeamInviteJob,
        │   │   │                       addInviteAcceptedJob, addMemberRemovedJob,
        │   │   │                       addRoleChangedJob, addTaskAssignedJob,
        │   │   │                       addTaskDueReminderJob (with delay option),
        │   │   │                       addWeeklyDigestJob, addSecurityAlertJob,
        │   │   │                       addAccountDeletedJob.
        │   │   │                       Job config: attempts: 3, backoff exponential.
        │   │   │
        │   │   ├── email.worker.js     BullMQ Worker('email'). Switch on job.name,
        │   │   │                       calls email.service.send() with correct
        │   │   │                       template name and context. Logs result.
        │   │   │
        │   │   ├── email.module.js     Registers eventBus listeners and bridges
        │   │   │                       them to emailQueue.addJob calls. This is
        │   │   │                       the ONLY file that knows about both eventBus
        │   │   │                       and the email queue. Called once at startup.
        │   │   │                       Events handled:
        │   │   │                         auth.registered   -> addWelcomeJob
        │   │   │                                           -> addVerifyEmailJob
        │   │   │                         auth.login        -> addSecurityAlertJob (new device)
        │   │   │                         auth.forgotPassword -> addPasswordResetJob
        │   │   │                         auth.passwordReset  -> addPasswordResetSuccessJob
        │   │   │                         invite.created    -> addTeamInviteJob
        │   │   │                         invite.accepted   -> addInviteAcceptedJob
        │   │   │                         member.removed    -> addMemberRemovedJob
        │   │   │                         member.roleChanged-> addRoleChangedJob
        │   │   │                         task.assigned     -> addTaskAssignedJob
        │   │   │                         task.dueSoon      -> addTaskDueReminderJob
        │   │   │                         user.deleted      -> addAccountDeletedJob
        │   │   │
        │   │   └── templates/
        │   │       ├── layouts/
        │   │       │   └── base.hbs    Shared wrapper. Contains: Team Workspace
        │   │       │                   logo + wordmark in indigo (#4f46e5), 600px
        │   │       │                   max-width table layout, inline CSS for email
        │   │       │                   client compatibility, footer with support
        │   │       │                   link + unsubscribe note + copyright, dark
        │   │       │                   mode via @media prefers-color-scheme, body
        │   │       │                   block where child templates inject content.
        │   │       │
        │   │       ├── welcome.hbs               Subject: Welcome to Team Workspace, {{name}}!
        │   │       ├── verify-email.hbs          Subject: Please verify your email address
        │   │       ├── password-reset.hbs         Subject: Reset your Team Workspace password
        │   │       ├── password-reset-success.hbs Subject: Your password has been changed
        │   │       ├── team-invite.hbs            Subject: {{inviterName}} invited you to {{orgName}}
        │   │       ├── invite-accepted.hbs        Subject: {{newMemberName}} joined {{orgName}}
        │   │       ├── member-removed.hbs         Subject: You've been removed from {{orgName}}
        │   │       ├── role-changed.hbs           Subject: Your role in {{orgName}} has been updated
        │   │       ├── task-assigned.hbs          Subject: {{assignerName}} assigned you a task
        │   │       ├── task-due-reminder.hbs      Subject: Reminder: "{{taskTitle}}" is due tomorrow
        │   │       ├── weekly-digest.hbs          Subject: Your weekly summary for {{orgName}}
        │   │       ├── security-alert.hbs         Subject: New sign-in to your account
        │   │       └── account-deleted.hbs        Subject: Your Team Workspace account has been deleted
        │   │
        │   └── realtime/
        │       ├── socket.js           createSocketServer(httpServer). Attaches
        │       │                       Socket.io with CORS from env. Registers
        │       │                       socketAuth middleware. Calls board.handler
        │       │                       and presence.handler on connection.
        │       │
        │       ├── socketAuth.js       Socket.io middleware. Reads token from
        │       │                       socket.handshake.auth.token. Calls
        │       │                       verifyAccessToken(). Attaches socket.data.user.
        │       │                       Disconnects on invalid/missing token.
        │       │
        │       └── handlers/
        │           ├── board.handler.js  Handles board:join — verifies membership
        │           │                     then socket.join('board:{id}'). Handles
        │           │                     board:leave — socket.leave(). Bridges ALL
        │           │                     task/board eventBus events to room broadcasts:
        │           │                       task.created  -> emit task:created
        │           │                       task.updated  -> emit task:updated
        │           │                       task.moved    -> emit task:moved
        │           │                       task.deleted  -> emit task:deleted
        │           │                       board.updated -> emit board:updated
        │           │
        │           └── presence.handler.js  Tracks who is viewing which board.
        │                                 On join: adds user to Redis set 'presence:{boardId}'.
        │                                 Broadcasts presence:join to room.
        │                                 On disconnect: removes from all sets.
        │                                 Broadcasts presence:leave.
        │
        ├── jobs/
        │   ├── index.js                Called from server.js. Imports and starts
        │   │                           email.worker and cleanup.worker. Logs worker
        │   │                           status. Handles worker errors globally.
        │   │
        │   ├── queues.js               Exports ALL BullMQ Queue instances so workers
        │   │                           and other modules import from one place:
        │   │                           emailQueue, cleanupQueue.
        │   │
        │   └── workers/
        │       ├── email.worker.js     BullMQ Worker on 'email' queue. Processes
        │       │                       each named job type by calling email.service.send
        │       │                       with the appropriate template + context.
        │       │
        │       └── cleanup.worker.js   BullMQ Worker on 'cleanup' queue.
        │                               Repeating job every 6 hours: deletes expired
        │                               RefreshToken documents.
        │                               Repeating job every 24 hours: deletes expired
        │                               and accepted Invite documents.
        │                               Repeating job every Monday 8am UTC: fetches
        │                               all active org memberships, compiles weekly
        │                               stats, queues addWeeklyDigestJob per member.
        │
        └── routes/
            └── index.js                Express Router. Mounts all module routers:
                                        /auth         <- auth.routes.js
                                        /users        <- user.routes.js
                                        /organizations<- organization.routes.js
                                        /boards       <- board.routes.js
                                        /tasks        <- task.routes.js
                                        /invites      <- invite.routes.js
                                        /activity     <- activity.routes.js

    tests/
    ├── setup.js                        MongoMemoryServer. beforeAll: connect.
    │                                   afterAll: disconnect + stop server.
    │                                   beforeEach: wipe all collections.
    │
    ├── helpers/
    │   ├── factories.js                createUser(overrides), createOrg(ownerId),
    │   │                               addMember(orgId, userId, role),
    │   │                               createBoard(orgId, userId),
    │   │                               createTask(boardId, columnId, userId).
    │   │
    │   └── request.js                  Supertest wrapper around app. authHeader(user)
    │                                   — returns { Authorization: 'Bearer <token>' }.
    │
    └── modules/
        ├── auth.test.js                register, login, refresh, logout, forgot-password,
        │                               reset-password, verify-email flows.
        ├── organization.test.js        create, list, get, update, delete, member management.
        ├── board.test.js               create, list, get, update, delete, access control.
        ├── task.test.js                create, list, update, move, delete, assignment.
        └── invite.test.js              create, accept, list, revoke, expiry.

    scripts/
    └── seed.js                         Creates demo user, org, board with 3 columns
                                        and 5 tasks. Logs credentials to console.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 4 — CLIENT FILE TREE (55 files)

    client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    │
    └── src/
        ├── main.jsx                    React root. Wraps App in QueryClientProvider.
        ├── App.jsx                     Router. Auth initialiser (calls /auth/refresh
        │                               on load for silent session restore). Full route tree.
        ├── index.css                   Tailwind directives. Base font, scroll behaviour.
        │
        ├── api/
        │   ├── client.js               Axios instance (baseURL = VITE_API_URL).
        │   │                           Request interceptor: injects access token.
        │   │                           Response interceptor: on 401, calls /auth/refresh,
        │   │                           retries original request. Queue concurrent
        │   │                           requests during refresh. On refresh failure:
        │   │                           clears auth, dispatches auth:expired event.
        │   │
        │   ├── auth.api.js             register, login, refresh, logout, logoutAll,
        │   │                           getMe, forgotPassword, resetPassword,
        │   │                           verifyEmail, resendVerification.
        │   │
        │   ├── organization.api.js     list, create, getById, update, remove,
        │   │                           listMembers, updateMemberRole, removeMember.
        │   │
        │   ├── board.api.js            listByOrg, create, getById, update, remove.
        │   │
        │   ├── task.api.js             listByBoard, create, getById, update,
        │   │                           move, remove.
        │   │
        │   ├── invite.api.js           listByOrg, create, accept, revoke.
        │   │
        │   └── activity.api.js         listByOrg(orgId, params).
        │
        ├── lib/
        │   ├── queryClient.js          TanStack Query client. staleTime: 60s.
        │   │                           Retry: never on 401/403. gcTime: 5 min.
        │   │
        │   └── socket.js              Socket.io singleton. getSocket() — lazy init.
        │                               connectSocket() / disconnectSocket().
        │                               reauthSocket() — reconnects after token refresh.
        │                               Listens for auth:expired and disconnects.
        │
        ├── store/
        │   ├── authStore.js            Zustand. State: user, isInitialised.
        │   │                           Actions: setAuth(user, token), clearAuth(),
        │   │                           setInitialised(). setAuth calls setAccessToken
        │   │                           on api/client.js and connectSocket.
        │   │                           clearAuth clears token, disconnects socket,
        │   │                           clears Query cache.
        │   │
        │   └── uiStore.js              Zustand. State: activeOrgId, sidebarOpen,
        │                               modalStack. Actions: setActiveOrg, toggleSidebar,
        │                               openModal, closeModal, isModalOpen.
        │
        ├── utils/
        │   ├── position.js             positionBetween(before, after) — mirrors server.
        │   ├── date.js                 formatRelative(date), formatDate(date, fmt).
        │   └── cn.js                   clsx + tailwind-merge helper for className merging.
        │
        ├── hooks/
        │   ├── useDebounce.js          useDebounce(value, delay) — returns debounced value.
        │   └── useClickOutside.js      useClickOutside(ref, handler) — detects outside clicks.
        │
        ├── components/
        │   │
        │   ├── ui/                     Dumb, stateless, reusable primitives.
        │   │   ├── Button.jsx          Variants: primary, secondary, ghost, danger.
        │   │   │                       Sizes: sm, md, lg. Loading spinner state.
        │   │   ├── Input.jsx           Label, error message, helper text, icon slots.
        │   │   ├── Modal.jsx           Portal-based. Trap focus. ESC to close. Backdrop.
        │   │   ├── Avatar.jsx          Shows image or initials fallback. Sizes: sm/md/lg.
        │   │   ├── Badge.jsx           Role/status badges. Colour variants.
        │   │   ├── Spinner.jsx         Accessible loading indicator. Size prop.
        │   │   ├── Skeleton.jsx        Loading placeholder. Width/height props.
        │   │   └── ConfirmDialog.jsx   Modal with confirm/cancel. Title, message, danger flag.
        │   │
        │   ├── layout/
        │   │   ├── AppLayout.jsx       Fixed sidebar + scrollable main content area.
        │   │   │                       Responsive: sidebar collapses on mobile.
        │   │   ├── Sidebar.jsx         OrgSwitcher at top. Board list for active org.
        │   │   │                       Links: Members, Invites (admin+), Activity, Settings.
        │   │   │                       User avatar + name + logout at bottom.
        │   │   └── Header.jsx          Page title. Action buttons slot. Breadcrumb.
        │   │
        │   └── shared/
        │       ├── ErrorBoundary.jsx   Catches render errors. Shows fallback UI with retry.
        │       ├── ProtectedRoute.jsx  Redirects to /login if no user. Redirects to
        │       │                       /verify-email if emailVerified is false.
        │       └── EmptyState.jsx      Icon + title + description + optional CTA button.
        │
        └── features/
            │
            ├── auth/
            │   ├── LoginPage.jsx           Email + password form. Link to register +
            │   │                           forgot password.
            │   ├── RegisterPage.jsx        Name + email + password. Redirects to
            │   │                           verify-email notice after success.
            │   ├── ForgotPasswordPage.jsx  Email input. Shows success message after submit
            │   │                           (never reveals if email exists).
            │   ├── ResetPasswordPage.jsx   Reads ?token from URL. New password form.
            │   │                           Redirects to login on success.
            │   ├── VerifyEmailPage.jsx     Reads ?token from URL. Auto-submits. Shows
            │   │                           success or error. Resend link if expired.
            │   └── useAuth.js             useLogin, useRegister, useLogout mutations.
            │                              useMe query. useForgotPassword, useResetPassword,
            │                              useVerifyEmail, useResendVerification mutations.
            │
            ├── organizations/
            │   ├── OrgDashboard.jsx        Overview: member count, board count, recent
            │   │                           activity feed, quick-create board button.
            │   ├── MembersPage.jsx         Searchable member list. Role badges. Change
            │   │                           role dropdown (admin+). Remove button (admin+).
            │   ├── InvitesPage.jsx         Pending invite list. Revoke button. Invite
            │   │                           member button opens InviteModal.
            │   ├── components/
            │   │   ├── OrgSwitcher.jsx     Dropdown showing all orgs with role badge.
            │   │   │                       Create new org link. Sets activeOrgId in store.
            │   │   ├── CreateOrgModal.jsx  Name + slug fields. Slug auto-generated from
            │   │   │                       name, editable. Validates uniqueness on blur.
            │   │   ├── MemberCard.jsx      Avatar + name + email + role badge + actions.
            │   │   └── InviteModal.jsx     Email + role select. Submit sends invite.
            │   └── hooks/
            │       ├── useOrganizations.js useOrganizations (query), useCreateOrg,
            │       │                       useUpdateOrg, useDeleteOrg mutations.
            │       └── useMembers.js       useMembers (query), useUpdateRole,
            │                               useRemoveMember mutations.
            │
            ├── boards/
            │   ├── BoardsListPage.jsx      Grid of BoardCard components. Empty state
            │   │                           with create button. Create board button in header.
            │   ├── BoardPage.jsx           DnD context wrapping all columns.
            │   │                           Optimistic task move mutation.
            │   │                           Drag overlay (floating card under cursor).
            │   │                           useBoardSocket keeps live with socket events.
            │   │                           Inline add-task form per column.
            │   ├── components/
            │   │   ├── BoardCard.jsx       Board name + description + column count.
            │   │   │                       Hover actions: open, archive.
            │   │   ├── BoardColumn.jsx     useDroppable zone. SortableContext for tasks.
            │   │   │                       Column header with name + task count + add button.
            │   │   │                       Highlights on drag-over.
            │   │   ├── TaskCard.jsx        useSortable. Shows title, assignee avatar,
            │   │   │                       due date badge, label chips. Ghost when dragging.
            │   │   │                       Click opens TaskDetailModal.
            │   │   ├── CreateBoardModal.jsx Name, description, column name list
            │   │   │                       (add/remove/reorder columns).
            │   │   └── TaskDetailModal.jsx  Full task view: title (editable), description
            │   │                           (editable), assignee picker, due date, labels,
            │   │                           created by, delete button.
            │   └── hooks/
            │       ├── useBoards.js        useBoards(orgId), useBoard(boardId),
            │       │                       useCreateBoard, useUpdateBoard, useDeleteBoard.
            │       ├── useTasks.js         useTasks(boardId), useCreateTask,
            │       │                       useUpdateTask, useMoveTask (optimistic),
            │       │                       useDeleteTask.
            │       └── useBoardSocket.js   Joins board:{boardId} room on mount.
            │                               Bridges socket events -> setQueryData on
            │                               ['tasks', boardId] cache key. Leaves on unmount.
            │                               Handles: task:created, task:updated,
            │                               task:moved, task:deleted, board:updated.
            │
            ├── activity/
            │   ├── ActivityFeed.jsx        Infinite scroll list of activity items.
            │   │                           Each item: actor avatar, action text,
            │   │                           relative timestamp. Board filter dropdown.
            │   └── useActivity.js          useInfiniteQuery on /activity/org/:orgId.
            │
            └── invites/
                └── InviteAcceptPage.jsx    Reads ?token from URL. Shows invite details.
                                            Accept button calls /invites/accept.
                                            Redirects to org dashboard on success.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 5 — API CONTRACTS

All responses:
  Success:  { success: true, data: { ... }, meta?: { ... } }
  Failure:  { success: false, error: { code: string, message: string, details?: [] } }

HTTP status codes used:
  200 OK, 201 Created, 204 No Content
  400 Bad Request, 401 Unauthorized, 403 Forbidden
  404 Not Found, 409 Conflict, 422 Unprocessable Entity
  429 Too Many Requests, 500 Internal Server Error

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 6 — AUTH FLOWS

  Register
  --------
  1. Validate body (name, email, password strength)
  2. Check email not taken -> 409 if taken
  3. Hash password (bcrypt cost 12)
  4. Create User (emailVerified: false)
  5. Generate emailVerificationToken (raw hex) -> hash and store in DB
  6. Create RefreshToken document, issue JWT pair
  7. Set refresh_token httpOnly cookie (7d, secure in prod)
  8. Emit auth.registered -> email.module queues welcome + verify-email jobs
  9. Return { user, accessToken, expiresIn }

  Login
  -----
  1. Validate body (email, password)
  2. Find user by email (select +passwordHash) -> 401 if not found
  3. comparePassword -> 401 if wrong
  4. Check isActive -> 403 if deactivated
  5. Compare req.ip + userAgent against last RefreshToken -> emit auth.login
     (email.module queues security-alert job if new device detected)
  6. Create RefreshToken, issue JWT pair, set cookie
  7. Return { user, accessToken, expiresIn }

  Silent Refresh (client-side on page load + 401 retry)
  ------
  1. POST /auth/refresh with refresh_token cookie
  2. Decode JWT to get jti, verify signature
  3. Find RefreshToken by jti -> 401 if not found (rotated/revoked)
  4. Delete old RefreshToken document (rotation)
  5. Create new RefreshToken, issue new JWT pair, set new cookie
  6. Return { user, accessToken, expiresIn }

  Forgot Password
  ---------------
  1. Find user by email (silent: return 200 even if not found)
  2. Generate raw token -> hash -> store in DB with 1h expiry
  3. Emit auth.forgotPassword -> email.module queues password-reset job
  4. Return 200 { message: 'If that email exists, a reset link has been sent' }

  Reset Password
  --------------
  1. Validate body (token, newPassword)
  2. Hash incoming token, find user where passwordResetToken matches and
     passwordResetExpires > now -> 400 if not found/expired
  3. Hash new password, update user
  4. Clear passwordResetToken + passwordResetExpires
  5. Delete ALL RefreshToken documents for this user (revoke all sessions)
  6. Emit auth.passwordReset -> email.module queues password-reset-success job
  7. Return 200 { message: 'Password reset successful' }

  Verify Email
  ------------
  1. Validate body (token)
  2. Hash token, find user where matches and not expired -> 400 if invalid
  3. Set emailVerified: true, clear token fields
  4. Return 200 { message: 'Email verified' }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 7 — ROLE SYSTEM

  Role ranks: member (0) < admin (1) < owner (2)

  Enforced server-side via authorize(minRole) middleware on every request.
  Client-side role checks are display-only — they never replace server checks.

  owner:  all capabilities
  admin:  everything except delete org and touch the owner's record
  member: read boards/tasks, create/edit/move tasks only

  Full matrix:
  Capability                    | owner | admin | member
  ------------------------------|-------|-------|-------
  View boards and tasks         |  YES  |  YES  |  YES
  Create tasks                  |  YES  |  YES  |  YES
  Edit own tasks                |  YES  |  YES  |  YES
  Move any task                 |  YES  |  YES  |  YES
  Delete any task               |  YES  |  YES  |  YES
  Create boards                 |  YES  |  YES  |   NO
  Edit board / columns          |  YES  |  YES  |   NO
  Delete boards                 |  YES  |  YES  |   NO
  Invite members                |  YES  |  YES  |   NO
  Revoke invites                |  YES  |  YES  |   NO
  Change member roles           |  YES  |  YES* |   NO
  Remove members                |  YES  |  YES* |   NO
  Update org settings           |  YES  |  YES  |   NO
  Delete organization           |  YES  |   NO  |   NO

  * Admin cannot promote to admin or touch the owner.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 8 — REAL-TIME DESIGN

  Connection
    Client: io(SOCKET_URL, { auth: { token: accessToken } })
    Server: socketAuth.js verifies JWT before socket connects.
            Attaches socket.data.user = { id, email }.
            Disconnects on invalid token with error event.

  Rooms
    One room per board: 'board:{boardId}'
    Joined on board:join event (after membership verified).
    Left on board:leave event or socket disconnect.

  Event flow for task move
    1. User drags card -> optimistic cache update in React
    2. Client: PATCH /tasks/:id/move (REST)
    3. server: task.service.move() -> saves to MongoDB
    4. task.service emits task.moved on eventBus
    5. board.handler picks up event -> io.to('board:{id}').emit('task:moved', payload)
    6. All clients in room update their Query cache (idempotent)

  Server -> Client events
    task:created   { task }
    task:updated   { taskId, changes }
    task:moved     { taskId, column, position, movedBy }
    task:deleted   { taskId }
    board:updated  { boardId, changes }
    presence:join  { userId, name }
    presence:leave { userId }

  Services never import socket.io.
  Socket never writes to MongoDB.
  They communicate only through eventBus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 9 — EMAIL SYSTEM

  Architecture
    Service emits event on eventBus
    -> email.module.js listener catches it
    -> Adds job to BullMQ emailQueue (persisted in Redis)
    -> email.worker.js processes job (retries: 3, backoff: exponential)
    -> email.service.js renders Handlebars template -> HTML + plain text
    -> Nodemailer transports via SMTP
    -> Job marked complete or failed

  All 13 templates (each extends layouts/base.hbs)
    Template                   | Trigger event              | Subject
    ---------------------------|----------------------------|------------------------------------------
    welcome.hbs                | auth.registered            | Welcome to Team Workspace, {{name}}!
    verify-email.hbs           | auth.registered            | Please verify your email address
    password-reset.hbs         | auth.forgotPassword        | Reset your Team Workspace password
    password-reset-success.hbs | auth.passwordReset         | Your password has been changed
    team-invite.hbs            | invite.created             | {{inviterName}} invited you to {{orgName}}
    invite-accepted.hbs        | invite.accepted            | {{newMemberName}} joined {{orgName}}
    member-removed.hbs         | member.removed             | You've been removed from {{orgName}}
    role-changed.hbs           | member.roleChanged         | Your role in {{orgName}} has been updated
    task-assigned.hbs          | task.assigned              | {{assignerName}} assigned you a task
    task-due-reminder.hbs      | BullMQ delayed job -24h    | Reminder: "{{taskTitle}}" is due tomorrow
    weekly-digest.hbs          | BullMQ repeating Mon 8am   | Your weekly summary for {{orgName}}
    security-alert.hbs         | auth.login (new device)    | New sign-in to your account
    account-deleted.hbs        | user.deleted               | Your account has been deleted

  base.hbs provides
    Team Workspace logo + wordmark, indigo #4f46e5 brand colour
    600px max-width, table-based layout (Gmail/Outlook/Apple Mail compatible)
    All CSS inlined (required by email clients)
    Responsive single-column on mobile
    Dark mode via @media (prefers-color-scheme: dark)
    Footer: support email, unsubscribe note, copyright year
    Plain-text fallback auto-generated by Nodemailer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SECTION 10 — BUILD ORDER

  Phase 1   Foundation
            server.js, app.js
            src/config/env.js
            src/config/database.js
            src/config/redis.js
            src/shared/utils/AppError.js
            src/shared/utils/asyncHandler.js
            src/shared/utils/apiResponse.js
            src/shared/utils/logger.js
            src/shared/utils/jwt.js
            src/shared/utils/bcrypt.js
            src/shared/utils/crypto.js
            src/shared/utils/pagination.js
            src/shared/events/eventBus.js

  Phase 2   Models (8 files)
            User.model.js, RefreshToken.model.js, Organization.model.js,
            Membership.model.js, Board.model.js, Task.model.js,
            Invite.model.js, ActivityLog.model.js

  Phase 3   Middleware (7 files)
            authenticate.js, authorize.js, validate.js, rateLimiter.js,
            requestLogger.js, notFound.js, errorHandler.js

  Phase 4   Routes registry
            src/routes/index.js

  Phase 5   Auth module
            auth.validation.js -> auth.service.js -> auth.controller.js -> auth.routes.js

  Phase 6   Email module (13 templates + 4 js files)
            email.service.js -> email.queue.js -> email.worker.js -> email.module.js
            templates/layouts/base.hbs
            templates/welcome.hbs
            templates/verify-email.hbs
            templates/password-reset.hbs
            templates/password-reset-success.hbs
            templates/team-invite.hbs
            templates/invite-accepted.hbs
            templates/member-removed.hbs
            templates/role-changed.hbs
            templates/task-assigned.hbs
            templates/task-due-reminder.hbs
            templates/weekly-digest.hbs
            templates/security-alert.hbs
            templates/account-deleted.hbs

  Phase 7   Remaining server modules
            users: validation -> service -> controller -> routes
            organizations: validation -> service -> controller -> routes
            boards: validation -> service -> controller -> routes
            tasks: validation -> service -> controller -> routes
            invites: validation -> service -> controller -> routes
            activity: service (+ registerListeners) -> controller -> routes
            realtime: socketAuth.js -> handlers/board.handler.js
                      -> handlers/presence.handler.js -> socket.js

  Phase 8   Jobs
            src/jobs/queues.js
            src/jobs/workers/email.worker.js
            src/jobs/workers/cleanup.worker.js
            src/jobs/index.js

  Phase 9   Tests
            tests/setup.js
            tests/helpers/factories.js
            tests/helpers/request.js
            tests/modules/auth.test.js
            tests/modules/organization.test.js
            tests/modules/board.test.js
            tests/modules/task.test.js
            tests/modules/invite.test.js

  Phase 10  DevOps
            Dockerfile
            ecosystem.config.js (PM2)
            scripts/seed.js

  Phase 11  Client foundation
            package.json, vite.config.js, tailwind.config.js,
            postcss.config.js, index.html
            src/api/client.js
            src/api/auth.api.js
            src/api/organization.api.js
            src/api/board.api.js
            src/api/task.api.js
            src/api/invite.api.js
            src/api/activity.api.js
            src/lib/queryClient.js
            src/lib/socket.js
            src/store/authStore.js
            src/store/uiStore.js
            src/utils/position.js
            src/utils/date.js
            src/utils/cn.js
            src/hooks/useDebounce.js
            src/hooks/useClickOutside.js

  Phase 12  Client UI components
            components/ui/Button.jsx
            components/ui/Input.jsx
            components/ui/Modal.jsx
            components/ui/Avatar.jsx
            components/ui/Badge.jsx
            components/ui/Spinner.jsx
            components/ui/Skeleton.jsx
            components/ui/ConfirmDialog.jsx
            components/layout/AppLayout.jsx
            components/layout/Sidebar.jsx
            components/layout/Header.jsx
            components/shared/ErrorBoundary.jsx
            components/shared/ProtectedRoute.jsx
            components/shared/EmptyState.jsx

  Phase 13  Client features
            features/auth/LoginPage.jsx
            features/auth/RegisterPage.jsx
            features/auth/ForgotPasswordPage.jsx
            features/auth/ResetPasswordPage.jsx
            features/auth/VerifyEmailPage.jsx
            features/auth/useAuth.js
            features/organizations/OrgDashboard.jsx
            features/organizations/MembersPage.jsx
            features/organizations/InvitesPage.jsx
            features/organizations/components/OrgSwitcher.jsx
            features/organizations/components/CreateOrgModal.jsx
            features/organizations/components/MemberCard.jsx
            features/organizations/components/InviteModal.jsx
            features/organizations/hooks/useOrganizations.js
            features/organizations/hooks/useMembers.js
            features/boards/BoardsListPage.jsx
            features/boards/BoardPage.jsx
            features/boards/components/BoardCard.jsx
            features/boards/components/BoardColumn.jsx
            features/boards/components/TaskCard.jsx
            features/boards/components/CreateBoardModal.jsx
            features/boards/components/TaskDetailModal.jsx
            features/boards/hooks/useBoards.js
            features/boards/hooks/useTasks.js
            features/boards/hooks/useBoardSocket.js
            features/activity/ActivityFeed.jsx
            features/activity/useActivity.js
            features/invites/InviteAcceptPage.jsx
            src/App.jsx
            src/main.jsx
            src/index.css

  Phase 14  Documentation
            README.md
            CONTRIBUTING.md
            docs/api.md
            docs/email-setup.md
            .github/workflows/ci.yml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL: 138 files across 14 build phases.

Do you approve this plan? Once approved, Phase 1 begins immediately.
Every file gets its own creation. One file, one responsibility.
No combining. No stubs. No placeholder TODOs in core logic.
