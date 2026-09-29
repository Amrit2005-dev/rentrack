import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * Organisations — /api/v1/organizations. This is the company directory the app
 * previously had to infer from the users list; it is a real endpoint here, so
 * a company shows up as soon as it exists rather than only once someone has
 * signed in under it.
 *
 * Status is OrgStatus: PENDING | ACTIVE | SUSPENDED | REJECTED.
 */
export const organizationsApi = {
  list: (params = {}) =>
    http
      .get('/organizations/', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data, params)),
  publicList: () => http.get('/organizations/public').then((r) => r.data),
  get: (id) => http.get(`/organizations/${id}`).then((r) => r.data),
  create: (body) => http.post('/organizations/', body).then((r) => r.data),
  update: (id, body) => http.put(`/organizations/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/organizations/${id}`).then(() => undefined),

  /** Public self-service signup. */
  register: (body) => http.post('/organizations/register', body).then((r) => r.data),

  approve: (id, body) =>
    http.post(`/organizations/${id}/approve`, body).then((r) => r.data),
  reject: (id, body) =>
    http.post(`/organizations/${id}/reject`, body).then((r) => r.data),
  suspend: (id, body) =>
    http.post(`/organizations/${id}/suspend`, body).then((r) => r.data),
};
