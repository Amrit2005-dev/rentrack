/**
 * The API returns registration rows with `user` and `company` nested, and both
 * are nullable in the response even though the columns are not — a deleted user
 * or a serialisation that skipped the relationship would leave them out. These
 * readers keep every screen from repeating the same optional chaining.
 */

export const applicantName = (request) => {
  const user = request?.user;
  if (!user) return 'New request';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.mobile_number;
};
export const applicantMobile = (request) => request?.user?.mobile_number ?? '—';
export const companyOf = (request) => request?.company ?? null;
export const companyName = (request) => request?.company?.name ?? 'Unknown company';
export const companyCity = (request) => request?.company?.city ?? null;
