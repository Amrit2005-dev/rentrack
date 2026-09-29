import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * GET /quotations/ returns a bare array and takes no page/page_size, so it is
 * wrapped in the paginated envelope and status filtering stays local.
 * QuotationStatus is lowercase on this API (draft|sent|accepted|rejected|expired).
 */
export const quotationsApi = {
  list: (params = {}) =>
    http
      .get('/quotations/', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data, params)),
  get: (id) => http.get(`/quotations/${id}`).then((r) => r.data),
  create: (body, params) =>
    http
      .post('/quotations/', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  /**
   * There is no /quotations/{id}/status route — status is one field on the
   * general update (QuotationUpdate).
   */
  setStatus: (id, status) =>
    http
      .put(`/quotations/${id}`, {
        status: String(status ?? '').toLowerCase(),
      })
      .then((r) => r.data),
  remove: (id) => http.delete(`/quotations/${id}`).then(() => undefined),
};
