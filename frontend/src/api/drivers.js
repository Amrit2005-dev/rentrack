import { cleanParams, http } from './client';
import { adaptDriver, pageOf, toDriverApiPayload } from './adapters';
export const driversApi = {
  list: (params = {}) =>
    http
      .get('/drivers/', {
        params: cleanParams(params),
      })
      .then((r) => pageOf(r.data, adaptDriver, params)),
  /**
   * Unassigned drivers, for the trip assignment pickers.
   *
   * There is no /drivers/available route — asking for one made FastAPI match
   * GET /drivers/{driver_id} and reject "available" as a UUID. The list is
   * small and already company-scoped, so the filter happens here.
   */
  available: (params = {}) =>
    http
      .get('/drivers/', {
        params: cleanParams(params),
      })
      .then((r) => {
        const page = pageOf(r.data, adaptDriver, params);
        const items = page.items.filter((d) => d.availability === 'available');
        return { ...page, items, total: items.length };
      }),
  get: (id) => http.get(`/drivers/${id}`).then((r) => adaptDriver(r.data)),
  /** `params.org_id` lets a super admin create inside a chosen company. */
  create: (body, params) =>
    http
      .post('/drivers/', toDriverApiPayload(body), { params: cleanParams(params ?? {}) })
      .then((r) => adaptDriver(r.data)),
  update: (id, body) =>
    http.put(`/drivers/${id}`, toDriverApiPayload(body)).then((r) => adaptDriver(r.data)),
  remove: (id) => http.delete(`/drivers/${id}`).then(() => undefined),

  /**
   * Uploads a scan of the driving licence.
   */
  uploadLicence: async (id, file) => {
    if (!file) return { ok: true, skipped: true };
    const form = new FormData();
    /*
     * Web hands back a real File; native gives a descriptor that fetch turns
     * into a part only when uri/name/type are all present.
     */
    form.append(
      'file',
      file.file ?? {
        uri: file.uri,
        name: file.name ?? 'licence',
        type: file.mimeType ?? 'application/octet-stream',
      },
    );
    try {
      const res = await http.post(`/drivers/${id}/licence-document`, form, {
        // Letting the browser set this itself is what writes the multipart
        // boundary; hard-coding the header omits it and the server sees a
        // body it cannot parse.
        headers: { 'Content-Type': undefined },
      });
      return { ok: true, data: res.data };
    } catch (error) {
      if (error?.status === 404 || error?.status === 405) {
        return {
          ok: false,
          reason: 'This API version cannot store documents yet.',
        };
      }
      return { ok: false, reason: error?.message ?? 'The document could not be saved.' };
    }
  },
};
