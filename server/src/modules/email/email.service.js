'use strict';

const nodemailer   = require('nodemailer');
const hbs          = require('nodemailer-express-handlebars');
const path         = require('path');
const env          = require('../../config/env');
const logger       = require('../../shared/utils/logger');

// ── Transporter ───────────────────────────────────────────────────────────────

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  // Attach Handlebars engine
  transporter.use('compile', hbs({
    viewEngine: {
      extname:       '.hbs',
      partialsDir:   path.join(__dirname, 'templates', 'partials'),
      defaultLayout: false,
    },
    viewPath:   path.join(__dirname, 'templates'),
    extName:    '.hbs',
  }));

  return transporter;
}

// ── Send ──────────────────────────────────────────────────────────────────────

/**
 * Send a templated email.
 *
 * @param {object} options
 * @param {string}   options.to       - Recipient email address
 * @param {string}   options.subject  - Email subject line
 * @param {string}   options.template - Handlebars template name (without .hbs)
 * @param {object}   options.context  - Variables available inside the template
 */
async function sendEmail({ to, subject, template, context }) {
  // Skip sending in test environment — just log
  if (env.isTest()) {
    logger.debug(`[EMAIL:TEST] To: ${to} | Subject: ${subject} | Template: ${template}`);
    return;
  }

  // Warn and skip if SMTP is not configured (development without Mailtrap)
  if (!env.SMTP_USER) {
    logger.warn(`[EMAIL:SKIP] SMTP not configured. Would send "${subject}" to ${to}`);
    return;
  }

  try {
    const info = await getTransporter().sendMail({
      from:     `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to,
      subject,
      template,
      context: {
        ...context,
        appName:    'Team Workspace',
        appUrl:     env.CLIENT_URL,
        supportUrl: `${env.CLIENT_URL}/support`,
        year:       new Date().getFullYear(),
      },
    });

    logger.info(`[EMAIL:SENT] To: ${to} | Subject: ${subject} | MessageId: ${info.messageId}`);
  } catch (err) {
    // Email failures must NEVER crash the API — log and continue
    logger.error(`[EMAIL:FAIL] To: ${to} | Subject: ${subject} | Error: ${err.message}`);
  }
}

module.exports = { sendEmail };
