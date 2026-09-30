import { cleanParams, http } from './client';
import { adaptPage } from './adapters';

export const tdsApi = {
  list: (params = {}) =>
    http
      .get('/tds/', {
        params: cleanParams(params),
      })
      .then((r) => adaptPage(r.data, null, params)),
  get: (id) => http.get(`/tds/${id}`).then((r) => r.data),
  create: (body) => http.post('/tds/', body).then((r) => r.data),
  update: (id, certificate_number) =>
    http
      .put(`/tds/${id}`, {
        certificate_number,
      })
      .then((r) => r.data),
};
