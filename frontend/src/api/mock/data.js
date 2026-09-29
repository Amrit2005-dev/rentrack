/**
 * Seed data for the offline mock backend.
 *
 * The RentTrack TMS FastAPI service is no longer part of this repo, so the app
 * talks to an in-memory stand-in instead (see ./index.js). Everything below
 * mirrors the shapes documented in src/types/api.js — same field names, same
 * enums, same paginated envelope — so no screen can tell the difference.
 *
 * State lives for the lifetime of the JS runtime: writes are visible for the
 * rest of the session, and a full reload starts again from this seed.
 */

const DAY = 86400000;

export const iso = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * DAY).toISOString();
export const day = (offsetDays = 0) => iso(offsetDays).slice(0, 10);

let counter = 0;
export const uid = (prefix = 'row') =>
  `${prefix}-${(++counter).toString().padStart(4, '0')}-${Math.random()
    .toString(16)
    .slice(2, 10)}`;

/* Client ids are what the UI turns into "Client ACME1234" (first 8 characters),
   since this API version exposes no client directory. */
export const CLIENT = {
  acme: 'acme1234-9f21-4c0a-9d33-1a2b3c4d5e6f',
  bluestar: 'bluestar-77c4-4a19-8e52-2b3c4d5e6f70',
  delta007: 'delta007-11ab-4f3c-9c81-3c4d5e6f7081',
  gateway1: 'gateway1-55de-4b77-9a10-4d5e6f708192',
};

export const COMPANY_A = 'company-rt-0001';
export const COMPANY_B = 'company-bm-0002';

/** Vehicle document freshness — computed server-side in the real API. */
export function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr).getTime() - Date.now()) / DAY;
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'expiring_soon';
  return 'valid';
}

export function withExpiryStatus(vehicle) {
  return {
    ...vehicle,
    rc_expiry_status: expiryStatus(vehicle.rc_expiry),
    insurance_expiry_status: expiryStatus(vehicle.insurance_expiry),
    fitness_expiry_status: expiryStatus(vehicle.fitness_expiry),
    pollution_expiry_status: expiryStatus(vehicle.pollution_expiry),
  };
}

/** Builds a fresh database. Called once at start-up. */
export function seed() {
  const stamps = (createdDaysAgo = 30) => ({
    created_at: iso(-createdDaysAgo),
    updated_at: iso(-1),
  });

  const companies = [
    { id: COMPANY_A, name: 'RentTrack Logistics', city: 'Pune', ...stamps(240) },
    { id: COMPANY_B, name: 'Bharat Movers', city: 'Nagpur', ...stamps(150) },
  ];

  const user = (id, mobile, first, last, role, company_id, status, age) => ({
    id,
    mobile_number: mobile,
    first_name: first,
    last_name: last,
    role,
    company_id,
    status,
    ...stamps(age),
  });

  const users = [
    user(
      'user-super-0001',
      '9000000001',
      'Ravi',
      'Menon',
      'super_admin',
      null,
      'active',
      240,
    ),
    user(
      'user-admin-0002',
      '9000000002',
      'Anita',
      'Sharma',
      'admin',
      COMPANY_A,
      'approved',
      220,
    ),
    user(
      'user-driver-0003',
      '9000000003',
      'Suresh',
      'Kumar',
      'user',
      COMPANY_A,
      'approved',
      180,
    ),
    user(
      'user-driver-0004',
      '9000000004',
      'Manoj',
      'Patil',
      'user',
      COMPANY_A,
      'approved',
      120,
    ),
    user(
      'user-admin-0005',
      '9000000005',
      'Farid',
      'Khan',
      'admin',
      COMPANY_B,
      'approved',
      140,
    ),
    user(
      'user-pending-0006',
      '9000000006',
      'Kavita',
      'Rao',
      'user',
      COMPANY_A,
      'pending',
      4,
    ),
    user(
      'user-pending-0007',
      '9000000007',
      'Imran',
      'Shaikh',
      'user',
      COMPANY_B,
      'pending',
      2,
    ),
    /*
     * The back-office and alias roles the API's enum carries but this seed had
     * no example of. utils/permissions.js sorts roles into six families —
     * super admin, org admin, admin, manager, operator, driver — and only three
     * of them could be signed in as, so the other three were never seen on a
     * screen. MANAGER and OPERATOR matter most: they are the only roles that
     * can read the console but write nothing.
     */
    user(
      'user-manager-0008',
      '9000000008',
      'Priya',
      'Nair',
      'manager',
      COMPANY_A,
      'approved',
      160,
    ),
    user(
      'user-operator-0009',
      '9000000009',
      'Arjun',
      'Desai',
      'operator',
      COMPANY_A,
      'approved',
      100,
    ),
    /* ORG_ADMIN is the API's own spelling of the company admin role; 'admin'
       above is the legacy alias. Both should land in the same place. */
    user(
      'user-orgadmin-0010',
      '9000000010',
      'Neha',
      'Joshi',
      'org_admin',
      COMPANY_A,
      'approved',
      200,
    ),
    /*
     * A role none of the four sets in utils/permissions.js recognises, which is
     * the case that matters most for safety: shellFor() is written so anything
     * it does not recognise as console staff lands in the driver shell, seeing
     * only its own trips, rather than falling through into the admin console.
     * Nothing exercised that branch until this row existed.
     */
    user(
      'user-unknown-0011',
      '9000000011',
      'Sana',
      'Qureshi',
      'auditor',
      COMPANY_A,
      'approved',
      60,
    ),
  ];

  const vehicle = (over) => ({
    id: uid('vehicle'),
    company_id: COMPANY_A,
    registration_no: '',
    type: 'Tipper',
    capacity_tons: null,
    rc_expiry: null,
    insurance_expiry: null,
    fitness_expiry: null,
    pollution_expiry: null,
    status: 'active',
    image_url: null,
    ...stamps(150),
    ...over,
  });

  const vehicles = [
    vehicle({
      id: 'vehicle-0001',
      registration_no: 'MH12 AB 1234',
      type: 'Tipper',
      capacity_tons: 16,
      rc_expiry: day(420),
      insurance_expiry: day(18),
      fitness_expiry: day(200),
      pollution_expiry: day(-9),
      status: 'in_trip',
    }),
    vehicle({
      id: 'vehicle-0002',
      registration_no: 'MH12 CD 5678',
      type: 'Trailer',
      capacity_tons: 28,
      rc_expiry: day(600),
      insurance_expiry: day(260),
      fitness_expiry: day(95),
      pollution_expiry: day(120),
    }),
    vehicle({
      id: 'vehicle-0003',
      registration_no: 'MH14 EF 9012',
      type: 'Hydraulic Crane',
      capacity_tons: 12,
      rc_expiry: day(310),
      insurance_expiry: day(27),
      fitness_expiry: day(-3),
      pollution_expiry: day(150),
    }),
    vehicle({
      id: 'vehicle-0004',
      registration_no: 'MH12 GH 3456',
      type: 'Tanker',
      capacity_tons: 20,
      rc_expiry: day(90),
      insurance_expiry: day(90),
      fitness_expiry: day(90),
      pollution_expiry: day(60),
      status: 'inactive',
    }),
    vehicle({
      id: 'vehicle-0005',
      company_id: COMPANY_B,
      registration_no: 'MH31 JK 7788',
      type: 'Tipper',
      capacity_tons: 16,
      rc_expiry: day(500),
      insurance_expiry: day(210),
      fitness_expiry: day(180),
      pollution_expiry: day(45),
    }),
  ];

  const driver = (over) => ({
    id: uid('driver'),
    company_id: COMPANY_A,
    user_id: null,
    full_name: '',
    mobile: '',
    license_number: '',
    license_expiry: null,
    assigned_vehicle_id: null,
    availability: 'available',
    emergency_contact_name: null,
    emergency_contact_mobile: null,
    ...stamps(120),
    ...over,
  });

  const drivers = [
    driver({
      id: 'driver-0001',
      user_id: 'user-driver-0003',
      full_name: 'Suresh Kumar',
      mobile: '9000000003',
      license_number: 'MH1220190001234',
      license_expiry: day(430),
      assigned_vehicle_id: 'vehicle-0001',
      availability: 'on_trip',
      emergency_contact_name: 'Lata Kumar',
      emergency_contact_mobile: '9812345601',
    }),
    driver({
      id: 'driver-0002',
      user_id: 'user-driver-0004',
      full_name: 'Manoj Patil',
      mobile: '9000000004',
      license_number: 'MH1220170005678',
      license_expiry: day(21),
      assigned_vehicle_id: 'vehicle-0002',
      emergency_contact_name: 'Sunita Patil',
      emergency_contact_mobile: '9812345602',
    }),
    driver({
      id: 'driver-0003',
      full_name: 'Deepak Yadav',
      mobile: '9812345603',
      license_number: 'MH1420160009012',
      license_expiry: day(280),
    }),
    driver({
      id: 'driver-0004',
      full_name: 'Ramesh Gaikwad',
      mobile: '9812345604',
      license_number: 'MH1220150003456',
      license_expiry: day(-12),
      availability: 'off_duty',
    }),
    driver({
      id: 'driver-0005',
      company_id: COMPANY_B,
      full_name: 'Salim Ansari',
      mobile: '9812345605',
      license_number: 'MH3120180007788',
      license_expiry: day(360),
      assigned_vehicle_id: 'vehicle-0005',
    }),
  ];

  const trip = (over) => ({
    id: uid('trip'),
    company_id: COMPANY_A,
    vehicle_id: null,
    driver_id: null,
    client_id: null,
    origin: null,
    destination: null,
    load_details: null,
    distance_km: null,
    weight_tons: null,
    base_fare: null,
    distance_charge: null,
    weight_charge: null,
    waiting_charge: null,
    toll_charge: null,
    extra_charge: null,
    gst_rate: 18,
    gst_amount: null,
    final_amount: null,
    status: 'upcoming',
    started_at: null,
    reached_at: null,
    completed_at: null,
    notes: null,
    created_by: 'user-admin-0002',
    ...stamps(10),
    ...over,
  });

  const trips = [
    trip({
      id: 'trip-0001',
      vehicle_id: 'vehicle-0001',
      driver_id: 'driver-0001',
      client_id: CLIENT.acme,
      origin: 'Pune — Chakan MIDC',
      destination: 'Nashik — Satpur',
      load_details: { material: 'Steel coils', packages: 12 },
      distance_km: 210,
      weight_tons: 14,
      base_fare: 4000,
      distance_charge: 8400,
      weight_charge: 2800,
      waiting_charge: 0,
      toll_charge: 900,
      extra_charge: 0,
      gst_amount: 2898,
      final_amount: 18998,
      status: 'in_progress',
      started_at: iso(-0.3),
      notes: 'Delivery window 6pm–8pm.',
    }),
    trip({
      id: 'trip-0002',
      vehicle_id: 'vehicle-0002',
      driver_id: 'driver-0002',
      client_id: CLIENT.bluestar,
      origin: 'Pune — Hadapsar',
      destination: 'Mumbai — Bhiwandi',
      distance_km: 148,
      weight_tons: 22,
      notes: 'Loading slot 05:30.',
    }),
    trip({
      id: 'trip-0003',
      vehicle_id: 'vehicle-0003',
      driver_id: 'driver-0003',
      client_id: CLIENT.delta007,
      origin: 'Pune — Wagholi',
      destination: 'Ahmednagar',
      distance_km: 96,
      weight_tons: 8,
      status: 'driver_reached',
      started_at: iso(-0.6),
      reached_at: iso(-0.1),
    }),
    trip({
      id: 'trip-0004',
      vehicle_id: 'vehicle-0002',
      driver_id: 'driver-0002',
      client_id: CLIENT.acme,
      origin: 'Nashik',
      destination: 'Pune — Chakan MIDC',
      distance_km: 205,
      weight_tons: 18,
      base_fare: 4000,
      distance_charge: 8200,
      weight_charge: 3600,
      waiting_charge: 500,
      toll_charge: 850,
      extra_charge: 0,
      gst_amount: 3086,
      final_amount: 20236,
      status: 'completed',
      started_at: iso(-6),
      reached_at: iso(-5.7),
      completed_at: iso(-5.5),
      ...stamps(6),
    }),
    trip({
      id: 'trip-0005',
      vehicle_id: 'vehicle-0001',
      driver_id: 'driver-0001',
      client_id: CLIENT.bluestar,
      origin: 'Pune — Talegaon',
      destination: 'Aurangabad',
      distance_km: 245,
      weight_tons: 15,
      base_fare: 4000,
      distance_charge: 9800,
      weight_charge: 3000,
      waiting_charge: 0,
      toll_charge: 1100,
      extra_charge: 250,
      gst_amount: 3267,
      final_amount: 21417,
      status: 'completed',
      started_at: iso(-11),
      reached_at: iso(-10.6),
      completed_at: iso(-10.4),
      ...stamps(11),
    }),
    trip({
      id: 'trip-0006',
      vehicle_id: 'vehicle-0003',
      driver_id: 'driver-0004',
      client_id: CLIENT.delta007,
      origin: 'Pune — Bhosari',
      destination: 'Solapur',
      distance_km: 260,
      weight_tons: 10,
      status: 'cancelled',
      notes: 'Client rescheduled to next month.',
      ...stamps(8),
    }),
    trip({
      id: 'trip-0007',
      vehicle_id: 'vehicle-0002',
      driver_id: 'driver-0003',
      client_id: CLIENT.gateway1,
      origin: 'Pune — Ranjangaon',
      destination: 'Surat',
      distance_km: 480,
      weight_tons: 24,
      ...stamps(1),
    }),
    trip({
      id: 'trip-0008',
      company_id: COMPANY_B,
      vehicle_id: 'vehicle-0005',
      driver_id: 'driver-0005',
      client_id: CLIENT.gateway1,
      origin: 'Nagpur',
      destination: 'Raipur',
      distance_km: 290,
      weight_tons: 16,
      base_fare: 4500,
      distance_charge: 11600,
      weight_charge: 3200,
      waiting_charge: 0,
      toll_charge: 1200,
      extra_charge: 0,
      gst_amount: 3690,
      final_amount: 24190,
      status: 'completed',
      started_at: iso(-4),
      completed_at: iso(-3.6),
      created_by: 'user-admin-0005',
      ...stamps(4),
    }),
  ];

  const receipts = [
    {
      id: 'receipt-0001',
      trip_id: 'trip-0004',
      receiver_name: 'Prakash Joshi',
      received_at: iso(-5.5),
      image_url: null,
      created_at: iso(-5.5),
    },
  ];

  const challanItem = (vehicle_id, driver_id, running_hours, rate = 950) => ({
    id: uid('challan-item'),
    vehicle_id,
    driver_id,
    running_hours,
    amount: running_hours * rate,
  });

  const challans = [
    {
      id: 'challan-0001',
      company_id: COMPANY_A,
      client_id: CLIENT.acme,
      challan_date: day(-1),
      total_hours: 17,
      total_amount: 16150,
      status: 'sent',
      sms_sent_at: iso(-0.9),
      pdf_url: null,
      items: [
        challanItem('vehicle-0001', 'driver-0001', 9),
        challanItem('vehicle-0002', 'driver-0002', 8),
      ],
      ...stamps(1),
    },
    {
      id: 'challan-0002',
      company_id: COMPANY_A,
      client_id: CLIENT.bluestar,
      challan_date: day(-3),
      total_hours: 11,
      total_amount: 10450,
      status: 'approved',
      sms_sent_at: iso(-2.8),
      pdf_url: null,
      items: [challanItem('vehicle-0003', 'driver-0003', 11)],
      ...stamps(3),
    },
    {
      id: 'challan-0003',
      company_id: COMPANY_A,
      client_id: CLIENT.delta007,
      challan_date: day(0),
      total_hours: 6,
      total_amount: 5700,
      status: 'draft',
      sms_sent_at: null,
      pdf_url: null,
      items: [challanItem('vehicle-0002', 'driver-0002', 6)],
      ...stamps(0),
    },
  ];

  const item = (description, amount, trip_id = null, challan_id = null) => ({
    id: uid('invoice-item'),
    description,
    amount,
    trip_id,
    challan_id,
  });

  const invoices = [
    {
      id: 'invoice-0001',
      company_id: COMPANY_A,
      client_id: CLIENT.acme,
      invoice_number: 'INV-2026-0001',
      status: 'paid',
      total_amount: 38000,
      gst_amount: 6840,
      tds_amount: 760,
      final_amount: 44080,
      paid_amount: 44080,
      due_date: day(-4),
      notes: 'Chakan–Nashik movements, first fortnight.',
      pdf_url: null,
      items: [
        item('Trip charges — Chakan to Nashik', 20000, 'trip-0004'),
        item('Daily running challan', 18000, null, 'challan-0001'),
      ],
      ...stamps(20),
    },
    {
      id: 'invoice-0002',
      company_id: COMPANY_A,
      client_id: CLIENT.bluestar,
      invoice_number: 'INV-2026-0002',
      status: 'partial',
      total_amount: 52000,
      gst_amount: 9360,
      tds_amount: 1040,
      final_amount: 60320,
      paid_amount: 25000,
      due_date: day(6),
      notes: null,
      pdf_url: null,
      items: [item('Aurangabad haulage', 52000, 'trip-0005')],
      ...stamps(12),
    },
    {
      id: 'invoice-0003',
      company_id: COMPANY_A,
      client_id: CLIENT.delta007,
      invoice_number: 'INV-2026-0003',
      status: 'pending',
      total_amount: 18500,
      gst_amount: 3330,
      tds_amount: 370,
      final_amount: 21460,
      paid_amount: 0,
      due_date: day(-2),
      notes: 'Overdue — follow up.',
      pdf_url: null,
      items: [item('Crane hire, Wagholi site', 18500, null, 'challan-0002')],
      ...stamps(9),
    },
    {
      id: 'invoice-0004',
      company_id: COMPANY_B,
      client_id: CLIENT.gateway1,
      invoice_number: 'INV-2026-0004',
      status: 'pending',
      total_amount: 24000,
      gst_amount: 4320,
      tds_amount: 480,
      final_amount: 27840,
      paid_amount: 0,
      due_date: day(10),
      notes: null,
      pdf_url: null,
      items: [item('Nagpur to Raipur, single trip', 24000, 'trip-0008')],
      ...stamps(5),
    },
  ];

  const quotations = [
    {
      id: 'quotation-0001',
      quotation_number: 'QTN-2026-0001',
      company_id: COMPANY_A,
      client_id: CLIENT.acme,
      machine_type: 'Tipper 16T',
      package_details: 'Monthly retainer, 22 working days',
      base_rate: 4000,
      per_km_rate: 40,
      per_ton_rate: 200,
      total_rate: 180000,
      validity_date: day(14),
      custom_terms: '50% advance, balance on delivery.',
      status: 'sent',
      trip_id: null,
      ...stamps(7),
    },
    {
      id: 'quotation-0002',
      quotation_number: 'QTN-2026-0002',
      company_id: COMPANY_A,
      client_id: CLIENT.bluestar,
      machine_type: 'Trailer 28T',
      package_details: 'Per-trip, Bhiwandi corridor',
      base_rate: 5000,
      per_km_rate: 44,
      per_ton_rate: 180,
      total_rate: 22000,
      validity_date: day(-3),
      custom_terms: null,
      status: 'accepted',
      trip_id: 'trip-0002',
      ...stamps(16),
    },
    {
      id: 'quotation-0003',
      quotation_number: 'QTN-2026-0003',
      company_id: COMPANY_A,
      client_id: CLIENT.gateway1,
      machine_type: 'Hydraulic Crane 12T',
      package_details: 'Site erection, 3 days',
      base_rate: 12000,
      per_km_rate: 0,
      per_ton_rate: 0,
      total_rate: 36000,
      validity_date: day(-10),
      custom_terms: 'Operator and fuel included.',
      status: 'expired',
      trip_id: null,
      ...stamps(30),
    },
  ];

  const ledgerRow = (client_id, entry_type, amount, balance_after, over = {}) => ({
    id: uid('ledger'),
    company_id: COMPANY_A,
    client_id,
    entry_type,
    amount,
    balance_after,
    reference_id: null,
    reference_type: null,
    notes: null,
    created_at: iso(-10),
    ...over,
  });

  const ledger = [
    ledgerRow(CLIENT.acme, 'debit', 44080, 44080, {
      reference_id: 'invoice-0001',
      reference_type: 'invoice',
      notes: 'INV-2026-0001 raised',
      created_at: iso(-20),
    }),
    ledgerRow(CLIENT.acme, 'credit', 44080, 0, {
      reference_type: 'payment',
      notes: 'NEFT settlement',
      created_at: iso(-6),
    }),
    ledgerRow(CLIENT.bluestar, 'debit', 60320, 60320, {
      reference_id: 'invoice-0002',
      reference_type: 'invoice',
      notes: 'INV-2026-0002 raised',
      created_at: iso(-12),
    }),
    ledgerRow(CLIENT.bluestar, 'credit', 25000, 35320, {
      reference_type: 'payment',
      notes: 'Part payment, UPI',
      created_at: iso(-5),
    }),
    ledgerRow(CLIENT.delta007, 'debit', 21460, 21460, {
      reference_id: 'invoice-0003',
      reference_type: 'invoice',
      notes: 'INV-2026-0003 raised',
      created_at: iso(-9),
    }),
  ];

  /* Driver daily collections — what came in on the road. */
  const collection = (driver_id, amount, payment_mode, daysAgo, over = {}) => ({
    id: uid('collection'),
    company_id: COMPANY_A,
    driver_id,
    trip_id: null,
    collection_date: day(-daysAgo),
    amount,
    payment_mode,
    reference_no: payment_mode === 'CASH' ? null : `REF${1000 + daysAgo}`,
    notes: null,
    created_by: null,
    ...stamps(daysAgo),
    ...over,
  });

  const collections = [
    collection(drivers[0].id, 4500, 'CASH', 0),
    collection(drivers[0].id, 12000, 'UPI', 1),
    collection(drivers[1].id, 8200, 'CASH', 2),
    collection(drivers[1].id, 30000, 'BANK_TRANSFER', 5),
    collection(drivers[0].id, 2600, 'CASH', 8),
  ];

  /* Company expenses — what the fleet costs to run. */
  const expense = (title, category, amount, daysAgo, over = {}) => ({
    id: uid('expense'),
    org_id: COMPANY_A,
    company_id: COMPANY_A,
    title,
    category,
    amount,
    expense_date: day(-daysAgo),
    notes: null,
    machine_id: null,
    driver_id: null,
    machine_name: null,
    driver_name: null,
    ...stamps(daysAgo),
    ...over,
  });

  const expenses = [
    expense('Diesel — MH12 AB 1234', 'FUEL', 6200, 0, {
      machine_id: vehicles[0].id,
      machine_name: vehicles[0].registration_no,
    }),
    expense('Tyre replacement', 'MAINTENANCE', 18400, 3, {
      machine_id: vehicles[1].id,
      machine_name: vehicles[1].registration_no,
    }),
    expense('Driver salaries — August', 'SALARY', 96000, 11),
    expense('Yard rent — September', 'RENT', 45000, 6),
    expense('Toll and parking', 'TRANSPORT', 3150, 1, {
      driver_id: drivers[0].id,
      driver_name: drivers[0].full_name,
    }),
  ];

  const tds = [
    {
      id: 'tds-0001',
      company_id: COMPANY_A,
      client_id: CLIENT.acme,
      invoice_id: 'invoice-0001',
      financial_year: '2026-27',
      tds_percentage: 2,
      deducted_amount: 760,
      certificate_number: 'TDS/2627/0001',
      certificate_url: null,
      ...stamps(20),
    },
    {
      id: 'tds-0002',
      company_id: COMPANY_A,
      client_id: CLIENT.bluestar,
      invoice_id: 'invoice-0002',
      financial_year: '2026-27',
      tds_percentage: 2,
      deducted_amount: 1040,
      certificate_number: null,
      certificate_url: null,
      ...stamps(12),
    },
    {
      id: 'tds-0003',
      company_id: COMPANY_A,
      client_id: CLIENT.delta007,
      invoice_id: 'invoice-0003',
      financial_year: '2025-26',
      tds_percentage: 2,
      deducted_amount: 370,
      certificate_number: 'TDS/2526/0044',
      certificate_url: null,
      ...stamps(9),
    },
  ];

  const registrations = [
    {
      id: 'registration-0001',
      user_id: 'user-pending-0006',
      company_id: COMPANY_A,
      status: 'pending',
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      ...stamps(4),
    },
    {
      id: 'registration-0002',
      user_id: 'user-pending-0007',
      company_id: COMPANY_B,
      status: 'pending',
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      ...stamps(2),
    },
    {
      id: 'registration-0003',
      user_id: 'user-driver-0004',
      company_id: COMPANY_A,
      status: 'approved',
      rejection_reason: null,
      reviewed_by: 'user-admin-0002',
      reviewed_at: iso(-118),
      ...stamps(120),
    },
  ];

  return {
    companies,
    users,
    vehicles,
    drivers,
    trips,
    receipts,
    challans,
    invoices,
    quotations,
    ledger,
    tds,
    collections,
    expenses,
    registrations,
    /** mobile_number -> the code the "SMS" carried */
    otps: new Map(),
    /** token -> user id */
    sessions: new Map(),
    /** tokens a refresh or a sign-out has retired */
    revoked: new Set(),
  };
}
