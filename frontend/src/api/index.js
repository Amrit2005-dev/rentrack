/**
 * Barrel for the API layer. Every module here talks to the live FastAPI
 * service; the paths and shapes are reconciled against its OpenAPI schema, and
 * adapters.js absorbs the vocabulary differences so no screen has to.
 */
export * from './client';
export { authApi } from './auth';
export { challansApi } from './challans';
export { clientsApi } from './clients';
export { dashboardApi } from './dashboard';
export { driversApi } from './drivers';
export { invoicesApi } from './invoices';
export { ledgerApi } from './ledger';
export { organizationsApi } from './organizations';
export { quotationsApi } from './quotations';
export { registrationsApi } from './registrations';
export { reportsApi } from './reports';
export { tdsApi } from './tds';
export { tripsApi } from './trips';
export { usersApi } from './users';
export { vehiclesApi } from './vehicles';
