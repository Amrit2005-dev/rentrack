/**
 * Route handlers for the offline mock backend.
 *
 * One entry per endpoint the app actually calls (see src/api/*.js). Handlers
 * receive `{ params, body, user }` and return the payload the real API would;
 * anything that would be an HTTP error throws HttpError, which ./index.js
 * turns into an axios-shaped rejection so src/api/client.js maps it to an
 * ApiError exactly as it does against the real service.
 */

import { seed, uid, iso, day, withExpiryStatus } from './data';

export const db = seed();

export class HttpError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : 'Request failed');
    this.name = 'HttpError';
    this.status = status;
    this.detail = detail;
  }
}

const notFound = (what = 'Record') => {
  throw new HttpError(404, `${what} not found`);
};

const num = (value, fallback = null) =>
  value === undefined || value === null || value === '' ? fallback : Number(value);

function paginate(rows, params = {}) {
  const page = Math.max(1, num(params.page, 1) || 1);
  const page_size = Math.max(1, num(params.page_size, 20) || 20);
  const start = (page - 1) * page_size;
  return {
    items: rows.slice(start, start + page_size),
    total: rows.length,
    page,
    page_size,
    pages: Math.max(1, Math.ceil(rows.length / page_size)),
  };
}

const newest = (a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);

/** Super admins read platform-wide; everyone else is pinned to their company. */
const visible = (rows, user) =>
  user.role === 'super_admin'
    ? rows
    : rows.filter((r) => r.company_id === user.company_id);

/** Every write lands in the caller's own company — a super admin has none. */
const ownCompany = (user) => user.company_id ?? null;

const touch = (row) => {
  row.updated_at = iso();
  return row;
};

/* ── Sessions ───────────────────────────────────────────── */

function issueTokens(user) {
  // The user id travels inside the token so a session persisted by
  // secureStorage still resolves after a reload, even though the in-memory
  // sessions map starts empty again.
  const access = `mock-access.${user.id}.${uid('t')}`;
  const refresh = `mock-refresh.${user.id}.${uid('t')}`;
  db.sessions.set(access, user.id);
  db.sessions.set(refresh, user.id);
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: 'bearer',
    role: user.role,
    user_id: user.id,
  };
}

export function userForToken(token) {
  if (!token || db.revoked.has(token)) return null;
  const id = db.sessions.get(token) ?? String(token).split('.')[1];
  return db.users.find((u) => u.id === id) ?? null;
}

const findUser = (id) => db.users.find((u) => u.id === id) ?? null;
const findCompany = (id) => db.companies.find((c) => c.id === id) ?? null;

const withCompany = (user) => ({ ...user, company: findCompany(user.company_id) });

/* ── Auth ───────────────────────────────────────────────── */

export const authRoutes = {
  'POST /auth/request-otp': ({ body }) => {
    const mobile = String(body?.mobile_number ?? '').trim();
    // Matches the login screen: ten digits, no prefix rule.
    if (!/^\d{10}$/.test(mobile)) {
      throw new HttpError(422, [
        { loc: ['body', 'mobile_number'], msg: 'Enter a valid 10-digit mobile number' },
      ]);
    }
    // The real dev backend prints the code to its console; we hand it back so
    // the verify screen can show it in its "Dev OTP" hint.
    const otp = '123456';
    db.otps.set(mobile, otp);
    return { message: `OTP sent to ${mobile}`, mobile_number: mobile, otp };
  },

  'POST /auth/verify-otp': ({ body }) => {
    const mobile = String(body?.mobile_number ?? '').trim();
    const otp = String(body?.otp ?? '').trim();
    const expected = db.otps.get(mobile);
    if (!expected) throw new HttpError(400, 'Request an OTP before verifying.');
    if (otp !== expected) throw new HttpError(401, 'That code is not right. Try again.');

    const user = db.users.find((u) => u.mobile_number === mobile);
    if (!user) {
      throw new HttpError(
        404,
        'No account uses this number yet. Register to get started.',
      );
    }
    if (user.status === 'pending') {
      throw new HttpError(403, 'Your registration is still awaiting approval.');
    }
    if (user.status === 'rejected') {
      throw new HttpError(403, 'This registration was rejected. Contact your admin.');
    }
    db.otps.delete(mobile);
    return issueTokens(user);
  },

  'POST /auth/refresh': ({ body }) => {
    const token = body?.refresh_token;
    const user = userForToken(token);
    if (!user) throw new HttpError(401, 'Refresh token is no longer valid.');
    // The real API rotates on every use, so the old pair stops working.
    db.sessions.delete(token);
    db.revoked.add(token);
    return issueTokens(user);
  },

  'POST /auth/logout': ({ body }) => {
    if (body?.refresh_token) {
      db.sessions.delete(body.refresh_token);
      db.revoked.add(body.refresh_token);
    }
    return { message: 'Signed out' };
  },
};

/* ── Users ──────────────────────────────────────────────── */

export const userRoutes = {
  'GET /users/me': ({ user }) => ({ ...user }),

  /*
   * The app asks for the signed-in user at /auth/me; this mock was written when
   * the route was /users/me. Without the alias a session could be started and
   * then immediately failed on the profile fetch that follows it, which is the
   * one step between here and being able to see any screen behind the login.
   *
   * Only an alias — the rest of this file still speaks the previous API's
   * vocabulary (/vehicles rather than /machines, /invoices rather than
   * /billing), so most screens behind the login will still come up empty.
   */
  'GET /auth/me': ({ user }) => ({ ...user }),

  'GET /users/': ({ params, user }) => {
    const rows = visible(db.users, user)
      .filter((u) => (params.role ? u.role === params.role : true))
      .map(withCompany)
      .sort(newest);
    return paginate(rows, params);
  },
};

/* ── Registration ───────────────────────────────────────── */

const registrationView = (request) => ({
  ...request,
  user: findUser(request.user_id),
  company: findCompany(request.company_id),
});

/*
 * The app moved to /registration/apply and /admin/registrations; this file
 * still described the previous API's paths, so applying for an account died
 * on "No mock route for POST /registration/apply" and the approvals queue
 * never loaded. Each handler is defined once and registered under both
 * spellings.
 */
const applyForAccount = ({ body }) => {
  const mobile = String(body?.mobile_number ?? '').trim();
  const companyName = String(body?.company_name ?? '').trim();
  const errors = [];
  if (!/^\d{10}$/.test(mobile))
    errors.push({
      loc: ['body', 'mobile_number'],
      msg: 'Enter a valid 10-digit mobile number',
    });
  if (!body?.first_name)
    errors.push({ loc: ['body', 'first_name'], msg: 'First name is required' });
  if (!companyName)
    errors.push({ loc: ['body', 'company_name'], msg: 'Company name is required' });
  if (!body?.city) errors.push({ loc: ['body', 'city'], msg: 'City is required' });
  if (errors.length) throw new HttpError(422, errors);

  if (db.users.some((u) => u.mobile_number === mobile)) {
    throw new HttpError(409, 'An account already uses this mobile number.');
  }

  let company = db.companies.find(
    (c) => c.name.toLowerCase() === companyName.toLowerCase(),
  );
  const is_new_company = !company;
  if (!company) {
    company = {
      id: uid('company'),
      name: companyName,
      city: body.city,
      created_at: iso(),
      updated_at: iso(),
    };
    db.companies.push(company);
  }

  const user = {
    id: uid('user'),
    mobile_number: mobile,
    first_name: body.first_name,
    last_name: body.last_name ?? null,
    // The first person into a brand-new company becomes its admin on approval.
    role: is_new_company ? 'admin' : 'user',
    company_id: company.id,
    status: 'pending',
    created_at: iso(),
    updated_at: iso(),
  };
  db.users.push(user);

  db.registrations.push({
    id: uid('registration'),
    user_id: user.id,
    company_id: company.id,
    status: 'pending',
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: iso(),
    updated_at: iso(),
  });

  return {
    user_id: user.id,
    status: 'pending',
    company_id: company.id,
    is_new_company,
    message: is_new_company
      ? `${company.name} was created. Your request is with the platform team.`
      : `Your request has been sent to an admin at ${company.name}.`,
  };
};

/*
 * Looked up by whatever the screen has to hand. It asks for a mobile number
 * and the client puts it in the path, so accept it from either place — and
 * fall back to a request id, which is what the path segment is named after.
 */
const registrationStatus = ({ params, id }) => {
  const mobile = String(id ?? params?.mobile_number ?? '').trim();
  const user = db.users.find((u) => u.mobile_number === mobile);
  if (!user) notFound('Registration');
  const request = db.registrations.find((r) => r.user_id === user.id);
  const status = request?.status ?? user.status;
  const messages = {
    pending: 'Your request is waiting for an admin to review it.',
    approved: 'You are approved. Sign in with your mobile number.',
    rejected: request?.rejection_reason
      ? `Rejected: ${request.rejection_reason}`
      : 'Your request was rejected.',
  };
  return {
    user_id: user.id,
    status,
    message: messages[status] ?? 'Your account is active.',
  };
};

const listRequests = ({ params, user }) => {
  const rows = visible(
    db.registrations.filter((r) => r.status === 'pending'),
    user,
  )
    .map(registrationView)
    .sort(newest);
  return paginate(rows, params);
};

const approveRequest = ({ id, body, user }) => {
  const request = db.registrations.find((r) => r.id === id) ?? notFound('Request');
  if (request.status !== 'pending') {
    throw new HttpError(409, 'That request has already been reviewed.');
  }
  /* Accepts either vocabulary: the pickers send the API's uppercase enum,
       older payloads sent the lowercase aliases. */
  const ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'OPERATOR', 'DRIVER'];
  const asked = String(body?.role ?? '').trim();
  const legacy = { admin: 'ORG_ADMIN', user: 'DRIVER' };
  const role =
    ROLES.find((r) => r === asked.toUpperCase()) ??
    legacy[asked.toLowerCase()] ??
    'DRIVER';
  const applicant = findUser(request.user_id);
  request.status = 'approved';
  request.reviewed_by = user.id;
  request.reviewed_at = iso();
  touch(request);
  if (applicant) {
    applicant.role = role;
    applicant.status = 'approved';
    touch(applicant);
  }
  return { user_id: request.user_id, status: 'approved', role };
};

const rejectRequest = ({ id, body, user }) => {
  const request = db.registrations.find((r) => r.id === id) ?? notFound('Request');
  if (request.status !== 'pending') {
    throw new HttpError(409, 'That request has already been reviewed.');
  }
  const applicant = findUser(request.user_id);
  request.status = 'rejected';
  request.rejection_reason = body?.reason ?? null;
  request.reviewed_by = user.id;
  request.reviewed_at = iso();
  touch(request);
  if (applicant) {
    applicant.status = 'rejected';
    touch(applicant);
  }
  return { user_id: request.user_id, status: 'rejected' };
};

export const registrationRoutes = {
  /* Current paths — what src/api/registrations.js calls. */
  'POST /registration/apply': applyForAccount,
  'GET /registration/status/:id': registrationStatus,
  'GET /admin/registrations': listRequests,
  'POST /admin/registrations/:id/approve': approveRequest,
  'POST /admin/registrations/:id/reject': rejectRequest,

  /* Previous spellings, kept so an older client still resolves. */
  'POST /registration/': applyForAccount,
  'GET /registration/status': registrationStatus,
  'GET /registration/requests': listRequests,
  'POST /registration/:id/approve': approveRequest,
  'POST /registration/:id/reject': rejectRequest,
};

/* ── Machines (fleet) ───────────────────────────────────── */

/*
 * This file stores the fleet in the previous API's vocabulary, and the app
 * asks for it in the current one — /machines rather than /vehicles, with
 * `registration_number`, `machine_type` and an uppercase status. Without a
 * translation every fleet tile read 0 and every vehicle picker was empty,
 * which is not a permission problem or a data problem but this mismatch.
 */
const MACHINE_STATUS_OUT = {
  active: 'AVAILABLE',
  in_trip: 'ON_TRIP',
  maintenance: 'MAINTENANCE',
  inactive: 'RETIRED',
};

const MACHINE_TYPE_OUT = {
  truck: 'TRUCK',
  tipper: 'TRUCK',
  trailer: 'TRUCK',
  tanker: 'TRUCK',
  pickup: 'CAR',
  crane: 'CRANE',
  'hydraulic crane': 'CRANE',
  jcb: 'JCB',
  excavator: 'EXCAVATOR',
  loader: 'LOADER',
};

/** A stored vehicle row as MachineResponse. */
const toMachine = (v) => ({
  id: v.id,
  org_id: v.company_id,
  company_id: v.company_id,
  name: v.registration_no,
  machine_type: MACHINE_TYPE_OUT[String(v.type ?? '').toLowerCase()] ?? 'OTHER',
  registration_number: v.registration_no,
  model_name: v.model_name ?? null,
  manufacturer: v.manufacturer ?? null,
  year_of_manufacture: v.year_of_manufacture ?? null,
  rc_number: v.rc_number ?? null,
  insurance_number: v.insurance_number ?? null,
  insurance_expiry: v.insurance_expiry ?? null,
  capacity_tons: v.capacity_tons ?? null,
  fitness_expiry: v.fitness_expiry ?? null,
  pollution_expiry: v.pollution_expiry ?? null,
  status: MACHINE_STATUS_OUT[v.status] ?? 'AVAILABLE',
  created_at: v.created_at,
  updated_at: v.updated_at,
});

const MACHINE_STATUS_IN = {
  AVAILABLE: 'active',
  ON_TRIP: 'in_trip',
  MAINTENANCE: 'inactive',
  RETIRED: 'inactive',
};

export const machineRoutes = {
  'GET /machines/': ({ user }) =>
    visible(db.vehicles, user)
      .map(toMachine)
      .sort((a, b) => a.registration_number.localeCompare(b.registration_number)),

  'GET /machines/:id': ({ id }) => {
    const row = db.vehicles.find((v) => v.id === id) ?? notFound('Machine');
    return toMachine(row);
  },

  'POST /machines/': ({ body, user }) => {
    if (!body?.name && !body?.registration_number) {
      throw new HttpError(422, [{ loc: ['body', 'name'], msg: 'Name is required' }]);
    }
    const row = {
      id: uid('vehicle'),
      company_id: ownCompany(user),
      registration_no: body.registration_number ?? body.name,
      type: body.machine_type ?? 'OTHER',
      capacity_tons: body.capacity_tons ?? null,
      model_name: body.model_name ?? null,
      manufacturer: body.manufacturer ?? null,
      year_of_manufacture: body.year_of_manufacture ?? null,
      rc_number: body.rc_number ?? null,
      insurance_number: body.insurance_number ?? null,
      rc_expiry: null,
      insurance_expiry: body.insurance_expiry ?? null,
      fitness_expiry: body.fitness_expiry ?? null,
      pollution_expiry: body.pollution_expiry ?? null,
      status: MACHINE_STATUS_IN[body.status] ?? 'active',
      image_url: null,
      created_at: iso(),
      updated_at: iso(),
    };
    db.vehicles.unshift(row);
    return toMachine(row);
  },

  'PUT /machines/:id': ({ id, body }) => {
    const row = db.vehicles.find((v) => v.id === id) ?? notFound('Machine');
    const map = {
      registration_number: 'registration_no',
      machine_type: 'type',
    };
    for (const [key, value] of Object.entries(body ?? {})) {
      if (value === undefined) continue;
      if (key === 'status') {
        row.status = MACHINE_STATUS_IN[value] ?? row.status;
        continue;
      }
      row[map[key] ?? key] = value;
    }
    return toMachine(touch(row));
  },

  'DELETE /machines/:id': ({ id }) => {
    const row = db.vehicles.find((v) => v.id === id) ?? notFound('Machine');
    row.status = 'inactive';
    touch(row);
    return null;
  },
};

/* ── Vehicles ───────────────────────────────────────────── */

export const vehicleRoutes = {
  'GET /vehicles/': ({ params, user }) => {
    const rows = visible(db.vehicles, user)
      .filter((v) => (params.vehicle_status ? v.status === params.vehicle_status : true))
      .filter((v) => (params.vehicle_type ? v.type === params.vehicle_type : true))
      .map(withExpiryStatus)
      .sort((a, b) => a.registration_no.localeCompare(b.registration_no));
    return paginate(rows, params);
  },

  'GET /vehicles/:id': ({ id }) =>
    withExpiryStatus(db.vehicles.find((v) => v.id === id) ?? notFound('Vehicle')),

  'POST /vehicles/': ({ body, user }) => {
    const registration_no = String(body?.registration_no ?? '').trim();
    if (!registration_no) {
      throw new HttpError(422, [
        { loc: ['body', 'registration_no'], msg: 'Registration number is required' },
      ]);
    }
    if (
      db.vehicles.some(
        (v) =>
          v.registration_no.replace(/\s/g, '') === registration_no.replace(/\s/g, ''),
      )
    ) {
      throw new HttpError(409, 'A vehicle with that registration number already exists.');
    }
    const vehicle = {
      id: uid('vehicle'),
      company_id: ownCompany(user),
      registration_no,
      type: body?.type ?? 'Tipper',
      capacity_tons: num(body?.capacity_tons),
      rc_expiry: body?.rc_expiry ?? null,
      insurance_expiry: body?.insurance_expiry ?? null,
      fitness_expiry: body?.fitness_expiry ?? null,
      pollution_expiry: body?.pollution_expiry ?? null,
      status: 'active',
      image_url: null,
      created_at: iso(),
      updated_at: iso(),
    };
    db.vehicles.push(vehicle);
    return withExpiryStatus(vehicle);
  },

  'PUT /vehicles/:id': ({ id, body }) => {
    const vehicle = db.vehicles.find((v) => v.id === id) ?? notFound('Vehicle');
    for (const key of [
      'registration_no',
      'type',
      'capacity_tons',
      'rc_expiry',
      'insurance_expiry',
      'fitness_expiry',
      'pollution_expiry',
      'status',
    ]) {
      if (body && key in body) vehicle[key] = body[key];
    }
    return withExpiryStatus(touch(vehicle));
  },

  /** Soft-deactivates rather than deleting, exactly like the real route. */
  'DELETE /vehicles/:id': ({ id }) => {
    const vehicle = db.vehicles.find((v) => v.id === id) ?? notFound('Vehicle');
    vehicle.status = 'inactive';
    touch(vehicle);
    return null;
  },

  'POST /vehicles/:id/upload-image': ({ id }) => {
    const vehicle = db.vehicles.find((v) => v.id === id) ?? notFound('Vehicle');
    // No object store offline — record a stable placeholder so the UI updates.
    vehicle.image_url = `mock://vehicle-images/${vehicle.id}.jpg`;
    touch(vehicle);
    return withExpiryStatus(vehicle);
  },
};

/* ── Drivers ────────────────────────────────────────────── */

export const driverRoutes = {
  'GET /drivers/': ({ params, user }) => {
    const rows = visible(db.drivers, user)
      .filter((d) =>
        params.availability ? d.availability === params.availability : true,
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    return paginate(rows, params);
  },

  /** Unassigned drivers, for the trip assignment pickers. */
  'GET /drivers/available': ({ user }) =>
    visible(db.drivers, user).filter((d) => d.availability === 'available'),

  'GET /drivers/:id': ({ id }) =>
    db.drivers.find((d) => d.id === id) ?? notFound('Driver'),

  'POST /drivers/': ({ body, user }) => {
    const errors = [];
    if (!body?.full_name)
      errors.push({ loc: ['body', 'full_name'], msg: 'Name is required' });
    if (!/^\d{10}$/.test(String(body?.mobile ?? '')))
      errors.push({
        loc: ['body', 'mobile'],
        msg: 'Enter a valid 10-digit mobile number',
      });
    if (!body?.license_number)
      errors.push({ loc: ['body', 'license_number'], msg: 'Licence number is required' });
    if (errors.length) throw new HttpError(422, errors);

    const driver = {
      id: uid('driver'),
      company_id: ownCompany(user),
      user_id: body.user_id ?? null,
      full_name: body.full_name,
      mobile: body.mobile,
      license_number: body.license_number,
      license_expiry: body.license_expiry ?? null,
      assigned_vehicle_id: body.assigned_vehicle_id ?? null,
      availability: body.availability ?? 'available',
      emergency_contact_name: body.emergency_contact_name ?? null,
      emergency_contact_mobile: body.emergency_contact_mobile ?? null,
      created_at: iso(),
      updated_at: iso(),
    };
    db.drivers.push(driver);
    return driver;
  },

  'PUT /drivers/:id': ({ id, body }) => {
    const driver = db.drivers.find((d) => d.id === id) ?? notFound('Driver');
    for (const key of [
      'full_name',
      'mobile',
      'license_number',
      'license_expiry',
      'assigned_vehicle_id',
      'availability',
      'emergency_contact_name',
      'emergency_contact_mobile',
      'user_id',
    ]) {
      if (body && key in body) driver[key] = body[key];
    }
    return touch(driver);
  },

  'DELETE /drivers/:id': ({ id }) => {
    const index = db.drivers.findIndex((d) => d.id === id);
    if (index < 0) notFound('Driver');
    db.drivers.splice(index, 1);
    return null;
  },
};

/* ── Trips ──────────────────────────────────────────────── */

const RATE = { base: 4000, perKm: 40, perTon: 200, perWaitingHour: 350, gst: 18 };

/** The fare arithmetic the real service does server-side. */
function priceTrip(trip, over = {}) {
  const distance_km = num(over.distance_km ?? trip.distance_km, 0) ?? 0;
  const weight_tons = num(over.weight_tons ?? trip.weight_tons, 0) ?? 0;
  const waiting_hours = num(over.waiting_hours, 0) ?? 0;
  const base_fare = num(trip.base_fare, RATE.base) ?? RATE.base;
  const gst_rate = num(over.gst_rate ?? trip.gst_rate, RATE.gst) ?? RATE.gst;
  const toll_charge = num(over.toll_charge ?? trip.toll_charge, 0) ?? 0;
  const extra_charge = num(over.extra_charge ?? trip.extra_charge, 0) ?? 0;

  const distance_charge = Math.round(distance_km * RATE.perKm);
  const weight_charge = Math.round(weight_tons * RATE.perTon);
  const waiting_charge = Math.round(waiting_hours * RATE.perWaitingHour);
  const subtotal =
    base_fare +
    distance_charge +
    weight_charge +
    waiting_charge +
    toll_charge +
    extra_charge;
  const gst_amount = Math.round((subtotal * gst_rate) / 100);

  return {
    distance_km,
    weight_tons,
    base_fare,
    distance_charge,
    weight_charge,
    waiting_charge,
    toll_charge,
    extra_charge,
    gst_rate,
    gst_amount,
    final_amount: subtotal + gst_amount,
  };
}

const setAvailability = (trip, availability, vehicleStatus) => {
  const driver = db.drivers.find((d) => d.id === trip.driver_id);
  if (driver) {
    driver.availability = availability;
    touch(driver);
  }
  const vehicle = db.vehicles.find((v) => v.id === trip.vehicle_id);
  if (vehicle && vehicle.status !== 'inactive') {
    vehicle.status = vehicleStatus;
    touch(vehicle);
  }
};

function filterTrips(rows, params) {
  return rows
    .filter((t) => (params.trip_status ? t.status === params.trip_status : true))
    .filter((t) => (params.vehicle_id ? t.vehicle_id === params.vehicle_id : true))
    .filter((t) => (params.driver_id ? t.driver_id === params.driver_id : true))
    .filter((t) => (params.client_id ? t.client_id === params.client_id : true))
    .filter((t) => (params.date_from ? t.created_at >= params.date_from : true))
    .filter((t) => (params.date_to ? t.created_at <= params.date_to : true))
    .sort(newest);
}

export const tripRoutes = {
  'GET /trips/': ({ params, user }) =>
    paginate(filterTrips(visible(db.trips, user), params), params),

  /** The signed-in driver's own trips — powers the driver app. */
  'GET /trips/my': ({ params, user }) => {
    const driver = db.drivers.find((d) => d.user_id === user.id);
    const rows = driver ? db.trips.filter((t) => t.driver_id === driver.id) : [];
    return paginate(filterTrips(rows, params), params);
  },

  'GET /trips/:id': ({ id }) => db.trips.find((t) => t.id === id) ?? notFound('Trip'),

  'POST /trips/': ({ body, user }) => {
    const draft = {
      id: uid('trip'),
      company_id: ownCompany(user),
      vehicle_id: body?.vehicle_id ?? null,
      driver_id: body?.driver_id ?? null,
      client_id: body?.client_id ?? null,
      origin: body?.origin ?? null,
      destination: body?.destination ?? null,
      load_details: body?.load_details ?? null,
      base_fare: num(body?.base_fare, RATE.base),
      status: 'upcoming',
      started_at: null,
      reached_at: null,
      completed_at: null,
      notes: body?.notes ?? null,
      created_by: user.id,
      created_at: iso(),
      updated_at: iso(),
      distance_km: num(body?.distance_km, 0),
      weight_tons: num(body?.weight_tons, 0),
      toll_charge: num(body?.toll_charge, 0),
      extra_charge: num(body?.extra_charge, 0),
      gst_rate: num(body?.gst_rate, RATE.gst),
    };
    const trip = { ...draft, ...priceTrip(draft) };
    db.trips.push(trip);
    return trip;
  },

  /** upcoming → in_progress → driver_reached → completed, plus cancelled. */
  'PUT /trips/:id/status': ({ id, body }) => {
    const trip = db.trips.find((t) => t.id === id) ?? notFound('Trip');
    const next = body?.status;
    const allowed = [
      'upcoming',
      'in_progress',
      'driver_reached',
      'completed',
      'cancelled',
    ];
    if (!allowed.includes(next))
      throw new HttpError(422, `Unknown trip status "${next}".`);

    trip.status = next;
    if (next === 'in_progress') {
      trip.started_at = trip.started_at ?? iso();
      setAvailability(trip, 'on_trip', 'in_trip');
    }
    if (next === 'driver_reached') trip.reached_at = trip.reached_at ?? iso();
    if (next === 'completed') {
      trip.completed_at = trip.completed_at ?? iso();
      setAvailability(trip, 'available', 'active');
    }
    if (next === 'cancelled') setAvailability(trip, 'available', 'active');
    return touch(trip);
  },

  /** Finalises the money once a trip is done. */
  'POST /trips/:id/settle': ({ id, body }) => {
    const trip = db.trips.find((t) => t.id === id) ?? notFound('Trip');
    Object.assign(trip, priceTrip(trip, body ?? {}));
    trip.status = 'completed';
    trip.completed_at = trip.completed_at ?? iso();
    setAvailability(trip, 'available', 'active');
    return touch(trip);
  },

  'POST /trips/:id/receipt': ({ id, body }) => {
    const trip = db.trips.find((t) => t.id === id) ?? notFound('Trip');
    const receipt = {
      id: uid('receipt'),
      trip_id: trip.id,
      receiver_name: body?.receiver_name ?? null,
      received_at: iso(),
      image_url: body?.image_url ?? null,
      created_at: iso(),
    };
    db.receipts = db.receipts.filter((r) => r.trip_id !== trip.id);
    db.receipts.push(receipt);
    return receipt;
  },

  'GET /trips/:id/receipt': ({ id }) =>
    db.receipts.find((r) => r.trip_id === id) ?? notFound('Receipt'),
};

/* ── Challans ───────────────────────────────────────────── */

const HOURLY_RATE = 950;

export const challanRoutes = {
  'GET /challans/': ({ params, user }) =>
    paginate([...visible(db.challans, user)].sort(newest), params),

  'GET /challans/:id': ({ id }) =>
    db.challans.find((c) => c.id === id) ?? notFound('Challan'),

  /** Running hours per vehicle for a day, compiled into one challan. */
  'POST /challans/': ({ body, user }) => {
    const rows = Array.isArray(body?.items) ? body.items : [];
    if (!rows.length) {
      throw new HttpError(422, [
        { loc: ['body', 'items'], msg: 'Add at least one vehicle line' },
      ]);
    }
    const items = rows.map((row) => ({
      id: uid('challan-item'),
      vehicle_id: row.vehicle_id ?? null,
      driver_id: row.driver_id ?? null,
      running_hours: num(row.running_hours, 0) ?? 0,
      amount: Math.round((num(row.running_hours, 0) ?? 0) * HOURLY_RATE),
    }));
    const challan = {
      id: uid('challan'),
      company_id: ownCompany(user),
      client_id: body?.client_id ?? null,
      challan_date: body?.challan_date ?? day(0),
      total_hours: items.reduce((sum, i) => sum + i.running_hours, 0),
      total_amount: items.reduce((sum, i) => sum + i.amount, 0),
      status: 'draft',
      sms_sent_at: null,
      pdf_url: null,
      items,
      created_at: iso(),
      updated_at: iso(),
    };
    db.challans.push(challan);
    return challan;
  },

  /** Fires the day's SMS to the client. Returns a message, not the challan. */
  'POST /challans/:id/notify': ({ id }) => {
    const challan = db.challans.find((c) => c.id === id) ?? notFound('Challan');
    challan.status = challan.status === 'draft' ? 'sent' : challan.status;
    challan.sms_sent_at = iso();
    touch(challan);
    return { message: 'SMS queued for the client.' };
  },
};

/* ── Invoices ───────────────────────────────────────────── */

function postToLedger(client_id, entry_type, amount, over = {}) {
  const prior = db.ledger.filter((row) => row.client_id === client_id).sort(newest)[0];
  const balance_before = prior ? prior.balance_after : 0;
  const entry = {
    id: uid('ledger'),
    company_id: over.company_id ?? null,
    client_id,
    entry_type,
    amount,
    balance_after:
      entry_type === 'credit' ? balance_before - amount : balance_before + amount,
    reference_id: over.reference_id ?? null,
    reference_type: over.reference_type ?? null,
    notes: over.notes ?? null,
    created_at: iso(),
  };
  db.ledger.push(entry);
  return entry;
}

export const invoiceRoutes = {
  'GET /invoices/': ({ params, user }) =>
    paginate([...visible(db.invoices, user)].sort(newest), params),

  'GET /invoices/:id': ({ id }) =>
    db.invoices.find((i) => i.id === id) ?? notFound('Invoice'),

  'POST /invoices/': ({ body, user }) => {
    const rows = Array.isArray(body?.items) ? body.items : [];
    const errors = [];
    if (!body?.client_id)
      errors.push({ loc: ['body', 'client_id'], msg: 'Choose a client' });
    if (!rows.length)
      errors.push({ loc: ['body', 'items'], msg: 'Add at least one line' });
    if (errors.length) throw new HttpError(422, errors);

    const items = rows.map((row) => ({
      id: uid('invoice-item'),
      description: row.description ?? 'Charge',
      amount: num(row.amount, 0) ?? 0,
      trip_id: row.trip_id ?? null,
      challan_id: row.challan_id ?? null,
    }));
    const total_amount = items.reduce((sum, i) => sum + i.amount, 0);
    const gst_percentage = num(body?.gst_percentage, 18) ?? 18;
    const tds_percentage = num(body?.tds_percentage, 0) ?? 0;
    const gst_amount = Math.round((total_amount * gst_percentage) / 100);
    const tds_amount = Math.round((total_amount * tds_percentage) / 100);

    const year = new Date().getFullYear();
    const invoice = {
      id: uid('invoice'),
      company_id: ownCompany(user),
      client_id: body.client_id,
      invoice_number: `INV-${year}-${String(db.invoices.length + 1).padStart(4, '0')}`,
      status: 'pending',
      total_amount,
      gst_amount,
      tds_amount,
      final_amount: total_amount + gst_amount - tds_amount,
      paid_amount: 0,
      due_date: body?.due_date ?? null,
      notes: body?.notes ?? null,
      pdf_url: null,
      items,
      created_at: iso(),
      updated_at: iso(),
    };
    db.invoices.push(invoice);

    postToLedger(invoice.client_id, 'debit', invoice.final_amount, {
      company_id: invoice.company_id,
      reference_id: invoice.id,
      reference_type: 'invoice',
      notes: `${invoice.invoice_number} raised`,
    });

    if (tds_amount > 0) {
      db.tds.push({
        id: uid('tds'),
        company_id: invoice.company_id,
        client_id: invoice.client_id,
        invoice_id: invoice.id,
        financial_year: `${year}-${String((year + 1) % 100).padStart(2, '0')}`,
        tds_percentage,
        deducted_amount: tds_amount,
        certificate_number: null,
        certificate_url: null,
        created_at: iso(),
        updated_at: iso(),
      });
    }
    return invoice;
  },

  'PUT /invoices/:id/status': ({ id, body }) => {
    const invoice = db.invoices.find((i) => i.id === id) ?? notFound('Invoice');
    if (body?.status) invoice.status = body.status;
    if (body?.paid_amount !== undefined) {
      invoice.paid_amount = num(body.paid_amount, invoice.paid_amount) ?? 0;
    }
    return touch(invoice);
  },
};

/* ── Quotations ─────────────────────────────────────────── */

export const quotationRoutes = {
  'GET /quotations/': ({ params, user }) =>
    paginate([...visible(db.quotations, user)].sort(newest), params),

  'GET /quotations/:id': ({ id }) =>
    db.quotations.find((q) => q.id === id) ?? notFound('Quotation'),

  'POST /quotations/': ({ body, user }) => {
    const year = new Date().getFullYear();
    const quotation = {
      id: uid('quotation'),
      quotation_number: `QTN-${year}-${String(db.quotations.length + 1).padStart(4, '0')}`,
      company_id: ownCompany(user),
      client_id: body?.client_id ?? null,
      machine_type: body?.machine_type ?? null,
      package_details: body?.package_details ?? null,
      base_rate: num(body?.base_rate),
      per_km_rate: num(body?.per_km_rate),
      per_ton_rate: num(body?.per_ton_rate),
      total_rate: num(body?.total_rate),
      validity_date: body?.validity_date ?? null,
      custom_terms: body?.custom_terms ?? null,
      status: 'draft',
      trip_id: null,
      created_at: iso(),
      updated_at: iso(),
    };
    db.quotations.push(quotation);
    return quotation;
  },

  'PUT /quotations/:id/status': ({ id, body }) => {
    const quotation = db.quotations.find((q) => q.id === id) ?? notFound('Quotation');
    const allowed = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    if (!allowed.includes(body?.status)) {
      throw new HttpError(422, `Unknown quotation status "${body?.status}".`);
    }
    quotation.status = body.status;
    return touch(quotation);
  },
};

/* ── Ledger ─────────────────────────────────────────────── */

export const ledgerRoutes = {
  /** Statement for one client, newest first. */
  'GET /ledger/:id': ({ id, params }) =>
    paginate(db.ledger.filter((row) => row.client_id === id).sort(newest), params),

  'POST /ledger/:id/payment': ({ id, body, user }) => {
    const amount = num(body?.amount, 0) ?? 0;
    if (amount <= 0) {
      throw new HttpError(422, [
        { loc: ['body', 'amount'], msg: 'Enter an amount greater than zero' },
      ]);
    }
    const entry = postToLedger(id, 'credit', amount, {
      company_id: ownCompany(user),
      reference_id: body?.invoice_id ?? null,
      reference_type: 'payment',
      notes:
        body?.notes ??
        [body?.payment_mode, body?.reference_no].filter(Boolean).join(' · ') ??
        null,
    });

    // Settling against an invoice moves that invoice's status too.
    const invoice = body?.invoice_id
      ? db.invoices.find((i) => i.id === body.invoice_id)
      : db.invoices
          .filter((i) => i.client_id === id && i.paid_amount < i.final_amount)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
    if (invoice) {
      invoice.paid_amount = Math.min(invoice.final_amount, invoice.paid_amount + amount);
      invoice.status = invoice.paid_amount >= invoice.final_amount ? 'paid' : 'partial';
      touch(invoice);
    }
    return entry;
  },
};

/* ── TDS ────────────────────────────────────────────────── */

/* ── Driver collections ─────────────────────────────────── */

export const collectionRoutes = {
  'GET /driver-collections/': ({ params, user }) => {
    const rows = visible(db.collections, user)
      .filter((r) => (params.driver_id ? r.driver_id === params.driver_id : true))
      .sort(
        (a, b) => new Date(b.collection_date ?? 0) - new Date(a.collection_date ?? 0),
      );
    return rows;
  },

  'GET /driver-collections/:id': ({ id }) =>
    db.collections.find((r) => r.id === id) ?? notFound('Collection'),

  'POST /driver-collections/': ({ body, user }) => {
    const errors = [];
    if (!body?.driver_id)
      errors.push({ loc: ['body', 'driver_id'], msg: 'Driver is required' });
    if (!body?.collection_date)
      errors.push({ loc: ['body', 'collection_date'], msg: 'Date is required' });
    if (!(Number(body?.amount) > 0))
      errors.push({ loc: ['body', 'amount'], msg: 'Enter an amount greater than zero' });
    if (!body?.payment_mode)
      errors.push({ loc: ['body', 'payment_mode'], msg: 'Payment mode is required' });
    if (errors.length) throw new HttpError(422, errors);

    const row = {
      id: uid('collection'),
      company_id: ownCompany(user),
      driver_id: body.driver_id,
      trip_id: body.trip_id ?? null,
      collection_date: body.collection_date,
      amount: Number(body.amount),
      payment_mode: body.payment_mode,
      reference_no: body.reference_no ?? null,
      notes: body.notes ?? null,
      created_by: user.id,
      created_at: iso(),
      updated_at: iso(),
    };
    db.collections.unshift(row);
    return row;
  },

  'PUT /driver-collections/:id': ({ id, body }) => {
    const row = db.collections.find((r) => r.id === id) ?? notFound('Collection');
    if (body?.amount !== undefined && !(Number(body.amount) > 0)) {
      throw new HttpError(422, [
        { loc: ['body', 'amount'], msg: 'Enter an amount greater than zero' },
      ]);
    }
    /* The service applies model_dump(exclude_unset=True): a key that is absent
       is left alone, a key sent as null clears the column. */
    for (const [key, value] of Object.entries(body ?? {})) {
      if (value === undefined) continue;
      row[key] = key === 'amount' ? Number(value) : value;
    }
    return touch(row);
  },

  'DELETE /driver-collections/:id': ({ id }) => {
    const index = db.collections.findIndex((r) => r.id === id);
    if (index < 0) notFound('Collection');
    db.collections.splice(index, 1);
    return null;
  },
};

/* ── Expenses ───────────────────────────────────────────── */

export const expenseRoutes = {
  /*
   * The real route takes no filters — it returns the caller's whole
   * organisation and the screen narrows it.
   *
   * ExpenseListResponse carries five fields and no more: no machine_id,
   * driver_id or notes. Returning the whole row here would let a screen read
   * fields the real service never sends, so the projection is deliberate —
   * anything needing the rest has to fetch the row by id.
   */
  'GET /expenses/': ({ user }) =>
    visible(db.expenses, user)
      .sort((a, b) => new Date(b.expense_date ?? 0) - new Date(a.expense_date ?? 0))
      .map(({ id, title, category, amount, expense_date }) => ({
        id,
        title,
        category,
        amount,
        expense_date,
      })),

  'GET /expenses/:id': ({ id }) =>
    db.expenses.find((r) => r.id === id) ?? notFound('Expense'),

  'POST /expenses/': ({ body, user }) => {
    const errors = [];
    if (!body?.title) errors.push({ loc: ['body', 'title'], msg: 'Title is required' });
    if (!body?.expense_date)
      errors.push({ loc: ['body', 'expense_date'], msg: 'Date is required' });
    if (!(Number(body?.amount) > 0))
      errors.push({ loc: ['body', 'amount'], msg: 'Enter an amount greater than zero' });
    if (errors.length) throw new HttpError(422, errors);

    const machine = db.vehicles.find((v) => v.id === body.machine_id);
    const driver = db.drivers.find((d) => d.id === body.driver_id);
    const row = {
      id: uid('expense'),
      org_id: ownCompany(user),
      company_id: ownCompany(user),
      title: body.title,
      category: body.category ?? 'OTHER',
      amount: Number(body.amount),
      expense_date: body.expense_date,
      notes: body.notes ?? null,
      machine_id: body.machine_id ?? null,
      driver_id: body.driver_id ?? null,
      machine_name: machine?.registration_no ?? null,
      driver_name: driver?.full_name ?? null,
      created_at: iso(),
      updated_at: iso(),
    };
    db.expenses.unshift(row);
    return row;
  },

  'PUT /expenses/:id': ({ id, body }) => {
    const row = db.expenses.find((r) => r.id === id) ?? notFound('Expense');
    if (body?.amount !== undefined && !(Number(body.amount) > 0)) {
      throw new HttpError(422, [
        { loc: ['body', 'amount'], msg: 'Enter an amount greater than zero' },
      ]);
    }
    for (const [key, value] of Object.entries(body ?? {})) {
      if (value === undefined) continue;
      row[key] = key === 'amount' ? Number(value) : value;
    }
    // The response carries the resolved names, so refresh them on a relink.
    row.machine_name =
      db.vehicles.find((v) => v.id === row.machine_id)?.registration_no ?? null;
    row.driver_name = db.drivers.find((d) => d.id === row.driver_id)?.full_name ?? null;
    return touch(row);
  },

  'DELETE /expenses/:id': ({ id }) => {
    const index = db.expenses.findIndex((r) => r.id === id);
    if (index < 0) notFound('Expense');
    db.expenses.splice(index, 1);
    return null;
  },
};

export const tdsRoutes = {
  'GET /tds/': ({ params, user }) =>
    paginate([...visible(db.tds, user)].sort(newest), params),

  'GET /tds/:id': ({ id }) => db.tds.find((r) => r.id === id) ?? notFound('TDS record'),

  'POST /tds/': ({ body, user }) => {
    const record = {
      id: uid('tds'),
      company_id: ownCompany(user),
      client_id: body?.client_id ?? null,
      invoice_id: body?.invoice_id ?? null,
      financial_year: body?.financial_year ?? '2026-27',
      tds_percentage: num(body?.tds_percentage, 2) ?? 2,
      deducted_amount: num(body?.deducted_amount, 0) ?? 0,
      certificate_number: body?.certificate_number ?? null,
      certificate_url: null,
      created_at: iso(),
      updated_at: iso(),
    };
    db.tds.push(record);
    return record;
  },

  'PUT /tds/:id': ({ id, body }) => {
    const record = db.tds.find((r) => r.id === id) ?? notFound('TDS record');
    record.certificate_number = body?.certificate_number ?? null;
    return touch(record);
  },
};

/* ── Reports ────────────────────────────────────────────── */

const inWindow = (row, params) => {
  if (params.start_date && row.created_at < params.start_date) return false;
  if (params.end_date && row.created_at > params.end_date) return false;
  return true;
};

export const reportRoutes = {
  /** Revenue is billed, not collected — the sum of invoice final_amount. */
  'GET /reports/revenue': ({ params, user }) => {
    const rows = visible(db.invoices, user)
      .filter((i) => i.status !== 'cancelled')
      .filter((i) => inWindow(i, params));
    return {
      total_revenue: rows.reduce((sum, i) => sum + Number(i.final_amount ?? 0), 0),
      breakdown: [],
    };
  },

  'GET /reports/trips': ({ params, user }) => {
    const rows = visible(db.trips, user).filter((t) => inWindow(t, params));
    const breakdown = rows.reduce((acc, trip) => {
      acc[trip.status] = (acc[trip.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total_trips: rows.length,
      completed: breakdown.completed ?? 0,
      cancelled: breakdown.cancelled ?? 0,
      in_progress: (breakdown.in_progress ?? 0) + (breakdown.driver_reached ?? 0),
      breakdown,
    };
  },
};

/* ── The table the adapter dispatches against ───────────── */

/** Public routes are the ones reachable before there is a session. */
/**
 * Reachable without a session. Applying for an account and checking on it are
 * both things you do before you have one.
 *
 * Keyed on the route as written in the table, so every spelling a handler is
 * registered under needs its own entry — listing only the previous paths is
 * what turned "No mock route for POST /registration/apply" into the equally
 * wrong "Not authenticated".
 */
export const PUBLIC_ROUTES = new Set([
  'POST /auth/request-otp',
  'POST /auth/verify-otp',
  'POST /auth/refresh',
  'POST /auth/logout',
  'POST /registration/apply',
  'GET /registration/status/:id',
  'POST /registration/',
  'GET /registration/status',
]);

export const routes = {
  ...authRoutes,
  ...userRoutes,
  ...registrationRoutes,
  ...machineRoutes,
  ...vehicleRoutes,
  ...driverRoutes,
  ...tripRoutes,
  ...challanRoutes,
  ...invoiceRoutes,
  ...quotationRoutes,
  ...ledgerRoutes,
  ...tdsRoutes,
  ...collectionRoutes,
  ...expenseRoutes,
  ...reportRoutes,
};
