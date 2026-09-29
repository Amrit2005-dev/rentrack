import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/api/drivers';
import { vehiclesApi } from '@/api/vehicles';
import { uploadVehicleDocuments } from '@/features/vehicles/vehicleDocuments';
import { usePermissions } from '@/store/auth';
import { qk } from './keys';
import { useScopedCompanyId } from '@/store/companyScope';

/**
 * "Manage as company X" for a super admin.
 *
 * Fleet, crew and trip lists are scoped server-side to the caller's own
 * organisation, and a super admin has none — so unscoped they answer with an
 * empty list. The API accepts `org_id` from a super admin specifically to
 * target one organisation, so entering a company passes it through and the
 * screens fill with that company's live data instead of nothing.
 */
const withOrg = (params, orgId) => (orgId ? { ...params, org_id: orgId } : params);

/* ── Vehicles ───────────────────────────────────────────── */

export function useVehicles(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canViewResources } = usePermissions();
  return useQuery({
    queryKey: qk.vehicles.list({ ...params, org_id: scopedCompanyId }),
    queryFn: () => vehiclesApi.list(withOrg(params, scopedCompanyId)),
    // Scoping is server-side: the list routes already narrow to one
    // organisation (the caller's, or `org_id` for a super admin). Filtering
    // again here would drop every row, because these list payloads carry no
    // organisation field to match on.
    enabled: canViewResources,
  });
}
export const useVehicle = (id) =>
  useQuery({
    queryKey: qk.vehicles.detail(id),
    queryFn: () => vehiclesApi.get(id),
    enabled: !!id,
  });
function useVehicleInvalidator() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({
      queryKey: qk.vehicles.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.reports.all,
    });
  };
}
/**
 * Create/update take `{ body, documents }` and upload the picked document scans
 * after the save, so the lists refresh once with the files in place. The result
 * carries `failedDocuments`: labels of scans the save kept going without.
 */
export function useCreateVehicle() {
  const settle = useVehicleInvalidator();
  const scopedCompanyId = useScopedCompanyId();
  return useMutation({
    mutationFn: async ({ body, documents }) => {
      const vehicle = await vehiclesApi.create(body, withOrg({}, scopedCompanyId));
      const failedDocuments = await uploadVehicleDocuments(vehicle.id, documents);
      return { ...vehicle, failedDocuments };
    },
    onSuccess: settle,
  });
}
export function useUpdateVehicle(id) {
  const settle = useVehicleInvalidator();
  return useMutation({
    mutationFn: async ({ body, documents }) => {
      const vehicle = await vehiclesApi.update(id, body);
      const failedDocuments = await uploadVehicleDocuments(id, documents);
      return { ...vehicle, failedDocuments };
    },
    onSuccess: settle,
  });
}
export function useDeleteVehicle() {
  const settle = useVehicleInvalidator();
  return useMutation({
    mutationFn: (id) => vehiclesApi.remove(id),
    onSuccess: settle,
  });
}

/* ── Drivers ────────────────────────────────────────────── */

export function useDrivers(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canViewResources } = usePermissions();
  return useQuery({
    queryKey: qk.drivers.list({ ...params, org_id: scopedCompanyId }),
    queryFn: () => driversApi.list(withOrg(params, scopedCompanyId)),
    // Scoping is server-side: the list routes already narrow to one
    // organisation (the caller's, or `org_id` for a super admin). Filtering
    // again here would drop every row, because these list payloads carry no
    // organisation field to match on.
    enabled: canViewResources,
  });
}

/** Unassigned drivers — used by the trip assignment pickers. */
export function useAvailableDrivers(enabled = true) {
  const scopedCompanyId = useScopedCompanyId();
  const { canViewResources } = usePermissions();
  return useQuery({
    queryKey: qk.drivers.available(scopedCompanyId),
    queryFn: () => driversApi.available(withOrg({}, scopedCompanyId)),
    enabled: enabled && canViewResources,
  });
}
export const useDriver = (id) =>
  useQuery({
    queryKey: qk.drivers.detail(id),
    queryFn: () => driversApi.get(id),
    enabled: !!id,
  });
function useDriverInvalidator() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({
      queryKey: qk.drivers.all,
    });
    void qc.invalidateQueries({
      queryKey: qk.vehicles.all,
    });
  };
}
export function useCreateDriver() {
  const settle = useDriverInvalidator();
  const scopedCompanyId = useScopedCompanyId();
  return useMutation({
    mutationFn: (body) => driversApi.create(body, withOrg({}, scopedCompanyId)),
    onSuccess: settle,
  });
}
export function useUpdateDriver(id) {
  const settle = useDriverInvalidator();
  return useMutation({
    mutationFn: (body) => driversApi.update(id, body),
    onSuccess: settle,
  });
}
export function useDeleteDriver() {
  const settle = useDriverInvalidator();
  return useMutation({
    mutationFn: (id) => driversApi.remove(id),
    onSuccess: settle,
  });
}
