import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registrationsApi } from '@/api/registrations';
import { usersApi } from '@/api/users';
import { usePermissions } from '@/store/auth';
import { qk } from './keys';
import { scopePage, useScopedCompanyId } from '@/store/companyScope';
/* ── Users ──────────────────────────────────────────────── */

export function useUsers(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canManageUsers } = usePermissions();
  const scopedParams = scopedCompanyId ? { ...params, org_id: scopedCompanyId } : params;
  return useQuery({
    queryKey: qk.users.list(scopedParams),
    queryFn: () => usersApi.list(scopedParams),
    select: (page) => scopePage(page, scopedCompanyId),
    enabled: canManageUsers,
  });
}

/**
 * Creates a sign-in account.
 *
 * Pass `driver_id` to attach the account to a driver record — that link is what
 * makes the driver app show them their trips.
 */
export function useCreateUser() {
  const qc = useQueryClient();
  const scopedCompanyId = useScopedCompanyId();
  return useMutation({
    mutationFn: (body) =>
      usersApi.create(body, scopedCompanyId ? { org_id: scopedCompanyId } : {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.users.all }),
  });
}

/* ── Registration approvals ─────────────────────────────── */

export function useRegistrationRequests(
  params = {
    page_size: 100,
  },
) {
  const { canReviewRegistrations } = usePermissions();
  return useQuery({
    queryKey: qk.registrations.requests(params),
    queryFn: () => registrationsApi.listRequests(params),
    enabled: canReviewRegistrations,
  });
}

/** Public lookup — an applicant checks progress by mobile number. */
export const useRegistrationStatus = (mobile) =>
  useQuery({
    queryKey: qk.registrations.status(mobile),
    queryFn: () => registrationsApi.status(mobile),
    enabled: !!mobile,
    retry: false,
  });
function useRegistrationInvalidator() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({
      queryKey: qk.registrations.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.users.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.dashboard.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.organizations.all,
    });
  };
}
export function useApproveRegistration() {
  const settle = useRegistrationInvalidator();
  return useMutation({
    mutationFn: ({ id, body }) => registrationsApi.approve(id, body),
    onSuccess: settle,
  });
}
export function useRejectRegistration() {
  const settle = useRegistrationInvalidator();
  return useMutation({
    mutationFn: ({ id, reason }) => registrationsApi.reject(id, reason),
    onSuccess: settle,
  });
}
