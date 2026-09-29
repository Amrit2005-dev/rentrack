import { useMemo } from 'react';
import { usePermissions, useCurrentUser } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
import { useRegistrationRequests } from '@/hooks/accounts';
import { isSuperAdminRole } from '@/utils/permissions';

/**
 * One definition of the admin navigation, read by the sidebar and by the
 * dashboard's Quick Access block.
 *
 * These lists used to be written out twice — the quick actions inline in
 * app/admin/(tabs)/index.js and the section links inline in the Account tab —
 * which is how Account ended up acting as the app's overflow menu. Defining
 * them once means a new section appears everywhere at the same time, and with
 * the same permission guard.
 *
 * Two shapes come out of here because two surfaces want different things:
 * `groups` is the nested tree the sidebar renders, `sections` the flat list the
 * dashboard card lists. Both are derived from the same source below, so they
 * cannot drift.
 */

/**
 * Creating anything from the platform view would orphan the row: every create
 * route stamps the caller's own org_id, and a super admin has none. Company
 * work happens after entering a company from the Companies tab.
 */
function useCompanyWorkAllowed() {
  const user = useCurrentUser();
  const scopedCompanyId = useScopedCompanyId();
  return !(isSuperAdminRole(user?.role) && !scopedCompanyId);
}

/**
 * Whether the side panel (drawer, or rail on wide screens) is shown. A super
 * admin on the platform view has no company sections to list, so the panel
 * would open empty — they work from the dashboard and the Companies tab.
 */
export function useHasSideNav() {
  return useCompanyWorkAllowed();
}

export function useAdminNavigation() {
  const {
    canManageResources,
    canManageTrips,
    canManageChallans,
    canManageBilling,
    canManageUsers,
    canViewResources,
    canManageOrganizations,
    canReviewRegistrations,
  } = usePermissions();
  const companyWorkAllowed = useCompanyWorkAllowed();

  /* The only count on the sidebar that means anything — approvals waiting. */
  const requests = useRegistrationRequests();
  const pendingCount = canReviewRegistrations ? (requests.data?.total ?? 0) : 0;

  /** Create-something shortcuts. Hidden entirely on the platform view. */
  const quickActions = useMemo(
    () =>
      [
        {
          key: 'vehicle-new',
          label: 'Add Vehicle',
          icon: 'bus-outline',
          tone: 'info',
          href: '/admin/vehicle/new',
          visible: canManageResources,
        },
        {
          key: 'driver-new',
          label: 'Add Driver',
          icon: 'person-add-outline',
          tone: 'success',
          href: '/admin/driver/new',
          visible: canManageResources,
        },
        {
          key: 'trip-new',
          label: 'Add Trip',
          icon: 'add-circle-outline',
          tone: 'accent',
          href: '/admin/trip/new',
          visible: canManageTrips,
        },
        {
          key: 'running-hours',
          label: 'Running Hours',
          icon: 'time-outline',
          tone: 'warning',
          href: '/admin/challans/new',
          visible: canManageChallans,
        },
      ].filter((item) => item.visible && companyWorkAllowed),
    [canManageResources, canManageTrips, canManageChallans, companyWorkAllowed],
  );

  /**
   * The navigation tree.
   *
   * A branch is a heading that opens; a leaf goes straight to a route. Fleet
   * and Trips have their own bottom tabs as well — they are here so the
   * sidebar is the whole map rather than only the parts the tab bar left out.
   */
  const groups = useMemo(() => {
    const tree = [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: 'grid-outline',
        href: '/admin',
        visible: true,
      },
      {
        key: 'companies',
        label: 'Companies',
        icon: 'business-outline',
        href: '/admin/companies',
        visible: canManageOrganizations,
      },
      {
        key: 'fleet',
        label: 'Fleet',
        icon: 'cube-outline',
        visible: canViewResources && companyWorkAllowed,
        children: [
          { key: 'vehicles', label: 'Vehicles', href: '/admin/vehicles', visible: true },
          { key: 'drivers', label: 'Drivers', href: '/admin/drivers', visible: true },
        ],
      },
      {
        key: 'trips',
        label: 'Trips',
        icon: 'map-outline',
        visible: canViewResources && companyWorkAllowed,
        children: [
          { key: 'trips-all', label: 'All Trips', href: '/admin/trips', visible: true },
          {
            key: 'trips-calendar',
            label: 'Calendar',
            href: '/admin/trip/calendar',
            visible: true,
          },
        ],
      },
      {
        key: 'challans',
        label: 'Challans',
        icon: 'receipt-outline',
        visible: canManageChallans && companyWorkAllowed,
        children: [
          {
            key: 'challans-all',
            label: 'Challans',
            href: '/admin/challans',
            visible: true,
            quick: true,
          },
          {
            key: 'challans-new',
            label: 'Running Hours',
            href: '/admin/challans/new',
            visible: true,
          },
          {
            key: 'challans-calendar',
            label: 'Calendar',
            href: '/admin/challans/calendar',
            visible: true,
          },
        ],
      },
      {
        key: 'billing',
        label: 'Billing',
        icon: 'card-outline',
        visible: canManageBilling && companyWorkAllowed,
        children: [
          {
            key: 'quotations',
            label: 'Quotations',
            href: '/admin/quotations',
            visible: true,
            quick: true,
          },
          {
            key: 'invoices',
            label: 'Invoices',
            href: '/admin/invoices',
            visible: true,
            quick: true,
          },
          {
            key: 'ledger',
            label: 'Client Ledger',
            href: '/admin/ledger',
            visible: true,
            quick: true,
          },
          {
            key: 'collections',
            label: 'Collections',
            href: '/admin/collections',
            visible: true,
            quick: true,
          },
          {
            key: 'expenses',
            label: 'Expenses',
            href: '/admin/expenses',
            visible: true,
            quick: true,
          },
          {
            key: 'tds',
            label: 'TDS Register',
            href: '/admin/tds',
            visible: true,
            quick: true,
          },
        ],
      },
      {
        key: 'reports',
        label: 'Reports',
        icon: 'bar-chart-outline',
        href: '/admin/reports',
        visible: canManageBilling && companyWorkAllowed,
      },
      {
        key: 'users',
        label: 'Users',
        icon: 'people-outline',
        href: '/admin/users',
        visible: canManageUsers && companyWorkAllowed,
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: 'notifications-outline',
        href: '/admin/notifications',
        badge: pendingCount,
        visible: true,
      },
    ];

    return tree
      .filter((node) => node.visible)
      .map((node) =>
        node.children
          ? { ...node, children: node.children.filter((child) => child.visible) }
          : node,
      )
      .filter((node) => !node.children || node.children.length > 0);
  }, [
    canViewResources,
    canManageChallans,
    canManageBilling,
    canManageUsers,
    canManageOrganizations,
    companyWorkAllowed,
    pendingCount,
  ]);

  /**
   * The same destinations flattened for the dashboard's Quick Access card,
   * minus the two that already have a bottom tab of their own.
   */
  /*
   * Every destination that is not a bottom tab, flattened.
   *
   * This card is the console's only list of the sections now that the side
   * panel carries actions alone, so a branch contributes each of its pages
   * rather than collapsing to a landing page — otherwise Invoices, the ledger,
   * TDS, expenses and collections have no entry point anywhere.
   */
  const sections = useMemo(() => {
    const HINTS = {
      'challans-all': "Daily running hours and the day's SMS",
      quotations: 'Rate offers sent to clients',
      invoices: 'Billing and outstanding amounts',
      ledger: 'Statements and payments received',
      tds: 'Deductions and certificates by year',
      reports: 'Revenue and trip performance',
      collections: 'Cash and transfers drivers took in',
      expenses: 'Fuel, maintenance and running costs',
      users: 'Who can sign in to your organisation',
      notifications: 'Account requests and upcoming trips',
    };
    const out = [];
    for (const node of groups) {
      if (node.key === 'dashboard' || node.key === 'fleet' || node.key === 'trips') {
        continue;
      }
      if (node.children) {
        for (const child of node.children) {
          // `quick` marks the pages worth their own row; the rest are
          // sub-views (a calendar, a create form already offered as an action).
          if (!child.quick) continue;
          out.push({
            key: child.key,
            label: child.label,
            icon: node.icon,
            href: child.href,
            hint: HINTS[child.key] ?? '',
          });
        }
        continue;
      }
      out.push({
        key: node.key,
        label: node.label,
        icon: node.icon,
        href: node.href,
        hint: HINTS[node.key] ?? '',
      });
    }
    return out;
  }, [groups]);

  return {
    groups,
    /*
     * Deliberately empty: the console's side panel holds the create actions and
     * the profile, nothing else. `groups` is still returned because the
     * dashboard's Quick Access card is built from it — that card is now the
     * only place the sections are listed, so it is not optional.
     */
    sidebarGroups: [],
    quickActions,
    sections,
    companyWorkAllowed,
    pendingCount,
  };
}

/**
 * The driver shell's navigation.
 *
 * Every destination a driver has also has a bottom tab — there is no overflow
 * here the way there is in the console, so this is the same three places rather
 * than a hidden fourth. It exists so both shells are opened and read the same
 * way; the panel's value on this side is the identity and the sign-out at its
 * foot, not routes you could not otherwise reach.
 */
export function useDriverNavigation() {
  const groups = useMemo(
    () => [
      {
        key: 'driver-dashboard',
        label: 'Dashboard',
        icon: 'home-outline',
        href: '/driver',
      },
      {
        key: 'driver-trips',
        label: 'My Trips',
        icon: 'map-outline',
        href: '/driver/trips',
      },
      {
        key: 'driver-collections',
        label: 'Collections',
        icon: 'cash-outline',
        href: '/driver/collections',
      },
      {
        key: 'driver-account',
        label: 'Account',
        icon: 'person-outline',
        href: '/driver/account',
      },
    ],
    [],
  );

  /*
   * The driver panel does show its rows: a driver has no create actions, so
   * stripping the navigation out of it the way the console's was stripped
   * would leave an empty box with only a sign-out in it.
   */
  return {
    groups,
    sidebarGroups: groups,
    quickActions: [],
    sections: [],
    pendingCount: 0,
  };
}

/**
 * The navigation for whichever shell is asking.
 *
 * Both hooks run on every call because hooks cannot be skipped conditionally —
 * the cost is one disabled query, since the approvals count the console hook
 * fetches is already gated on a permission a driver does not have.
 */
export function useShellNavigation(shell) {
  const admin = useAdminNavigation();
  const driver = useDriverNavigation();
  return shell === 'driver' ? driver : admin;
}

/** Splits a list into rows of `size` for the quick-action grids. */
export function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
