/** Single source of truth for cache keys so invalidation never drifts. */
export const qk = {
  me: ['me'],
  vehicles: {
    all: ['vehicles'],
    list: (params = {}) => ['vehicles', 'list', params],
    detail: (id) => ['vehicles', 'detail', id],
  },
  drivers: {
    all: ['drivers'],
    list: (params = {}) => ['drivers', 'list', params],
    available: (orgId) => ['drivers', 'available', orgId ?? 'current'],
    detail: (id) => ['drivers', 'detail', id],
  },
  trips: {
    all: ['trips'],
    list: (params = {}) => ['trips', 'list', params],
    mine: (params = {}) => ['trips', 'mine', params],
    detail: (id) => ['trips', 'detail', id],
    receipt: (id) => ['trips', 'receipt', id],
  },
  clients: {
    all: ['clients'],
    list: (params = {}) => ['clients', 'list', params],
    detail: (id) => ['clients', 'detail', id],
  },
  challans: {
    all: ['challans'],
    list: (params = {}) => ['challans', 'list', params],
    detail: (id) => ['challans', 'detail', id],
  },
  invoices: {
    all: ['invoices'],
    list: (params = {}) => ['invoices', 'list', params],
    detail: (id) => ['invoices', 'detail', id],
  },
  quotations: {
    all: ['quotations'],
    list: (params = {}) => ['quotations', 'list', params],
    detail: (id) => ['quotations', 'detail', id],
  },
  ledger: {
    all: ['ledger'],
    forClient: (clientId, params = {}) => ['ledger', clientId, params],
  },
  collections: {
    all: ['collections'],
    list: (params = {}) => ['collections', 'list', params],
  },
  expenses: {
    all: ['expenses'],
    list: (params = {}) => ['expenses', 'list', params],
  },
  rateCards: {
    all: ['rate-cards'],
    list: (params = {}) => ['rate-cards', 'list', params],
    detail: (id) => ['rate-cards', 'detail', id],
  },
  tds: {
    all: ['tds'],
    list: (params = {}) => ['tds', 'list', params],
    detail: (id) => ['tds', 'detail', id],
  },
  reports: {
    all: ['reports'],
    revenue: (params = {}) => ['reports', 'revenue', params],
    trips: (params = {}) => ['reports', 'trips', params],
  },
  registrations: {
    all: ['registrations'],
    requests: (params = {}) => ['registrations', 'requests', params],
    status: (mobile) => ['registrations', 'status', mobile],
  },
  users: {
    all: ['users'],
    list: (params = {}) => ['users', 'list', params],
  },
};
