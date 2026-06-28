import { client } from './client.js';

const BASE = '/invites';
export const inviteApi = {
  listByOrg:  (orgId)          => client.get(`${BASE}/org/${orgId}`),
  create:     (orgId, d)       => client.post(`${BASE}/org/${orgId}`, d),
  revoke:     (orgId, id)      => client.delete(`${BASE}/org/${orgId}/${id}`),
  accept:     (d)              => client.post(`${BASE}/accept`, d),
};
