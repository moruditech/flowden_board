import { client } from './client.js';

const BASE = '/organizations';
export const organizationApi = {
  list:              ()                      => client.get(BASE),
  create:            (d)                     => client.post(BASE, d),
  getById:           (orgId)                 => client.get(`${BASE}/${orgId}`),
  update:            (orgId, d)              => client.patch(`${BASE}/${orgId}`, d),
  remove:            (orgId)                 => client.delete(`${BASE}/${orgId}`),
  listMembers:       (orgId)                 => client.get(`${BASE}/${orgId}/members`),
  updateMemberRole:  (orgId, userId, d)      => client.patch(`${BASE}/${orgId}/members/${userId}`, d),
  removeMember:      (orgId, userId)         => client.delete(`${BASE}/${orgId}/members/${userId}`),
};
