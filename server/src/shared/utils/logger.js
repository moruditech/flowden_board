'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, printf, colorize, errors, json, splat } = format;

// ── Development format ────────────────────────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return stack
      ? `${timestamp} [${level}]: ${message}\n${stack}${metaStr}`
      : `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// ── Production format ─────────────────────────────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json()
);

// ── Transports ────────────────────────────────────────────────────────────────
const productionTransports = [
  new transports.Console(),
  new transports.DailyRotateFile({
    filename:    'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level:       'error',
    maxFiles:    '14d',
    zippedArchive: true,
  }),
  new transports.DailyRotateFile({
    filename:    'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles:    '30d',
    zippedArchive: true,
  }),
];

const developmentTransports = [
  new transports.Console(),
];

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level:      isTest ? 'silent' : isProd ? 'warn' : 'debug',
  silent:     isTest,
  format:     isProd ? prodFormat : devFormat,
  transports: isProd ? productionTransports : developmentTransports,
  exitOnError: false,
});

module.exports = logger;
