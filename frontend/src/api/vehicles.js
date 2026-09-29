import { cleanParams, http } from './client';
import { adaptVehicle, pageOf, toMachinePayload } from './adapters';
/**
 * Fleet, mounted at /vehicles. toMachinePayload() turns form values into the
 * create/update body.
 */
export const vehiclesApi = {
  list: (params = {}) =>
    http
      .get('/vehicles/', {
        params: cleanParams(params),
      })
      .then((r) => pageOf(r.data, adaptVehicle, params)),
  get: (id) => http.get(`/vehicles/${id}`).then((r) => adaptVehicle(r.data)),
  /** `params.org_id` lets a super admin create inside a chosen company. */
  create: (body, params) =>
    http
      .post('/vehicles/', toMachinePayload(body), { params: cleanParams(params ?? {}) })
      .then((r) => adaptVehicle(r.data)),
  update: (id, body) =>
    http.put(`/vehicles/${id}`, toMachinePayload(body)).then((r) => adaptVehicle(r.data)),
  /** Soft-deactivates rather than deleting. */
  remove: (id) => http.delete(`/vehicles/${id}`).then(() => undefined),

  /**
   * Attaches a scan (image or PDF) of one compliance document.
   * `kind`: rc | insurance | fitness | puc.
   */
  uploadDocument: async (id, kind, file) => {
    const form = new FormData();
    // Web hands back a real File; native gives a descriptor that fetch turns
    // into a part only when uri/name/type are all present.
    form.append(
      'file',
      file.file ?? {
        uri: file.uri,
        name: file.name ?? kind,
        type: file.mimeType ?? 'application/octet-stream',
      },
    );
    const res = await http.post(`/vehicles/${id}/documents/${kind}`, form, {
      // Let the browser write the multipart boundary itself.
      headers: { 'Content-Type': undefined },
    });
    return adaptVehicle(res.data);
  },
};
