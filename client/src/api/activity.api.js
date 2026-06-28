import { client } from './client.js';

export const activityApi = {
  listByOrg: (orgId, params) => client.get(`/activity/org/${orgId}`, { params }),
};
