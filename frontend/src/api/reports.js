import { cleanParams, http } from './client';
import { adaptTripReport } from './adapters';

/**
 * Both reports take `start_date` / `end_date` as datetimes and compare them
 * against `created_at` — not the trip or invoice dates. Revenue is the sum of
 * invoice `final_amount`, so it counts what has been billed rather than what
 * has been collected.
 *
 * Revenue already uses the names the screens expect (`total_revenue`); the
 * trip report does not, so adaptTripReport translates it.
 */

export const reportsApi = {
  revenue: (params = {}) =>
    http
      .get('/reports/revenue', {
        params: cleanParams(params),
      })
      .then((r) => r.data),
  trips: (params = {}) =>
    http
      .get('/reports/trips', {
        params: cleanParams(params),
      })
      .then((r) => adaptTripReport(r.data)),
};
