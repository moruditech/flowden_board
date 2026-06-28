'use strict';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set test environment before anything else loads env.js
process.env.NODE_ENV           = 'test';
process.env.JWT_ACCESS_SECRET  = 'test-access-secret-must-be-32-chars-long!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-32-chars-long';
process.env.CLIENT_URL         = 'http://localhost:5173';
process.env.SMTP_USER          = '';  // prevents nodemailer from trying to send
process.env.REDIS_HOST         = '127.0.0.1';
process.env.REDIS_PORT         = '6379';

let mongod;

// ── Global hooks ──────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  // Wipe all collections before each test for full isolation
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
});
