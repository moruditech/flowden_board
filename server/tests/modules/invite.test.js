'use strict';

const { api, authHeader }   = require('../helpers/request');
const { createUser, createOrg, addMember, createInvite } = require('../helpers/factories');
const Membership = require('../../src/shared/models/Membership.model');
const Invite     = require('../../src/shared/models/Invite.model');

describe('Invites — POST /api/v1/invites/org/:orgId', () => {
  it('201 — admin can invite a new user', async () => {
    const { user: owner, accessToken } = await createUser({ email: 'inv-owner@test.com' });
    const org = await createOrg(owner._id, { slug: 'inv-org-1' });

    const res = await api.post(`/api/v1/invites/org/${org._id}`)
      .set(authHeader(accessToken))
      .send({ email: 'newmember@test.com', role: 'member' });

    expect(res.status).toBe(201);
    expect(res.body.data.invite.email).toBe('newmember@test.com');
    expect(res.body.data.invite.role).toBe('member');
  });

  it('403 — member cannot invite', async () => {
    const { user: owner }               = await createUser({ email: 'inv-owner2@test.com' });
    const { user: member, accessToken } = await createUser({ email: 'inv-member@test.com' });
    const org = await createOrg(owner._id, { slug: 'inv-org-2' });
    await addMember(member._id, org._id, 'member');

    const res = await api.post(`/api/v1/invites/org/${org._id}`)
      .set(authHeader(accessToken))
      .send({ email: 'anyone@test.com', role: 'member' });

    expect(res.status).toBe(403);
  });

  it('409 — cannot invite existing member', async () => {
    const { user: owner, accessToken } = await createUser({ email: 'inv-dup-owner@test.com' });
    const { user: member }             = await createUser({ email: 'existing-member@test.com' });
    const org = await createOrg(owner._id, { slug: 'inv-org-3' });
    await addMember(member._id, org._id, 'member');

    const res = await api.post(`/api/v1/invites/org/${org._id}`)
      .set(authHeader(accessToken))
      .send({ email: member.email, role: 'member' });

    expect(res.status).toBe(409);
  });

  it('revokes previous pending invite for same email before creating new one', async () => {
    const { user: owner, accessToken } = await createUser({ email: 'inv-revoke@test.com' });
    const org = await createOrg(owner._id, { slug: 'inv-revoke-org' });

    await api.post(`/api/v1/invites/org/${org._id}`)
      .set(authHeader(accessToken))
      .send({ email: 'repeat@test.com', role: 'member' });

    await api.post(`/api/v1/invites/org/${org._id}`)
      .set(authHeader(accessToken))
      .send({ email: 'repeat@test.com', role: 'admin' });

    const invites = await Invite.find({ email: 'repeat@test.com', organization: org._id });
    expect(invites).toHaveLength(1);
    expect(invites[0].role).toBe('admin');
  });
});

describe('Invites — POST /api/v1/invites/accept', () => {
  it('200 — creates membership for the invited user', async () => {
    const { user: owner }               = await createUser({ email: 'accept-owner@test.com' });
    const { user: newUser, accessToken } = await createUser({ email: 'accept-user@test.com' });
    const org = await createOrg(owner._id, { slug: 'accept-org' });

    const { rawToken } = await createInvite(org._id, owner._id, newUser.email, 'member');

    const res = await api.post('/api/v1/invites/accept')
      .set(authHeader(accessToken))
      .send({ token: rawToken });

    expect(res.status).toBe(200);

    const m = await Membership.findOne({ user: newUser._id, organization: org._id });
    expect(m).not.toBeNull();
    expect(m.role).toBe('member');
  });

  it('403 — wrong email cannot accept invite', async () => {
    const { user: owner }              = await createUser({ email: 'wrong-owner@test.com' });
    const { user: other, accessToken } = await createUser({ email: 'wrong-user@test.com' });
    const org = await createOrg(owner._id, { slug: 'wrong-email-org' });

    const { rawToken } = await createInvite(org._id, owner._id, 'someone-else@test.com', 'member');

    const res = await api.post('/api/v1/invites/accept')
      .set(authHeader(accessToken))
      .send({ token: rawToken });

    expect(res.status).toBe(403);
  });

  it('404 — invalid token', async () => {
    const { accessToken } = await createUser({ email: 'bad-token@test.com' });

    const res = await api.post('/api/v1/invites/accept')
      .set(authHeader(accessToken))
      .send({ token: 'completely-invalid-token' });

    expect(res.status).toBe(404);
  });
});

describe('Invites — GET /api/v1/invites/org/:orgId', () => {
  it('200 — returns only pending invites', async () => {
    const { user: owner, accessToken } = await createUser({ email: 'list-inv-owner@test.com' });
    const org = await createOrg(owner._id, { slug: 'list-inv-org' });

    await createInvite(org._id, owner._id, 'pending1@test.com');
    await createInvite(org._id, owner._id, 'pending2@test.com');

    const res = await api.get(`/api/v1/invites/org/${org._id}`)
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.invites).toHaveLength(2);
  });
});

describe('Invites — DELETE /api/v1/invites/org/:orgId/:inviteId', () => {
  it('200 — admin can revoke a pending invite', async () => {
    const { user: owner, accessToken } = await createUser({ email: 'revoke-inv@test.com' });
    const org = await createOrg(owner._id, { slug: 'revoke-inv-org' });
    const { invite } = await createInvite(org._id, owner._id, 'torevoke@test.com');

    const res = await api
      .delete(`/api/v1/invites/org/${org._id}/${invite._id}`)
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(await Invite.findById(invite._id)).toBeNull();
  });
});
