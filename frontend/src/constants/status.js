/**
 * Status vocabularies, taken verbatim from app/models/*.py. Values are plain
 * lowercase strings, so an unmapped value degrades to a readable neutral badge
 * rather than rendering blank.
 */

const meta = (label, tone) => ({
  label,
  tone,
});

/** upcoming | in_progress | driver_reached | completed | cancelled */
export const tripStatusMeta = {
  upcoming: meta('Upcoming', 'accent'),
  in_progress: meta('In Progress', 'warning'),
  driver_reached: meta('Reached', 'info'),
  completed: meta('Completed', 'success'),
  cancelled: meta('Cancelled', 'danger'),
};

/** active | inactive | in_trip */
export const vehicleStatusMeta = {
  active: meta('Active', 'success'),
  in_trip: meta('In Trip', 'info'),
  inactive: meta('Inactive', 'danger'),
};

/** available | on_trip | off_duty */
export const driverAvailabilityMeta = {
  available: meta('Available', 'success'),
  on_trip: meta('On Trip', 'info'),
  off_duty: meta('Off Duty', 'warning'),
};

/** draft | sent | approved */
export const challanStatusMeta = {
  draft: meta('Draft', 'neutral'),
  sent: meta('Sent', 'info'),
  approved: meta('Approved', 'success'),
};

/** draft | pending | partial | paid | cancelled */
export const invoiceStatusMeta = {
  draft: meta('Draft', 'neutral'),
  pending: meta('Pending', 'warning'),
  partial: meta('Partial', 'info'),
  paid: meta('Paid', 'success'),
  cancelled: meta('Cancelled', 'danger'),
};

/** draft | sent | accepted | rejected | expired */
export const quotationStatusMeta = {
  draft: meta('Draft', 'neutral'),
  sent: meta('Sent', 'info'),
  accepted: meta('Accepted', 'success'),
  rejected: meta('Rejected', 'danger'),
  expired: meta('Expired', 'warning'),
};

/** pending | approved | rejected */
export const registrationStatusMeta = {
  pending: meta('Pending', 'warning'),
  approved: meta('Approved', 'success'),
  rejected: meta('Rejected', 'danger'),
  active: meta('Active', 'success'),
};

/** debit | credit | invoice | payment */
export const ledgerEntryMeta = {
  debit: meta('Debit', 'danger'),
  credit: meta('Credit', 'success'),
  invoice: meta('Invoice', 'info'),
  payment: meta('Payment', 'success'),
};

/** Vehicle document freshness, computed by the API. */
export const expiryStatusMeta = {
  valid: meta('Valid', 'success'),
  expiring_soon: meta('Expiring soon', 'warning'),
  expired: meta('Expired', 'danger'),
};

/** Falls back to a readable label so an unmapped status never renders blank. */
export function statusMeta(table, value) {
  if (!value) return meta('—', 'neutral');
  return (
    table[value] ??
    meta(
      value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
      'neutral',
    )
  );
}

/** Trip buckets behind the Upcoming / Completed / Cancelled tabs. */
export const TRIP_BUCKETS = {
  upcoming: ['upcoming'],
  active: ['in_progress', 'driver_reached'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};
