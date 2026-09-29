import { cleanParams, http } from './client';
import { adaptTrip, pageOf, toTripStatusPayload } from './adapters';

export const tripsApi = {
  list: (params = {}) =>
    http
      .get('/trips/', {
        params: cleanParams(params),
      })
      .then((r) => pageOf(r.data, adaptTrip, params)),
  /**
   * The signed-in driver's own trips — powers the driver app.
   *
   * There is no /trips/my route: GET /trips/ already narrows to the caller's
   * own driver record when their role is a driver, so this is the same call.
   * (Requesting /trips/my made FastAPI match GET /trips/{trip_id} and try to
   * parse "my" as a UUID, which is where the 422 came from.)
   */
  mine: (params = {}) =>
    http
      .get('/trips/', {
        params: cleanParams(params),
      })
      .then((r) => pageOf(r.data, adaptTrip, params)),
  get: (id) => http.get(`/trips/${id}`).then((r) => adaptTrip(r.data)),
  /** `params.org_id` lets a super admin create inside a chosen company. */
  create: (body, params) =>
    http
      .post('/trips/', body, { params: cleanParams(params ?? {}) })
      .then((r) => adaptTrip(r.data)),
  /**
   * Drives the created → started → completed lifecycle.
   *
   * Its own route rather than the general PATCH: that one is admin-only, and a
   * driver has to be able to start and complete their own trip. The value has
   * to be the uppercase enum.
   */
  setStatus: (id, status) =>
    http
      .patch(`/trips/${id}/status`, {
        status: toTripStatusPayload(status),
      })
      .then((r) => adaptTrip(r.data)),
  /**
   * Finalises the money once a trip is done. Also the general PATCH: the
   * settlement inputs are plain columns on the trip. The API spells the last
   * two plural, so the screen's singular names are translated here.
   */
  settle: (id, body = {}) =>
    http
      .patch(
        `/trips/${id}`,
        cleanParams({
          distance_km: body.distance_km,
          weight_tons: body.weight_tons,
          waiting_hours: body.waiting_hours,
          toll_charges: body.toll_charges ?? body.toll_charge,
          extra_charges: body.extra_charges ?? body.extra_charge,
          gst_rate: body.gst_rate,
        }),
      )
      .then((r) => adaptTrip(r.data)),
  createReceipt: (id, body) =>
    http.post(`/trips/${id}/receipt`, body).then((r) => r.data),
  getReceipt: (id) => http.get(`/trips/${id}/receipt`).then((r) => r.data),
  /** Driver assignment and the driver's own accept/reject. */
  assign: (id, body) =>
    http.post(`/trips/${id}/assign`, body).then((r) => adaptTrip(r.data)),
  accept: (id) => http.post(`/trips/${id}/accept`).then((r) => adaptTrip(r.data)),
  reject: (id, body) =>
    http.post(`/trips/${id}/reject`, body).then((r) => adaptTrip(r.data)),
};
