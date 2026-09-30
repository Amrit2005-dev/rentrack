import { cleanParams, http } from './client';
import { adaptInvoice, adaptPage } from './adapters';

/**
 * Invoices are mounted at /billing on this API, not /invoices.
 * GET /billing/ returns an envelope or list, processed safely with adaptPage.
 */
export const invoicesApi = {
  list: (params = {}) =>
    http
      .get('/billing/', {
        params: cleanParams(params),
      })
      .then((r) => adaptPage(r.data, adaptInvoice, params)),
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
