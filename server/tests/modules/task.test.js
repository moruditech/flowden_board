'use strict';

const { api, authHeader }   = require('../helpers/request');
const { createUser, createOrg, addMember, createBoard, createTask } = require('../helpers/factories');
const Task = require('../../src/shared/models/Task.model');

describe('Tasks — POST /api/v1/tasks/board/:boardId', () => {
  it('201 — creates task in correct column', async () => {
    const { user, accessToken } = await createUser({ email: 'task-create@test.com' });
    const org   = await createOrg(user._id, { slug: 'task-create-org' });
    const board = await createBoard(org._id, user._id);
    const colId = board.columns[0]._id.toString();

    const res = await api.post(`/api/v1/tasks/board/${board._id}`)
      .set(authHeader(accessToken))
      .send({ title: 'My First Task', columnId: colId });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('My First Task');
    expect(res.body.data.task.column).toBe(colId);
    expect(res.body.data.task.position).toBeGreaterThan(0);
  });

  it('400 — invalid columnId', async () => {
    const { user, accessToken } = await createUser({ email: 'task-bad-col@test.com' });
    const org   = await createOrg(user._id, { slug: 'task-bad-col-org' });
    const board = await createBoard(org._id, user._id);

    const res = await api.post(`/api/v1/tasks/board/${board._id}`)
      .set(authHeader(accessToken))
      .send({ title: 'Bad', columnId: '000000000000000000000000' });
    expect(res.status).toBe(400);
  });
});

describe('Tasks — PATCH /api/v1/tasks/:taskId', () => {
  it('200 — updates title', async () => {
    const { user, accessToken } = await createUser({ email: 'task-update@test.com' });
    const org   = await createOrg(user._id, { slug: 'task-update-org' });
    const board = await createBoard(org._id, user._id);
    const task  = await createTask(board._id, user._id);

    const res = await api.patch(`/api/v1/tasks/${task._id}`)
      .set(authHeader(accessToken))
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.title).toBe('Updated Title');
  });
});

describe('Tasks — PATCH /api/v1/tasks/:taskId/move', () => {
  it('200 — moves task to another column', async () => {
    const { user, accessToken } = await createUser({ email: 'task-move@test.com' });
    const org    = await createOrg(user._id, { slug: 'task-move-org' });
    const board  = await createBoard(org._id, user._id);
    const task   = await createTask(board._id, user._id);
    const newCol = board.columns[1]._id.toString();

    const res = await api.patch(`/api/v1/tasks/${task._id}/move`)
      .set(authHeader(accessToken))
      .send({ columnId: newCol, position: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.data.task.column).toBe(newCol);
  });
});

describe('Tasks — DELETE /api/v1/tasks/:taskId', () => {
  it('200 — deletes task', async () => {
    const { user, accessToken } = await createUser({ email: 'task-del@test.com' });
    const org   = await createOrg(user._id, { slug: 'task-del-org' });
    const board = await createBoard(org._id, user._id);
    const task  = await createTask(board._id, user._id);

    const res = await api.delete(`/api/v1/tasks/${task._id}`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(await Task.findById(task._id)).toBeNull();
  });

  it('404 — non-existent task', async () => {
    const { accessToken } = await createUser({ email: 'task-del-404@test.com' });
    const res = await api.delete('/api/v1/tasks/000000000000000000000000')
      .set(authHeader(accessToken));
    expect(res.status).toBe(404);
  });
});
