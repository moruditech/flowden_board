'use strict';

const { api, authHeader }   = require('../helpers/request');
const { createUser, createOrg, addMember, createBoard } = require('../helpers/factories');
const Board = require('../../src/shared/models/Board.model');

const BOARD_PAYLOAD = { name: 'Sprint 1', columns: [{ name: 'To Do' }, { name: 'Done' }] };

describe('Boards — POST /api/v1/boards/org/:orgId', () => {
  it('201 — member can create a board', async () => {
    const { user, accessToken } = await createUser({ email: 'board-create@test.com' });
    const org = await createOrg(user._id, { slug: 'board-create-org' });

    const res = await api.post(`/api/v1/boards/org/${org._id}`)
      .set(authHeader(accessToken))
      .send(BOARD_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.data.board.name).toBe('Sprint 1');
    expect(res.body.data.board.columns).toHaveLength(2);
  });

  it('403 — non-member cannot create a board', async () => {
    const { user: owner }              = await createUser({ email: 'board-owner@test.com' });
    const { accessToken: outsiderToken } = await createUser({ email: 'outsider@test.com' });
    const org = await createOrg(owner._id, { slug: 'guarded-org' });

    const res = await api.post(`/api/v1/boards/org/${org._id}`)
      .set(authHeader(outsiderToken))
      .send(BOARD_PAYLOAD);
    expect(res.status).toBe(404); // 404 from authorize: org not found for this user
  });
});

describe('Boards — GET /api/v1/boards/org/:orgId', () => {
  it('200 — returns boards for the org', async () => {
    const { user, accessToken } = await createUser({ email: 'board-list@test.com' });
    const org = await createOrg(user._id, { slug: 'board-list-org' });
    await createBoard(org._id, user._id);
    await createBoard(org._id, user._id);

    const res = await api.get(`/api/v1/boards/org/${org._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.boards).toHaveLength(2);
  });
});

describe('Boards — PATCH /api/v1/boards/:boardId', () => {
  it('200 — renames board', async () => {
    const { user, accessToken } = await createUser({ email: 'board-rename@test.com' });
    const org   = await createOrg(user._id, { slug: 'board-rename-org' });
    const board = await createBoard(org._id, user._id);

    const res = await api.patch(`/api/v1/boards/${board._id}`)
      .set(authHeader(accessToken))
      .send({ name: 'Renamed Board' });
    expect(res.status).toBe(200);
    expect(res.body.data.board.name).toBe('Renamed Board');
  });
});

describe('Boards — DELETE /api/v1/boards/:boardId', () => {
  it('200 — admin can delete board', async () => {
    const { user, accessToken } = await createUser({ email: 'board-del@test.com' });
    const org   = await createOrg(user._id, { slug: 'board-del-org' });
    const board = await createBoard(org._id, user._id);

    const res = await api.delete(`/api/v1/boards/${board._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(await Board.findById(board._id)).toBeNull();
  });

  it('403 — member cannot delete board', async () => {
    const { user: owner }               = await createUser({ email: 'board-del-owner@test.com' });
    const { user: member, accessToken } = await createUser({ email: 'board-del-member@test.com' });
    const org   = await createOrg(owner._id, { slug: 'board-del-guard' });
    await addMember(member._id, org._id, 'member');
    const board = await createBoard(org._id, owner._id);

    const res = await api.delete(`/api/v1/boards/${board._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(403);
  });
});
