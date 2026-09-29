import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/api/organizations';
import { useRegistrationRequests } from '@/hooks/accounts';
import { usePermissions } from '@/store/auth';

/**
 * The company directory.
 *
 * This API does expose the companies directly — GET /organizations/ — so the
 * list is read from there. It used to be assembled from GET /users/ instead,
 * on the assumption that no company endpoint existed; that never produced a
 * row here, because this service's user list (UserListResponse) carries no
 * company at all, so every company came out unnamed and was dropped.
 *
 * Pending registrations are still folded in, so the count of people waiting to
 * join a company shows next to it.
 */
export function useCompanyDirectory() {
  const { canManageOrganizations } = usePermissions();

  const orgs = useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: () => organizationsApi.list({ limit: 200 }),
    enabled: canManageOrganizations,
  });

  const requests = useRegistrationRequests({
    page_size: 200,
  });

  const rows = useMemo(() => {
    const pendingByCompany = new Map();
    let unmatchedPending = 0;
    for (const request of requests.data?.items ?? []) {
      const id = request.matched_company_id ?? request.company_id ?? null;
      if (!id) {
        // A brand-new company name has nothing to match until it is approved.
        unmatchedPending += 1;
        continue;
      }
      pendingByCompany.set(id, (pendingByCompany.get(id) ?? 0) + 1);
    }

    const list = (orgs.data?.items ?? []).map((org) => ({
      id: org.id,
      name: org.name,
      city: org.city ?? null,
      status: companyStatus(org.status),
      plan: org.plan,
      created_at: org.created_at,
      pending: pendingByCompany.get(org.id) ?? 0,
      // Only a company waiting for approval is onboarding; rejected and
      // suspended ones are neither onboarding nor live.
      onboarding: companyStatus(org.status) === 'pending',
      active: companyStatus(org.status) === 'active',
      members: 0,
      admins: 0,
      drivers: 0,
    }));

    return {
      list: list.sort((a, b) => {
        if (a.onboarding !== b.onboarding) return a.onboarding ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
      unmatchedPending,
    };
  }, [orgs.data, requests.data]);

  return {
    rows: rows.list,
    /** Applications for a company that does not exist yet. */
    pendingNewCompanies: rows.unmatchedPending,
    isLoading: orgs.isLoading || requests.isLoading,
    error: orgs.error ?? requests.error,
    refetch: async () => {
      await Promise.all([orgs.refetch(), requests.refetch()]);
    },
  };
}

/**
 * Approving a company flips its status pending → active (super admin only).
 * The endpoint takes no body — the org id in the path is the whole request —
 * so the directory is refetched to pick the new status up.
 */
export function useApproveCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => organizationsApi.approve(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

/**
 * The server's company status (pending | active | rejected | suspended), in
 * lower case. A row without one predates the column and is live.
 */
export const companyStatus = (status) => String(status || 'active').toLowerCase();

const COMPANY_BADGES = {
  pending: { label: 'Onboarding', tone: 'warning' },
  active: { label: 'Active', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'neutral' },
};

/** Badge props for a company status. */
export const companyBadge = (status) =>
  COMPANY_BADGES[companyStatus(status)] ?? COMPANY_BADGES.active;

/** Last resort label when a row references a company nothing named. */
export const shortId = (id) => `Company ${String(id).slice(0, 8).toUpperCase()}`;
