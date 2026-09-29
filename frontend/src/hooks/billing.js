import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { challansApi } from '@/api/challans';
import { invoicesApi } from '@/api/invoices';
import { ledgerApi } from '@/api/ledger';
import { quotationsApi } from '@/api/quotations';
import { reportsApi } from '@/api/reports';
import { tdsApi } from '@/api/tds';
import { usePermissions } from '@/store/auth';
import { qk } from './keys';
import { scopePage, useScopedCompanyId } from '@/store/companyScope';
/* ── Challans ───────────────────────────────────────────── */

export function useChallans(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canManageChallans } = usePermissions();
  return useQuery({
    queryKey: qk.challans.list(params),
    queryFn: () => challansApi.list(params),
    select: (page) => scopePage(page, scopedCompanyId),
    enabled: canManageChallans,
  });
}
export const useChallan = (id) =>
  useQuery({
    queryKey: qk.challans.detail(id),
    queryFn: () => challansApi.get(id),
    enabled: !!id,
  });
export function useCreateChallan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => challansApi.create(body),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: qk.challans.all,
      }),
  });
}

/** Fires the day's SMS to the client. */
export function useNotifyChallan(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => challansApi.notify(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: qk.challans.all,
      });
      void qc.invalidateQueries({
        queryKey: qk.challans.detail(id),
      });
    },
  });
}

/* ── Quotations ─────────────────────────────────────────── */

export function useQuotations(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canManageBilling } = usePermissions();
  return useQuery({
    queryKey: qk.quotations.list(params),
    queryFn: () => quotationsApi.list(params),
    select: (page) => scopePage(page, scopedCompanyId),
    enabled: canManageBilling,
  });
}
export const useQuotation = (id) =>
  useQuery({
    queryKey: qk.quotations.detail(id),
    queryFn: () => quotationsApi.get(id),
    enabled: !!id,
  });
export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => quotationsApi.create(body),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: qk.quotations.all,
      }),
  });
}
export function useSetQuotationStatus(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status) => quotationsApi.setStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: qk.quotations.all,
      });
      void qc.invalidateQueries({
        queryKey: qk.quotations.detail(id),
      });
    },
  });
}

/* ── Invoices ───────────────────────────────────────────── */

export function useInvoices(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canManageBilling } = usePermissions();
  return useQuery({
    queryKey: qk.invoices.list(params),
    queryFn: () => invoicesApi.list(params),
    select: (page) => scopePage(page, scopedCompanyId),
    enabled: canManageBilling,
  });
}
export const useInvoice = (id) =>
  useQuery({
    queryKey: qk.invoices.detail(id),
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => invoicesApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: qk.invoices.all,
      });
      void qc.invalidateQueries({
        queryKey: qk.ledger.all,
      });
    },
  });
}
export function useSetInvoiceStatus(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => invoicesApi.setStatus(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: qk.invoices.all,
      });
      void qc.invalidateQueries({
        queryKey: qk.invoices.detail(id),
      });
      void qc.invalidateQueries({
        queryKey: qk.ledger.all,
      });
    },
  });
}

/* ── Ledger ─────────────────────────────────────────────── */

export const useClientLedger = (
  clientId,
  params = {
    page_size: 100,
  },
) =>
  useQuery({
    queryKey: qk.ledger.forClient(clientId, params),
    queryFn: () => ledgerApi.forClient(clientId, params),
    enabled: !!clientId,
  });
export function useRecordPayment(clientId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => ledgerApi.recordPayment(clientId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: qk.ledger.all,
      });
      void qc.invalidateQueries({
        queryKey: qk.invoices.all,
      });
    },
  });
}

/* ── TDS ────────────────────────────────────────────────── */

export function useTdsRecords(
  params = {
    page_size: 100,
  },
) {
  const scopedCompanyId = useScopedCompanyId();
  const { canManageBilling } = usePermissions();
  return useQuery({
    queryKey: qk.tds.list(params),
    queryFn: () => tdsApi.list(params),
    select: (page) => scopePage(page, scopedCompanyId),
    enabled: canManageBilling,
  });
}
export function useUpdateTdsCertificate(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certificate_number) => tdsApi.update(id, certificate_number),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: qk.tds.all,
      }),
  });
}
export function useCreateTds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => tdsApi.create(body),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: qk.tds.all,
      }),
  });
}

/* ── Reports ────────────────────────────────────────────── */

export function useRevenueReport(params = {}) {
  const { canViewResources } = usePermissions();
  const scopedCompanyId = useScopedCompanyId();
  const scopedParams = scopedCompanyId ? { ...params, org_id: scopedCompanyId } : params;
  return useQuery({
    queryKey: qk.reports.revenue(scopedParams),
    queryFn: () => reportsApi.revenue(scopedParams),
    enabled: canViewResources,
  });
}
export function useTripReport(params = {}) {
  const { canViewResources } = usePermissions();
  const scopedCompanyId = useScopedCompanyId();
  const scopedParams = scopedCompanyId ? { ...params, org_id: scopedCompanyId } : params;
  return useQuery({
    queryKey: qk.reports.trips(scopedParams),
    queryFn: () => reportsApi.trips(scopedParams),
    enabled: canViewResources,
  });
}
