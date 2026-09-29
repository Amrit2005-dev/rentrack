import { cleanParams, http } from './client';
import { toPage } from './adapters';
/**
 * GET /tds/ returns a bare array and takes no page/page_size, so it is wrapped
 * in the paginated envelope and the financial-year filter narrows the loaded
 * page. PUT /tds/{id} accepts a certificate number and nothing else.
 */
export const tdsApi = {
  list: (params = {}) =>
    http
      .get('/tds/', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data, params)),
  get: (id) => http.get(`/tds/${id}`).then((r) => r.data),
  create: (body) => http.post('/tds/', body).then((r) => r.data),
  update: (id, certificate_number) =>
    http
      .put(`/tds/${id}`, {
        certificate_number,
      })
      .then((r) => r.data),
};
