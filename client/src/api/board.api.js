import { client } from './client.js';

const BASE = '/boards';
export const boardApi = {
  listByOrg:  (orgId)         => client.get(`${BASE}/org/${orgId}`),
  create:     (orgId, d)      => client.post(`${BASE}/org/${orgId}`, d),
  getById:    (boardId)       => client.get(`${BASE}/${boardId}`),
  update:     (boardId, d)    => client.patch(`${BASE}/${boardId}`, d),
  remove:     (boardId)       => client.delete(`${BASE}/${boardId}`),
};
