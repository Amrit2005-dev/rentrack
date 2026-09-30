import { cleanParams, http } from './client';
import { adaptChallan, adaptPage, toChallanStatusPayload } from './adapters';

/**
 * GET /challans/ filters by `org_id` and `client_id` only and returns a bare
 * array or paginated envelope, so it is wrapped safely with adaptPage.
 */
export const challansApi = {
  list: (params = {}) =>
    http
      .get('/challans/', {
        params: cleanParams(params),
      })
      .then((r) => adaptPage(r.data, adaptChallan, params)),
  get: (id) => http.get(`/challans/${id}`).then((r) => adaptChallan(r.data)),
  /** Running hours per vehicle for a day, compiled into one challan. */
  create: (body, params) =>
    http
      .post('/challans/', body, { params: cleanParams(params ?? {}) })
      .then((r) => adaptChallan(r.data)),
  setStatus: (id, status) =>
    http
      .patch(`/challans/${id}/status`, {
        status: toChallanStatusPayload(status),
      })
      .then((r) => adaptChallan(r.data)),
  /** Fires the day's SMS to the client. Returns a message, not the challan. */
  notify: (id) => http.post(`/challans/${id}/notify`).then((r) => r.data),
  remove: (id) => http.delete(`/challans/${id}`).then(() => undefined),
};
