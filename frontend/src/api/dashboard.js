import { http } from './client';

/**
 * Business overview — /api/v1/dashboard/stats.
 *
 * The one endpoint that is genuinely platform-wide for a super admin: the
 * service skips the org filter entirely when the caller is one, so this is
 * where the platform totals come from. Every other list route narrows to the
 * caller's own org, which a super admin does not have.
 *
 * Shape: { total_users, pending_registrations, total_revenue,
 *          trips:    { total, scheduled, in_progress, completed, cancelled },
 *          vehicles: { total, available, on_trip, maintenance, retired },
 *          drivers:  { total, active, inactive, available, on_trip } }
 */
export const dashboardApi = {
  stats: () => http.get('/dashboard/stats').then((r) => r.data),
};
