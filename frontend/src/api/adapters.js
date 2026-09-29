/**
 * Translation layer between the RentTrace API and the shapes these screens
 * were written against.
 *
 * Two things differ everywhere, and both made the UI read as empty rather than
 * as broken — which is why the dashboard tiles sat at 0 while the API was
 * happily returning 200s:
 *
 *  1. **Envelope.** Every list route returns a bare JSON array
 *     (`List[...Response]`). The hooks and screens expect the paginated
 *     envelope `{ items, total, page, page_size, pages }` and read
 *     `data.items`, which on an array is `undefined`.
 *
 *  2. **Vocabulary.** The API calls a vehicle a "machine", a driver's name
 *     `name`, and serves every enum in UPPERCASE (`AVAILABLE`, `IN_PROGRESS`).
 *     The screens use `registration_no`, `full_name` and lowercase enums.
 *
 * Keeping the translation here means no hook, component or screen has to know
 * the API's vocabulary — and swapping either side later is a change to this
 * one file.
 */

/** Wraps a bare array in the paginated envelope the hooks expect. */
export function toPage(rows, params = {}) {
  const items = Array.isArray(rows) ? rows : (rows?.items ?? []);
  // A response that is already paginated passes straight through.
  if (!Array.isArray(rows) && rows && typeof rows === 'object' && 'items' in rows) {
    return rows;
  }
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || items.length || 20;
  return {
    items,
    total: items.length,
    page,
    page_size,
    pages: Math.max(1, Math.ceil(items.length / (page_size || 1))),
  };
}

const lower = (value) => (value == null ? null : String(value).toLowerCase());

/* ── Fleet ──────────────────────────────────────────────── */

/** The server's VehicleStatus (active|inactive|in_trip) → the edit form's value. */
const VEHICLE_FORM_STATUS = {
  active: 'AVAILABLE',
  inactive: 'MAINTENANCE',
  in_trip: 'ON_TRIP',
};

/** A /vehicles row as the fleet screens expect it. */
export function adaptVehicle(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return vehicle;
  return {
    ...vehicle,
    company_id: vehicle.company_id ?? null,
    registration_no: vehicle.registration_no ?? '—',
    type: vehicle.type ?? null,
    capacity_tons: vehicle.capacity_tons ?? null,
    // Already the display vocabulary: active | inactive | in_trip.
    status: lower(vehicle.status),
    // The edit form's status control speaks AVAILABLE / MAINTENANCE.
    api_status: VEHICLE_FORM_STATUS[lower(vehicle.status)] ?? null,
    rc_number: vehicle.rc_number ?? null,
    insurance_number: vehicle.insurance_number ?? null,
    insurance_expiry: vehicle.insurance_expiry ?? null,
    fitness_expiry: vehicle.fitness_expiry ?? null,
    pollution_expiry: vehicle.pollution_expiry ?? null,
    rc_document_url: vehicle.rc_document_url ?? null,
    insurance_document_url: vehicle.insurance_document_url ?? null,
    fitness_document_url: vehicle.fitness_document_url ?? null,
    puc_document_url: vehicle.puc_document_url ?? null,
  };
}

/* ── Crew ───────────────────────────────────────────────── */

/** DriverAvailability (AVAILABLE|ON_TRIP|UNAVAILABLE) → the UI's values. */
const DRIVER_AVAILABILITY = {
  AVAILABLE: 'available',
  ON_TRIP: 'on_trip',
  UNAVAILABLE: 'off_duty',
};

export function adaptDriver(driver) {
  if (!driver || typeof driver !== 'object') return driver;
  return {
    ...driver,
    id: driver.id,
    company_id: driver.org_id ?? driver.company_id ?? null,
    full_name: driver.name ?? driver.full_name ?? '—',
    mobile: driver.phone ?? driver.mobile ?? null,
    license_number: driver.license_number ?? null,
    license_expiry: driver.license_expiry ?? null,
    address: driver.address ?? null,
    assigned_vehicle_id: driver.assigned_machine_id ?? driver.assigned_vehicle_id ?? null,
    availability:
      DRIVER_AVAILABILITY[driver.availability_status] ??
      lower(driver.availability_status ?? driver.availability),
    status: lower(driver.status),
  };
}

/* ── Trips ──────────────────────────────────────────────── */

/**
 * TripStatus. The API models the assignment handshake as its own states
 * (ASSIGNED, DRIVER_ACCEPTED); the UI's tracker only knows the four stages, so
 * everything before departure reads as "upcoming".
 */
const TRIP_STATUS = {
  DRAFT: 'upcoming',
  SCHEDULED: 'upcoming',
  ASSIGNED: 'upcoming',
  DRIVER_ACCEPTED: 'upcoming',
  IN_PROGRESS: 'in_progress',
  DRIVER_REACHED: 'driver_reached',
  COMPLETED: 'completed',
  DRIVER_REJECTED: 'cancelled',
  CANCELLED: 'cancelled',
};

/* ── Reports ────────────────────────────────────────────── */

/**
 * TripReportResponse is { total, completed, ongoing, scheduled, cancelled,
 * by_status }. The screens read `total_trips` and a `breakdown` keyed by the
 * UI's own lowercase statuses, so both are derived here — the dashboard tile
 * read 0 and the "Trips by Status" donut was empty purely because of the
 * different names.
 */
export function adaptTripReport(report) {
  if (!report || typeof report !== 'object') return report;
  const breakdown = {};
  for (const [apiStatus, count] of Object.entries(report.by_status ?? {})) {
    const key = TRIP_STATUS[apiStatus] ?? lower(apiStatus);
    // Several API statuses collapse onto one UI status (DRAFT, SCHEDULED,
    // ASSIGNED and DRIVER_ACCEPTED are all "upcoming"), so counts accumulate.
    breakdown[key] = (breakdown[key] ?? 0) + Number(count ?? 0);
  }
  return {
    ...report,
    total_trips: report.total ?? report.total_trips ?? 0,
    completed: report.completed ?? 0,
    breakdown,
  };
}

/* ── Billing ────────────────────────────────────────────── */

/**
 * The API calls an invoice's rows `line_items`; the screens read `items`,
 * which is why every invoice showed "0 lines". InvoiceStatus is already
 * lowercase, so the status passes straight through.
 */
export function adaptInvoice(invoice) {
  if (!invoice || typeof invoice !== 'object') return invoice;
  const items = Array.isArray(invoice.line_items)
    ? invoice.line_items
    : (invoice.items ?? []);
  return {
    ...invoice,
    company_id: invoice.company_id ?? invoice.org_id ?? null,
    items,
  };
}

/* ── Ledger ─────────────────────────────────────────────── */

/**
 * LedgerEntryType is debit|credit|invoice|payment. An invoice adds to what the
 * client owes; a payment settles it. The screens only knew 'credit', so a
 * recorded payment was counted as a debit and the statement read "paid in
 * advance" when money had actually come in.
 */
const DEBIT_TYPES = new Set(['debit', 'invoice']);

export const isCreditEntry = (entryType) => !DEBIT_TYPES.has(lower(entryType));

/**
 * Adds the running balance the statement screen shows. The API stores entries
 * individually and has no `balance_after`, so it is accumulated here — oldest
 * first for the arithmetic, then handed back newest-first the way the screen
 * lists them. Also maps `note`/`reference_no` onto the names the screen reads.
 */
export function adaptLedger(rows) {
  const entries = Array.isArray(rows) ? rows : [];
  const oldestFirst = [...entries].sort(
    (a, b) => new Date(a.entry_date ?? 0) - new Date(b.entry_date ?? 0),
  );
  let balance = 0;
  const withBalance = new Map();
  for (const entry of oldestFirst) {
    const amount = Number(entry.amount ?? 0);
    balance += DEBIT_TYPES.has(lower(entry.entry_type)) ? amount : -amount;
    withBalance.set(entry.id, Math.round(balance * 100) / 100);
  }
  return oldestFirst.reverse().map((entry) => ({
    ...entry,
    entry_type: lower(entry.entry_type),
    is_credit: isCreditEntry(entry.entry_type),
    notes: entry.note ?? entry.notes ?? null,
    reference_type: entry.reference_no ?? entry.reference_type ?? null,
    balance_after: withBalance.get(entry.id) ?? 0,
  }));
}

/* ── Challans ───────────────────────────────────────────── */

/**
 * ChallanStatus (uppercase) → the three tabs the list screen offers.
 * BILLED and INVOICED are both past approval, so they read as approved.
 */
const CHALLAN_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'sent',
  APPROVED: 'approved',
  BILLED: 'approved',
  INVOICED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

/** The reverse, for writes. 'sent' is SUBMITTED — there is no SENT. */
const CHALLAN_STATUS_PAYLOAD = {
  draft: 'DRAFT',
  sent: 'SUBMITTED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
};

export function toChallanStatusPayload(status) {
  const key = String(status ?? '').toLowerCase();
  return CHALLAN_STATUS_PAYLOAD[key] ?? String(status ?? '').toUpperCase();
}

/**
 * The API stores one amount and one hours figure per challan (`amount`,
 * `hours_worked`); the screens total them up under `total_amount` and
 * `total_hours`, which is why every challan row read 0.
 */
export function adaptChallan(challan) {
  if (!challan || typeof challan !== 'object') return challan;
  const items = Array.isArray(challan.items) ? challan.items : [];
  // When line items are present they are the authoritative breakdown.
  const hours = items.length
    ? items.reduce((sum, item) => sum + Number(item.running_hours ?? 0), 0)
    : Number(challan.hours_worked ?? 0);
  const amount = items.length
    ? items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
    : Number(challan.amount ?? 0);
  return {
    ...challan,
    company_id: challan.company_id ?? challan.org_id ?? null,
    status: CHALLAN_STATUS[challan.status] ?? lower(challan.status),
    total_hours: hours,
    total_amount: amount,
    items,
  };
}

/**
 * UI status → TripStatus for writes. adaptTrip maps the API's uppercase enum
 * down to the screens' vocabulary; this is the other direction, needed because
 * PATCH /trips/{id} validates against the enum and rejects lowercase.
 *
 * The driver app steps Started -> Reached -> Received, and each maps onto a
 * TripStatus of its own.
 */
export function toTripStatusPayload(status) {
  const MAP = {
    upcoming: 'SCHEDULED',
    in_progress: 'IN_PROGRESS',
    driver_reached: 'DRIVER_REACHED',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
  };
  return MAP[status] ?? String(status ?? '').toUpperCase();
}

export function adaptTrip(trip) {
  if (!trip || typeof trip !== 'object') return trip;
  const status = TRIP_STATUS[trip.status] ?? lower(trip.status);
  return {
    ...trip,
    id: trip.id,
    // Several API statuses collapse into 'upcoming', but a driver has to tell
    // ASSIGNED (awaiting their accept/reject) from DRIVER_ACCEPTED (theirs to
    // start), so the original is kept alongside.
    api_status: trip.status ?? null,
    company_id: trip.org_id ?? trip.company_id ?? null,
    // The list route sends names, not ids, plus a code the detail screen shows.
    origin: trip.pickup_location ?? trip.origin ?? trip.site_location ?? null,
    destination: trip.destination ?? trip.site_location ?? null,
    client_id: trip.client_id ?? null,
    client_name: trip.client_name ?? null,
    driver_id: trip.driver_id ?? null,
    driver_name: trip.driver_name ?? null,
    vehicle_id: trip.vehicle_id ?? trip.machine_id ?? null,
    vehicle_registration: trip.vehicle_registration ?? null,
    status,
    started_at:
      trip.started_at ?? (status === 'upcoming' ? null : (trip.start_at ?? null)),
    completed_at:
      trip.completed_at ?? (status === 'completed' ? (trip.end_at ?? null) : null),
    // The cards date a trip by `started_at ?? created_at`, and the list route
    // sends neither — only the scheduled `start_at`. Without this every
    // upcoming row rendered its date block as "—".
    created_at: trip.created_at ?? trip.start_at ?? null,
    // TripCreate schedules on scheduled_at and carries the rest in load_details.
    start_at: trip.start_at ?? trip.scheduled_at ?? null,
    end_at: trip.end_at ?? trip.load_details?.end_at ?? null,
    material: trip.material ?? trip.load_details?.material ?? null,
    final_amount: trip.total_amount ?? trip.final_amount ?? null,
  };
}

/** Maps a list payload through an adapter and returns the paginated envelope. */
export const pageOf = (rows, adapt, params) => {
  const page = toPage(rows, params);
  return { ...page, items: page.items.map(adapt) };
};

/* ── Writes ─────────────────────────────────────────────── */


/**
 * Drops keys whose value is undefined or an empty string.
 *
 * The services apply updates with `model_dump(exclude_unset=True)`, so a key
 * that is absent is left alone while a key sent as `null` overwrites the stored
 * value with null. An untouched optional input must therefore be omitted, not
 * sent empty — otherwise editing a vehicle's capacity silently cleared its
 * insurance number. `null` is passed through deliberately: that is how a screen
 * asks for a field to be cleared.
 */
function withoutBlanks(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
  );
}

/** A trimmed string, or undefined so withoutBlanks() drops the key. */
const text = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' || trimmed == null ? undefined : trimmed;
};

/** A finite number, or undefined. Guards against `Number('') === 0`. */
const number = (value) => {
  if (value === '' || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The edit form's status to the server's VehicleStatus.
 *
 * ON_TRIP is deliberately absent: the trip lifecycle sets it, and offering it
 * as a manual choice would let the fleet screen contradict the trip screen.
 */
const VEHICLE_API_STATUS = {
  AVAILABLE: 'active',
  MAINTENANCE: 'inactive',
  RETIRED: 'inactive',
};

/**
 * The vehicle form to the /vehicles create/update body.
 *
 * The API stores `type` as free text and has no model, manufacturer or year
 * columns, so those form fields are not sent.
 */
export function toMachinePayload(values = {}) {
  const registration = String(values.registration_no ?? '')
    .trim()
    .toUpperCase();
  return withoutBlanks({
    // Absent on update: the registration is immutable once set.
    registration_no: registration || undefined,
    type: text(values.type),
    capacity_tons: number(values.capacity_tons) ?? null,
    rc_number: text(values.rc_number),
    insurance_number: text(values.insurance_number),
    insurance_expiry: values.insurance_expiry || null,
    fitness_expiry: values.fitness_expiry || null,
    pollution_expiry: values.pollution_expiry || null,
    // Only sent when the form offered the control — create has no status field
    // and the server defaults it to active.
    status: VEHICLE_API_STATUS[values.api_status] ?? undefined,
  });
}

/**
 * The UI's availability to the server's DriverAvailability, which already uses
 * the same words (available | on_trip | off_duty). Older values the form may
 * still hold land on the matching state rather than being dropped.
 */
const DRIVER_AVAILABILITY_API = {
  available: 'available',
  on_trip: 'on_trip',
  off_duty: 'off_duty',
  unavailable: 'off_duty',
  on_leave: 'off_duty',
};

/**
 * The driver form to the /drivers create/update body. The API has no address
 * column, so that field is not sent.
 */
export function toDriverApiPayload(values = {}) {
  return withoutBlanks({
    full_name: text(values.full_name ?? values.name),
    mobile: text(values.mobile ?? values.phone),
    license_number: text(values.license_number),
    license_expiry: values.license_expiry || null,
    assigned_vehicle_id: values.assigned_vehicle_id ?? values.assigned_machine_id ?? null,
    availability: DRIVER_AVAILABILITY_API[values.availability] ?? undefined,
    status: text(values.status),
    // Create only: the server makes the sign-in account in the same transaction.
    login: values.login ?? undefined,
  });
}
