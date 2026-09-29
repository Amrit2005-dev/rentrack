import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * Driver daily collections — cash and transfers a driver takes on a trip.
 *
 * `GET /driver-collections/` returns a bare array and accepts `org_id` and
 * `driver_id`. The route sits behind require_user rather than require_operator,
 * which is what makes this the one money module a driver can use: they record
 * their own takings, an admin reads everyone's.
 */
export const collectionsApi = {
  list: (params = {}) =>
    http
      .get('/driver-collections/', { params: cleanParams(params) })
      .then((r) => toPage(r.data ?? [], params)),
  get: (id) => http.get(`/driver-collections/${id}`).then((r) => r.data),
  create: (body, params) =>
    http
      .post('/driver-collections/', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  update: (id, body) => http.put(`/driver-collections/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/driver-collections/${id}`).then(() => undefined),
};

/**
 * `payment_mode` is a free-text column, so these are the values the app writes
 * rather than an enum the server checks. Kept in one place so a collection
 * recorded by a driver and one recorded by an admin read the same in reports.
 */
export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { value: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'swap-horizontal-outline' },
  { value: 'CHEQUE', label: 'Cheque', icon: 'document-text-outline' },
];

export const paymentModeLabel = (value) =>
  PAYMENT_MODES.find((m) => m.value === value)?.label ??
  (value ? String(value).replace(/_/g, ' ') : '—');

/** A reference number only means something for the non-cash modes. */
export const needsReference = (mode) => mode && mode !== 'CASH';
