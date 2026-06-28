'use strict';

const { api, authHeader }    = require('../helpers/request');
const { createUser, DEFAULT_PASSWORD } = require('../helpers/factories');
const RefreshToken = require('../../src/shared/models/RefreshToken.model');
const User         = require('../../src/shared/models/User.model');

describe('Auth — POST /api/v1/auth/register', () => {
  it('201 — creates user and returns tokens', async () => {
    const res = await api.post('/api/v1/auth/register').send({
      name: 'Alice', email: 'alice@test.com', password: 'Password1!',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@test.com');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('422 — rejects weak password', async () => {
    const res = await api.post('/api/v1/auth/register').send({
      name: 'Bob', email: 'bob@test.com', password: 'weak',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('409 — rejects duplicate email', async () => {
    await createUser({ email: 'dup@test.com' });
    const res = await api.post('/api/v1/auth/register').send({
      name: 'Dup', email: 'dup@test.com', password: 'Password1!',
    });
    expect(res.status).toBe(409);
  });

  it('stores a hashed refresh token in the database', async () => {
    await api.post('/api/v1/auth/register').send({
      name: 'Carol', email: 'carol@test.com', password: 'Password1!',
    });
    const user    = await User.findOne({ email: 'carol@test.com' });
    const tokens  = await RefreshToken.find({ user: user._id });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('Auth — POST /api/v1/auth/login', () => {
  it('200 — valid credentials return tokens', async () => {
    const { user } = await createUser({ email: 'login@test.com' });
    const res = await api.post('/api/v1/auth/login').send({
      email: user.email, password: DEFAULT_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('401 — wrong password', async () => {
    const { user } = await createUser({ email: 'wrongpw@test.com' });
    const res = await api.post('/api/v1/auth/login').send({
      email: user.email, password: 'WrongPass1!',
    });
    expect(res.status).toBe(401);
  });

  it('401 — unknown email', async () => {
    const res = await api.post('/api/v1/auth/login').send({
      email: 'nobody@test.com', password: 'Password1!',
    });
    expect(res.status).toBe(401);
  });
});

describe('Auth — GET /api/v1/auth/me', () => {
  it('200 — returns current user', async () => {
    const { accessToken, user } = await createUser({ email: 'me@test.com' });
    const res = await api.get('/api/v1/auth/me').set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('401 — no token', async () => {
    const res = await api.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 — malformed token', async () => {
    const res = await api.get('/api/v1/auth/me').set({ Authorization: 'Bearer garbage' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — POST /api/v1/auth/refresh', () => {
  it('200 — returns new access token and rotates cookie', async () => {
    const loginRes = await api.post('/api/v1/auth/login').send({
      email: (await createUser({ email: 'refresh@test.com' })).user.email,
      password: DEFAULT_PASSWORD,
    });
    const cookie = loginRes.headers['set-cookie'];

    const res = await api.post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('401 — no cookie', async () => {
    const res = await api.post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('Auth — POST /api/v1/auth/forgot-password', () => {
  it('200 — always returns 200 regardless of email existence', async () => {
    const res = await api.post('/api/v1/auth/forgot-password').send({
      email: 'doesnotexist@test.com',
    });
    expect(res.status).toBe(200);
  });

  it('200 — sets reset token on user when email exists', async () => {
    const { user } = await createUser({ email: 'forgot@test.com' });
    await api.post('/api/v1/auth/forgot-password').send({ email: user.email });

    const updated = await User.findById(user._id);
    expect(updated.passwordResetToken).toBeTruthy();
    expect(updated.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('Auth — POST /api/v1/auth/logout', () => {
  it('200 — clears cookie and deletes refresh token', async () => {
    const { user } = await createUser({ email: 'logout@test.com' });
    const loginRes = await api.post('/api/v1/auth/login').send({
      email: user.email, password: DEFAULT_PASSWORD,
    });
    const cookie = loginRes.headers['set-cookie'];

    const res = await api.post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);

    const tokens = await RefreshToken.find({ user: user._id });
    expect(tokens).toHaveLength(0);
  });
});
