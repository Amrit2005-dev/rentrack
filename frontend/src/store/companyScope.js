import { create } from 'zustand';

/**
 * "Manage as company X" for a super admin.
 *
 * Every list endpoint returns platform-wide data to a super admin, so scoping
 * is a client-side filter rather than a different request. The hooks in
 * src/hooks apply it through TanStack Query's `select`, which means a screen
 * inherits the filter without knowing the scope exists.
 *
 * Deliberately not persisted: a reload drops you back to the platform-wide
 * view rather than leaving you quietly acting inside one company.
 *
 * Reads only. Every create route stamps the new row with the caller's own
 * company_id, and a super admin has none, so scoping cannot make a write land
 * in the selected company — see SuperAdminWriteNotice.
 */
export const useCompanyScopeStore = create((set) => ({
  companyId: null,
  companyName: null,

  enter: (companyId, companyName) => set({ companyId, companyName }),
  exit: () => set({ companyId: null, companyName: null }),
}));

/* Separate selectors — returning an object here would make every consumer
   re-render on any store change. */
export const useScopedCompanyId = () => useCompanyScopeStore((s) => s.companyId);
export const useScopedCompanyName = () => useCompanyScopeStore((s) => s.companyName);
export const useEnterCompanyScope = () => useCompanyScopeStore((s) => s.enter);
export const useExitCompanyScope = () => useCompanyScopeStore((s) => s.exit);

/**
 * Filters a paginated payload down to the scoped company, correcting `total`
 * so the count tiles agree with the rows on screen. Returns the payload
 * untouched when no company is selected.
 */
export function scopePage(page, companyId) {
  if (!companyId || !page?.items) return page;
  const items = page.items.filter((row) => row.company_id === companyId);
  return { ...page, items, total: items.length };
}
