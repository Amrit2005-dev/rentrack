import { cleanParams, http } from './client';
import { adaptLedger, toPage } from './adapters';

/**
 * Client ledger. The routes are collection-level with a `client_id` query
 * param — there is no /ledger/{clientId} statement route and no
 * /ledger/{clientId}/payment; both 404'd. A payment is an ordinary ledger
 * entry (LedgerEntryCreate) carrying the client id in its body.
 *
 * LedgerEntryType is lowercase on this API (debit|credit|invoice|payment) even
 * though TripStatus and ChallanStatus are uppercase — the casing is per-enum,
 * not global.
 */
export const ledgerApi = {
  /** Statement for one client. */
  forClient: (clientId, params = {}) =>
    http
      .get(`/ledger/${clientId}`, {
        params: cleanParams(params),
      })
      .then((r) => toPage(adaptLedger(r.data), params)),
  recordPayment: (clientId, body = {}) =>
    http
      .post(`/ledger/${clientId}/payment`, {
        entry_type: body.entry_type ?? 'payment',
        entry_date: (body.entry_date ?? new Date().toISOString()).slice(0, 10),
        amount: body.amount,
        reference_no: body.reference_no ?? null,
        note: body.note ?? null,
      })
      .then((r) => r.data),
};
