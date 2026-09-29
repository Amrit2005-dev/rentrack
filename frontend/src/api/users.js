import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * There is no /users router: the profile and the org's user list both live
 * under /auth (see app/modules/auth/router.py). /users/me and /users/ answered
 * 404. The list route returns a bare array, so it is wrapped for the screens.
 */
export const usersApi = {
  me: () => http.get('/auth/me').then((r) => r.data),
  /** Every user in the caller's organisation (org admin and above). */
  list: (params = {}) =>
    http
      .get('/auth/users', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data, params)),

  /**
   * Creates a sign-in account. `driver_id` links a DRIVER account to its driver
   * record — the trips routes read it to decide whose trips are whose, so a
   * driver account without it can see nothing.
   *
   * `params.org_id` lets a super admin create inside a chosen company.
   */
  create: (body, params) =>
    http
      .post('/auth/users', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),

  update: (id, body) => http.put(`/auth/users/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/auth/users/${id}`).then(() => undefined),
};
