import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '@/api/collections';
import { expensesApi } from '@/api/expenses';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
import { qk } from './keys';

/** "Manage as company X" for a super admin, matching the other modules. */
const withOrg = (params, orgId) => (orgId ? { ...params, org_id: orgId } : params);

/* ── Driver collections ─────────────────────────────────── */

/**
 * Collections for a driver, or for the whole company when no driver is given.
 *
 * A driver is the one role that may both read and write here, so this is
 * enabled for them as well as for console staff — unlike expenses below.
 */
export function useCollections(driverId) {
  const scopedCompanyId = useScopedCompanyId();
  const { canViewResources, canRunAssignedTrips } = usePermissions();
  const params = withOrg(driverId ? { driver_id: driverId } : {}, scopedCompanyId);
  return useQuery({
    queryKey: qk.collections.list(params),
    queryFn: () => collectionsApi.list(params),
    enabled: canViewResources || canRunAssignedTrips,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const scopedCompanyId = useScopedCompanyId();
  return useMutation({
    mutationFn: (body) =>
      collectionsApi.create(body, scopedCompanyId ? { org_id: scopedCompanyId } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.collections.all }),
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => collectionsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.collections.all }),
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => collectionsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.collections.all }),
  });
}

/* ── Expenses ───────────────────────────────────────────── */

/**
 * Company expenses. Gated on canViewResources because the route is
 * require_operator — a driver asking for it gets a 403, so the query never
 * runs for them.
 */
export function useExpenses() {
  const scopedCompanyId = useScopedCompanyId();
  const { canViewResources } = usePermissions();
  const params = withOrg({}, scopedCompanyId);
  return useQuery({
    queryKey: qk.expenses.list(params),
    queryFn: () => expensesApi.list(params),
    enabled: canViewResources,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const scopedCompanyId = useScopedCompanyId();
  return useMutation({
    mutationFn: (body) =>
      expensesApi.create(body, scopedCompanyId ? { org_id: scopedCompanyId } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.expenses.all }),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => expensesApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.expenses.all }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => expensesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.expenses.all }),
  });
}
