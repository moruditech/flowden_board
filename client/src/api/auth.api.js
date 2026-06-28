import { client } from './client.js';

const BASE = '/auth';
export const authApi = {
  register:            (d) => client.post(`${BASE}/register`, d),
  login:               (d) => client.post(`${BASE}/login`, d),
  refresh:             ()  => client.post(`${BASE}/refresh`),
  logout:              ()  => client.post(`${BASE}/logout`),
  logoutAll:           ()  => client.post(`${BASE}/logout-all`),
  getMe:               ()  => client.get(`${BASE}/me`),
  forgotPassword:      (d) => client.post(`${BASE}/forgot-password`, d),
  resetPassword:       (d) => client.post(`${BASE}/reset-password`, d),
  verifyEmail:         (d) => client.post(`${BASE}/verify-email`, d),
  resendVerification:  ()  => client.post(`${BASE}/resend-verification`),
};
