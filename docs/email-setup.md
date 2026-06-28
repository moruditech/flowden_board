# Email Setup

Team Workspace sends 13 transactional emails via Nodemailer through any SMTP provider.
All sending is async via BullMQ — email failures never block API responses.

---

## Development (Mailtrap)

Mailtrap catches all outgoing emails in a sandbox inbox — nothing reaches real recipients.

1. Create a free account at [mailtrap.io](https://mailtrap.io)
2. Go to **Email Testing → Inboxes → SMTP Settings**
3. Copy the credentials into `server/.env`:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
EMAIL_FROM=noreply@teamworkspace.dev
EMAIL_FROM_NAME=Team Workspace
```

---

## Production

### Option A — Resend (recommended)

1. Create account at [resend.com](https://resend.com)
2. Verify your domain (follow their DNS guide)
3. Generate an API key
4. Resend provides SMTP credentials — use them in `.env`

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### Option B — SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Option C — AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_access_key
SMTP_PASS=your_ses_secret_key
EMAIL_FROM=noreply@yourdomain.com
```

---

## Templates

All 13 templates live in `server/src/modules/email/templates/`.
Shared header and footer are in `templates/partials/`.

| Template | Trigger |
|---|---|
| `welcome.hbs` | User registers |
| `verify-email.hbs` | After registration |
| `password-reset.hbs` | POST /auth/forgot-password |
| `password-reset-success.hbs` | Password successfully changed |
| `team-invite.hbs` | Admin invites a member |
| `invite-accepted.hbs` | Invitee accepts invite |
| `member-removed.hbs` | Admin removes a member |
| `role-changed.hbs` | Admin changes a member's role |
| `task-assigned.hbs` | Task assignee is set or changed |
| `task-due-reminder.hbs` | 24h before task due date (BullMQ delayed job) |
| `weekly-digest.hbs` | Every Monday 8am UTC (BullMQ repeating job) |
| `security-alert.hbs` | Login from a new device or IP |
| `account-deleted.hbs` | User deletes their account |

---

## Customising templates

Templates use [Handlebars](https://handlebarsjs.com/) syntax.
Variables available in every template (injected by `email.service.js`):

| Variable | Value |
|---|---|
| `{{appName}}` | "Team Workspace" |
| `{{appUrl}}` | `CLIENT_URL` env var |
| `{{supportUrl}}` | `CLIENT_URL/support` |
| `{{year}}` | Current year |

Template-specific variables are documented at the top of each `.hbs` file.

To change the brand colour, update `--brand` in `templates/partials/header.hbs`.

---

## Job queue monitoring

BullMQ jobs can be monitored with [Bull Board](https://github.com/felixmosh/bull-board):

```bash
npm install @bull-board/express @bull-board/api
```

Then mount the dashboard in `app.js` (behind auth in production):

```js
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter }   = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter }  = require('@bull-board/express');
const { getEmailQueue }   = require('./src/modules/email/email.queue');

const serverAdapter = new ExpressAdapter();
createBullBoard({ queues: [new BullMQAdapter(getEmailQueue())], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());
```
