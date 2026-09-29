import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * Clients — /api/v1/clients. These routes do exist (full CRUD); the note that
 * they did not was stale, which is why invoices, ledger and TDS had no client
 * picker even though every one of them requires a `client_id`.
 *
 * The list returns a bare array and takes `org_id` only.
 */
export const clientsApi = {
  list: (params = {}) =>
    http
      .get('/clients/', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data, params)),
  get: (id) => http.get(`/clients/${id}`).then((r) => r.data),
  /** `params.org_id` lets a super admin create inside a chosen company. */
  create: (body, params) =>
    http
      .post('/clients/', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  update: (id, body) => http.put(`/clients/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/clients/${id}`).then(() => undefined),
};
