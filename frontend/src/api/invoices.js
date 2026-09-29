import { cleanParams, http } from './client';
import { adaptInvoice, toPage } from './adapters';

/**
 * Invoices are mounted at /billing on this API, not /invoices — /invoices/
 * answered 404, which is why every billing screen read empty.
 *
 * GET /billing/ filters by `org_id` and `client_id` only (no page/page_size)
 * and returns a bare array, so it is wrapped in the paginated envelope the
 * screens expect. Status filtering stays local.
 */
export const invoicesApi = {
  list: (params = {}) =>
    http
      .get('/billing/', {
        params: cleanParams(params),
      })
      .then((r) => toPage((r.data ?? []).map(adaptInvoice), params)),
  get: (id) => http.get(`/billing/${id}`).then((r) => adaptInvoice(r.data)),
  create: (body, params) =>
    http
      .post('/billing/', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  /** Raise an invoice from already-recorded challans. */
  createFromChallans: (body, params) =>
    http
      .post('/billing/from-challans', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  /**
   * There is no /billing/{id}/status route — status is one field on the
   * general update (InvoiceUpdateRequest: payment_status, status, due_date,
   * notes, paid_amount), so the same body the screens already send applies.
   */
  setStatus: (id, body) => http.put(`/billing/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/billing/${id}`).then(() => undefined),
};
