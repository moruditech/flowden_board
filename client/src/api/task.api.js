import { client } from './client.js';

const BASE = '/tasks';
export const taskApi = {
  listByBoard:  (boardId)        => client.get(`${BASE}/board/${boardId}`),
  create:       (boardId, d)     => client.post(`${BASE}/board/${boardId}`, d),
  getById:      (taskId)         => client.get(`${BASE}/${taskId}`),
  update:       (taskId, d)      => client.patch(`${BASE}/${taskId}`, d),
  move:         (taskId, d)      => client.patch(`${BASE}/${taskId}/move`, d),
  remove:       (taskId)         => client.delete(`${BASE}/${taskId}`),
};
