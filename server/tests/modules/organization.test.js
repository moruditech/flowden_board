'use strict';

const { api, authHeader } = require('../helpers/request');
const { createUser, createOrg, addMember } = require('../helpers/factories');
const Membership   = require('../../src/shared/models/Membership.model');
const Organization = require('../../src/shared/models/Organization.model');

describe('Organizations — POST /api/v1/organizations', () => {
  it('201 — creates org and makes requester owner', async () => {
    const { accessToken } = await createUser({ email: 'owner@test.com' });
    const res = await api.post('/api/v1/organizations')
      .set(authHeader(accessToken))
      .send({ name: 'Acme Corp', slug: 'acme-corp' });

    expect(res.status).toBe(201);
    expect(res.body.data.org.slug).toBe('acme-corp');

    const user = (await api.get('/api/v1/auth/me').set(authHeader(accessToken))).body.data.user;
    const m    = await Membership.findOne({ organization: res.body.data.org.id });
    expect(m?.role).toBe('owner');
  });

  it('409 — duplicate slug', async () => {
    const { user, accessToken } = await createUser({ email: 'dup-org@test.com' });
    await createOrg(user._id, { slug: 'taken-slug' });

    const res = await api.post('/api/v1/organizations')
      .set(authHeader(accessToken))
      .send({ name: 'Another', slug: 'taken-slug' });
    expect(res.status).toBe(409);
  });
});

describe('Organizations — GET /api/v1/organizations', () => {
  it('200 — returns all orgs user belongs to', async () => {
    const { user: u1, accessToken } = await createUser({ email: 'list1@test.com' });
    const { user: u2 }              = await createUser({ email: 'list2@test.com' });

    await createOrg(u1._id, { slug: 'org-list-1' });
    const org2 = await createOrg(u2._id, { slug: 'org-list-2' });
    await addMember(u1._id, org2._id, 'admin');

    const res = await api.get('/api/v1/organizations').set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.orgs.length).toBe(2);
  });
});

describe('Organizations — PATCH /:orgId', () => {
  it('200 — admin can rename org', async () => {
    const { user: owner, accessToken } = await createUser({ email: 'rename@test.com' });
    const org  = await createOrg(owner._id, { slug: 'to-rename' });

    const res = await api.patch(`/api/v1/organizations/${org._id}`)
      .set(authHeader(accessToken))
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.org.name).toBe('New Name');
  });

  it('403 — member cannot rename org', async () => {
    const { user: owner }              = await createUser({ email: 'org-owner2@test.com' });
    const { user: member, accessToken } = await createUser({ email: 'org-member@test.com' });
    const org = await createOrg(owner._id, { slug: 'rename-guard' });
    await addMember(member._id, org._id, 'member');

    const res = await api.patch(`/api/v1/organizations/${org._id}`)
      .set(authHeader(accessToken))
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('Organizations — DELETE /:orgId', () => {
  it('200 — owner can delete org and all its data', async () => {
    const { user, accessToken } = await createUser({ email: 'del-org@test.com' });
    const org = await createOrg(user._id, { slug: 'to-delete' });

    const res = await api.delete(`/api/v1/organizations/${org._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);

    const exists = await Organization.findById(org._id);
    expect(exists).toBeNull();
  });

  it('403 — admin cannot delete org', async () => {
    const { user: owner }               = await createUser({ email: 'del-owner@test.com' });
    const { user: admin, accessToken }  = await createUser({ email: 'del-admin@test.com' });
    const org = await createOrg(owner._id, { slug: 'no-del' });
    await addMember(admin._id, org._id, 'admin');

    const res = await api.delete(`/api/v1/organizations/${org._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(403);
  });
});

describe('Organizations — member management', () => {
  it('200 — admin can change member role', async () => {
    const { user: owner, accessToken: ownerToken } = await createUser({ email: 'role-owner@test.com' });
    const { user: member }                          = await createUser({ email: 'role-member@test.com' });
    const org = await createOrg(owner._id, { slug: 'role-change' });
    await addMember(member._id, org._id, 'member');

    const res = await api
      .patch(`/api/v1/organizations/${org._id}/members/${member._id}`)
      .set(authHeader(ownerToken))
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.membership.role).toBe('admin');
  });

  it('200 — admin can remove a member', async () => {
    const { user: owner, accessToken: ownerToken } = await createUser({ email: 'rem-owner@test.com' });
    const { user: member }                          = await createUser({ email: 'rem-member@test.com' });
    const org = await createOrg(owner._id, { slug: 'remove-member' });
    await addMember(member._id, org._id, 'member');

    const res = await api
      .delete(`/api/v1/organizations/${org._id}/members/${member._id}`)
      .set(authHeader(ownerToken));
    expect(res.status).toBe(200);

    const m = await Membership.findOne({ user: member._id, organization: org._id });
    expect(m).toBeNull();
  });
});
