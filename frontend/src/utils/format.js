import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

/** Indian numbering, no decimals unless the amount actually has paise. */
export function currency(value) {
  const amount = Number(value ?? 0);
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return `₹ ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
export const compactCurrency = (value) => {
  const amount = Number(value ?? 0);
  if (amount >= 10_000_000) return `₹ ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `₹ ${(amount / 100_000).toFixed(2)} L`;
  return currency(amount);
};
export const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '—');
export const formatTime = (value) => (value ? dayjs(value).format('hh:mm A') : '—');
export const formatDateTime = (value) =>
  value ? dayjs(value).format('DD MMM YYYY, hh:mm A') : '—';
export const formatDayMonth = (value) => (value ? dayjs(value).format('DD') : '—');
export const formatMonthShort = (value) => (value ? dayjs(value).format('MMM') : '');
export const fromNow = (value) => (value ? dayjs(value).fromNow() : '');
export const isPast = (value) => (value ? dayjs(value).isBefore(dayjs()) : false);

/** Minutes → "4h 30m", for trip duration estimates. */
export function duration(minutes) {
  if (minutes == null) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}
export const distance = (km) =>
  km == null ? '—' : `${Number(km).toLocaleString('en-IN')} km`;
export const tons = (value) =>
  value == null ? '—' : `${Number(value).toLocaleString('en-IN')} Ton`;

/** "Rahul Sharma" → "RS", for avatar fallbacks. */
export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * Turns SCREAMING_SNAKE enum values into "Screaming snake", but leaves short
 * all-caps tokens alone so MachineType.JCB does not render as "Jcb".
 */
const ACRONYMS = new Set(['JCB', 'RC', 'PUC', 'GST', 'TDS']);
export function humanise(value) {
  if (!value) return '—';
  return value
    .split('_')
    .map((word) =>
      ACRONYMS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}
