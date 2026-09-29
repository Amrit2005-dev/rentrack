import { cleanParams, http } from './client';
import { toPage } from './adapters';

/**
 * Company expenses — fuel, maintenance, salaries and the rest.
 *
 * `GET /expenses/` is guarded by require_operator and takes no filters at all:
 * it returns the caller's whole organisation. Narrowing therefore happens on
 * the screen, which is also why the list asks for everything at once.
 *
 * A driver cannot read this route, which is why these screens live in the
 * console rather than the driver shell.
 */
export const expensesApi = {
  list: (params = {}) =>
    http
      .get('/expenses/', { params: cleanParams(params) })
      .then((r) => toPage(r.data ?? [], params)),
  get: (id) => http.get(`/expenses/${id}`).then((r) => r.data),
  create: (body, params) =>
    http
      .post('/expenses/', body, { params: cleanParams(params ?? {}) })
      .then((r) => r.data),
  update: (id, body) => http.put(`/expenses/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/expenses/${id}`).then(() => undefined),
};

/** ExpenseCategory, in the API's own case — the server rejects anything else. */
export const EXPENSE_CATEGORIES = [
  { value: 'FUEL', label: 'Fuel', icon: 'water-outline', tone: 'info' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: 'build-outline', tone: 'warning' },
  { value: 'TRANSPORT', label: 'Transport', icon: 'car-outline', tone: 'accent' },
  { value: 'SALARY', label: 'Salary', icon: 'people-outline', tone: 'success' },
  { value: 'RENT', label: 'Rent', icon: 'business-outline', tone: 'neutral' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal', tone: 'neutral' },
];

export const categoryMeta = (value) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value) ?? EXPENSE_CATEGORIES.at(-1);
