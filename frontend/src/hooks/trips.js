import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/api/trips';
import { qk } from './keys';
import { useScopedCompanyId } from '@/store/companyScope';

/** See src/hooks/fleet.js — a super admin targets one org with `org_id`. */
const withOrg = (params, orgId) => (orgId ? { ...params, org_id: orgId } : params);
export function useTrips(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  return useQuery({
    queryKey: qk.trips.list({ ...params, org_id: scopedCompanyId }),
    queryFn: () => tripsApi.list(withOrg(params, scopedCompanyId)),
    // Scoping is server-side: the list routes already narrow to one
    // organisation (the caller's, or `org_id` for a super admin). Filtering
    // again here would drop every row, because these list payloads carry no
    // organisation field to match on.
  });
}

/** The signed-in driver's own trips. */
export const useMyTrips = (
  params = {
    page_size: 100,
  },
) =>
  useQuery({
    queryKey: qk.trips.mine(params),
    queryFn: () => tripsApi.mine(params),
  });
export const useTrip = (id) =>
  useQuery({
    queryKey: qk.trips.detail(id),
    queryFn: () => tripsApi.get(id),
    enabled: !!id,
  });
export const useTripReceipt = (id, enabled = true) =>
  useQuery({
    queryKey: qk.trips.receipt(id),
    queryFn: () => tripsApi.getReceipt(id),
    enabled: enabled && !!id,
    // A trip without a receipt yet answers 404; that is not worth retrying.
    retry: false,
  });

/** Every trip write moves fleet availability and the reports, so all three drop. */
function useTripInvalidator() {
  const qc = useQueryClient();
  return (id) => {
    void qc.invalidateQueries({
      queryKey: qk.trips.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.vehicles.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.drivers.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.reports.all,
    });
    if (id)
      void qc.invalidateQueries({
        queryKey: qk.trips.detail(id),
      });
  };
}
export function useCreateTrip() {
  const settle = useTripInvalidator();
  const scopedCompanyId = useScopedCompanyId();
  return useMutation({
    mutationFn: (body) => tripsApi.create(body, withOrg({}, scopedCompanyId)),
    onSuccess: (trip) => settle(trip.id),
  });
}

/** created → started → reached → completed, plus cancelled. */
export function useSetTripStatus(id) {
  const settle = useTripInvalidator();
  return useMutation({
    mutationFn: (status) => tripsApi.setStatus(id, status),
    onSuccess: () => settle(id),
  });
}
export function useSettleTrip(id) {
  const settle = useTripInvalidator();
  return useMutation({
    mutationFn: (body) => tripsApi.settle(id, body),
    onSuccess: () => settle(id),
  });
}
/**
 * The driver's decision on a trip they have been assigned.
 *
 * Separate from setStatus: the API models accept/reject as their own routes
 * (POST /trips/{id}/accept and /reject), and they only apply while the trip is
 * ASSIGNED.
 */
export function useAcceptTrip(id) {
  const settle = useTripInvalidator();
  return useMutation({
    mutationFn: () => tripsApi.accept(id),
    onSuccess: () => settle(id),
  });
}

export function useRejectTrip(id) {
  const settle = useTripInvalidator();
  return useMutation({
    mutationFn: (reason) => tripsApi.reject(id, { reason }),
    onSuccess: () => settle(id),
  });
}

export function useCreateReceipt(id) {
  const qc = useQueryClient();
  const settle = useTripInvalidator();
  return useMutation({
    mutationFn: (body) => tripsApi.createReceipt(id, body),
    onSuccess: () => {
      settle(id);
      void qc.invalidateQueries({
        queryKey: qk.trips.receipt(id),
      });
    },
  });
}
