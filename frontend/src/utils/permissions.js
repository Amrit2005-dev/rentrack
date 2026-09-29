import { UserRole } from '@/types/api';

/**
 * RentTrace Multi-Tenant Roles:
 *   super_admin — Platform Super Admin (manages all companies)
 *   org_admin / admin — Company Admin (manages company fleet, drivers, trips, billing)
 *   driver / user — Field Driver (scoped to assigned trips)
 */

/**
 * The API serves this enum in UPPERCASE (app/shared/enums.py: SUPER_ADMIN,
 * ORG_ADMIN, MANAGER, OPERATOR, DRIVER), while the constants above are
 * lowercase. Comparing the two directly silently failed every test: a DRIVER
 * was not `'driver'`, so the shell picker fell through to the admin console,
 * and a SUPER_ADMIN was not `'super_admin'`, so platform-wide permissions
 * stayed off. Case-fold once here and compare on the result.
 */
const canon = (role) =>
  String(role ?? '')
    .trim()
    .toLowerCase();

/*
 * The tiers mirror the API's own guards (app/modules/auth/dependencies.py):
 *
 *   SUPER_ADMIN > ORG_ADMIN / ADMIN > MANAGER > OPERATOR > DRIVER / USER
 *
 *   require_org_admin  → writes everywhere        → SUPER_ADMIN, ORG_ADMIN, ADMIN
 *   require_operator   → reads (fleet, crew,      → the above + MANAGER, OPERATOR
 *                        clients, billing lists)
 *   require_user       → own trips / challans     → everyone
 *
 * MANAGER and OPERATOR are back-office staff: they may read, but every write
 * route is require_org_admin, so granting them management rights here only
 * renders buttons the server answers with 403.
 */
const DRIVER_ROLES = new Set(['driver', 'user']);
const STAFF_ROLES = new Set(['manager', 'operator']);
const ADMIN_ROLES = new Set(['org_admin', 'admin', 'company_admin']);
const SUPER_ROLES = new Set(['super_admin', 'superadmin', 'platform_admin']);

export const isDriverRole = (role) => DRIVER_ROLES.has(canon(role));
export const isSuperAdminRole = (role) => SUPER_ROLES.has(canon(role));
/** Full management rights — mirrors require_org_admin. */
export const isAdminRole = (role) =>
  ADMIN_ROLES.has(canon(role)) || isSuperAdminRole(role);
/** Read-only back office — mirrors the extra roles require_operator allows. */
export const isStaffRole = (role) => STAFF_ROLES.has(canon(role));
/** Anyone who belongs in the console at all. */
export const isConsoleRole = (role) => isAdminRole(role) || isStaffRole(role);

/**
 * Which shell a user belongs in. Anything not recognised as console staff
 * lands in the driver shell, which only exposes that user's own trips — an
 * unknown role is denied the console rather than handed it.
 */
export const shellFor = (user) => (isConsoleRole(user?.role) ? 'admin' : 'driver');

export function permissionsFor(user) {
  const role = user?.role;
  const isSuper = isSuperAdminRole(role);
  const isAdmin = isAdminRole(role);
  const canRead = isConsoleRole(role);

  return {
    /** Read fleet, drivers and trips. */
    canViewResources: canRead,
    /** Create and edit vehicles and drivers. */
    canManageResources: isAdmin,
    /** Create trips, assign, settle. */
    canManageTrips: isAdmin,
    /** Generate and approve challans. */
    canManageChallans: isAdmin,
    /** Quotations, invoices, ledger and TDS. */
    canManageBilling: isAdmin,
    /** Review registration requests. */
    canReviewRegistrations: isAdmin,
    /** Manage user accounts. */
    canManageUsers: isAdmin,
    /** Platform-wide company oversight (Super Admin only). */
    canManageOrganizations: isSuper,
    /** A driver acting on their own assigned trips. */
    canRunAssignedTrips: isDriverRole(role),
  };
}

const ROLE_LABELS = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  super_admin: 'Super Admin',
  [UserRole.ORG_ADMIN]: 'Company Admin',
  org_admin: 'Company Admin',
  [UserRole.ADMIN]: 'Company Admin',
  admin: 'Company Admin',
  [UserRole.DRIVER]: 'Driver',
  driver: 'Driver',
  [UserRole.USER]: 'Driver',
  user: 'Driver',
  manager: 'Manager',
  operator: 'Operator',
  company_admin: 'Company Admin',
};

export const roleLabel = (role) =>
  role ? (ROLE_LABELS[canon(role)] ?? 'Member') : 'Member';

/** Returns full name or fallback to email / phone / dashes */
export const displayName = (user) => {
  if (!user) return '—';
  if (user.full_name && user.full_name.trim()) return user.full_name.trim();
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || user.phone || user.mobile_number || '—';
};
