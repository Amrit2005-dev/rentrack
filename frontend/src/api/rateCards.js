import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * Rate cards — the charge sheet every other money screen reads from.
 *
 * `GET /rate-cards/` returns a bare array and accepts `org_id`, `client_id` and
 * `vehicle_type`. A card is keyed on the machine's type, optionally narrowed to
 * one client: a client-specific card wins over the company-wide one for the
 * same type, which is how "this client pays a different hourly rate" is
 * expressed.
 */
export const rateCardsApi = {
  list: (params = {}) =>
    http
      .get('/rate-cards/', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data ?? [], params)),
  get: (id) => http.get(`/rate-cards/${id}`).then((r) => r.data),
  /** `params.org_id` lets a super admin create inside a chosen company. */
  create: (body, params) =>
    http
      .post('/rate-cards/', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  update: (id, body) => http.put(`/rate-cards/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/rate-cards/${id}`).then(() => undefined),
};

/** Every money field on a card, defaulted so arithmetic never meets undefined. */
export const EMPTY_RATES = {
  base_fare: 0,
  per_km_rate: 0,
  per_ton_rate: 0,
  per_hour_rate: 0,
  waiting_rate: 0,
};

/**
 * The card that applies to a machine type, preferring one written for this
 * client over the company-wide default.
 *
 * Vehicle type is free text on the form and an enum on the machine, so the
 * comparison is case-folded — a card saved as "Truck" has to match a machine
 * typed TRUCK.
 */
export function findRateCard(cards, vehicleType, clientId) {
  if (!vehicleType) return null;
  const wanted = String(vehicleType).trim().toLowerCase();
  const matching = (cards ?? []).filter(
    (card) =>
      String(card.vehicle_type ?? '')
        .trim()
        .toLowerCase() === wanted,
  );
  if (!matching.length) return null;
  // Written out rather than chained with ??: `clientId && find(...)` yields the
  // falsy clientId itself when there is none, and '' ?? fallback is '', not the
  // fallback — which would hand back an empty string as if it were a card.
  if (clientId) {
    const forClient = matching.find((card) => card.client_id === clientId);
    if (forClient) return forClient;
  }
  return matching.find((card) => !card.client_id) ?? matching[0];
}

/** A card's money fields, with every absent rate read as zero. */
export const ratesOf = (card) => ({
  ...EMPTY_RATES,
  base_fare: Number(card?.base_fare ?? 0),
  per_km_rate: Number(card?.per_km_rate ?? 0),
  per_ton_rate: Number(card?.per_ton_rate ?? 0),
  per_hour_rate: Number(card?.per_hour_rate ?? 0),
  waiting_rate: Number(card?.waiting_rate ?? 0),
});

/**
 * What a machine's running hours are worth under a card.
 *
 * Challan items carry a required `amount`, and this is where it comes from —
 * the screen used to send hours alone, which the API rejected.
 */
export function chargeForHours(card, hours) {
  const { per_hour_rate } = ratesOf(card);
  const worked = Number(hours ?? 0);
  if (!Number.isFinite(worked) || worked <= 0) return 0;
  return Math.round(per_hour_rate * worked * 100) / 100;
}
