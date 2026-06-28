# API Reference

Base URL: `http://localhost:5000/api/v1`

All responses use the envelope format:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

---

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | — | Register. Sets refresh_token cookie |
| POST | /auth/login | — | Login. Sets refresh_token cookie |
| POST | /auth/refresh | cookie | Rotate refresh token |
| POST | /auth/logout | cookie | Clear session |
| POST | /auth/logout-all | JWT | Revoke all sessions |
| GET  | /auth/me | JWT | Current user |
| POST | /auth/forgot-password | — | Send reset email |
| POST | /auth/reset-password | — | Consume token, update password |
| POST | /auth/verify-email | — | Consume verification token |
| POST | /auth/resend-verification | JWT | Resend verification email |

**Register body:** `{ name, email, password }` (password: min 8, 1 uppercase, 1 number)

**Login body:** `{ email, password }`

---

## Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET    | /users | JWT | Get current user |
| PATCH  | /users | JWT | Update name / avatarUrl |
| PATCH  | /users/password | JWT | Change password |
| DELETE | /users | JWT | Delete account (soft) |

---

## Organizations

| Method | Path | Role | Description |
|---|---|---|---|
| GET    | /organizations | JWT | List user's orgs with role |
| POST   | /organizations | JWT | Create org (creator = owner) |
| GET    | /organizations/:orgId | member+ | Get org |
| PATCH  | /organizations/:orgId | admin+ | Update name/description |
| DELETE | /organizations/:orgId | owner | Delete org + cascade |
| GET    | /organizations/:orgId/members | member+ | List members |
| PATCH  | /organizations/:orgId/members/:userId | admin+ | Change role |
| DELETE | /organizations/:orgId/members/:userId | admin+ | Remove member |

---

## Boards

| Method | Path | Role | Description |
|---|---|---|---|
| GET    | /boards/org/:orgId | member+ | List boards |
| POST   | /boards/org/:orgId | member+ | Create board |
| GET    | /boards/:boardId | member+ | Get board with columns |
| PATCH  | /boards/:boardId | member+ | Update name/columns |
| DELETE | /boards/:boardId | admin+ | Delete board + tasks |

**Create board body:**
```json
{
  "name": "Sprint 1",
  "columns": [{ "name": "To Do" }, { "name": "In Progress" }, { "name": "Done" }]
}
```

---

## Tasks

| Method | Path | Role | Description |
|---|---|---|---|
| GET    | /tasks/board/:boardId | member+ | List tasks (populated) |
| POST   | /tasks/board/:boardId | member+ | Create task |
| GET    | /tasks/:taskId | member+ | Get task |
| PATCH  | /tasks/:taskId | member+ | Update task fields |
| PATCH  | /tasks/:taskId/move | member+ | Move task (column + position) |
| DELETE | /tasks/:taskId | member+ | Delete task |

**Create task body:** `{ title, columnId, description?, assigneeId?, dueDate?, labels? }`

**Move task body:** `{ columnId, position }` (use fractional indexing — `positionBetween(before, after)`)

---

## Invites

| Method | Path | Role | Description |
|---|---|---|---|
| GET    | /invites/org/:orgId | admin+ | List pending invites |
| POST   | /invites/org/:orgId | admin+ | Create invite (sends email) |
| DELETE | /invites/org/:orgId/:id | admin+ | Revoke invite |
| POST   | /invites/accept | JWT | Accept invite via token |

---

## Activity

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /activity/org/:orgId | member+ | Paginated activity log |

Query params: `?page=1&limit=25&boardId=<id>`

---

## Socket.io

Connect: `io(SERVER_URL, { auth: { token: accessToken } })`

**Client → Server**
| Event | Payload |
|---|---|
| `board:join` | `boardId` |
| `board:leave` | `boardId` |

**Server → Client**
| Event | Payload |
|---|---|
| `task:created` | `{ task }` |
| `task:updated` | `{ taskId, changes }` |
| `task:moved` | `{ taskId, column, position, movedBy }` |
| `task:deleted` | `{ taskId }` |
| `board:updated` | `{ boardId, board }` |
| `presence:join` | `{ userId, name }` |
| `presence:leave` | `{ userId }` |
| `presence:current` | `{ boardId, userIds }` |

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient role |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate (slug, email, membership) |
| VALIDATION_ERROR | 422 | Body failed Joi validation |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |
