import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';
import { qk } from './keys';

/**
 * Platform-wide business overview.
 *
 * Only meaningful for a super admin: /dashboard/stats is the single route that
 * aggregates across every organisation for them, where the list routes narrow
 * to the caller's own org and therefore return nothing.
 */
export const useDashboardStats = (enabled = true) =>
  useQuery({
    queryKey: qk.dashboard.stats,
    queryFn: dashboardApi.stats,
    enabled,
  });
