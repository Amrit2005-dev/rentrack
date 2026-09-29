import { create } from 'zustand';

/**
 * Open state for the admin navigation drawer.
 *
 * Lives in a store rather than in app/admin/_layout.js because the trigger and
 * the panel sit on opposite sides of the Stack: every screen renders its own
 * header (headerShown is false on the navigator), so the hamburger belongs to
 * the screen while the panel has to overlay the whole shell, tab bar included.
 *
 * Deliberately not persisted — a drawer left open across a reload is a bug,
 * not a preference.
 */
export const useDrawerStore = create((set) => ({
  open: false,

  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
  toggleDrawer: () => set((s) => ({ open: !s.open })),
}));

/* Separate selectors — returning an object here would re-render every consumer
   on any store change. Same rule as store/companyScope.js. */
export const useDrawerOpen = () => useDrawerStore((s) => s.open);
export const useOpenDrawer = () => useDrawerStore((s) => s.openDrawer);
export const useCloseDrawer = () => useDrawerStore((s) => s.closeDrawer);
export const useToggleDrawer = () => useDrawerStore((s) => s.toggleDrawer);
