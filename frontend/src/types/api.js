/**
 * Mirrors the RentTrack TMS API (app/schemas/*.py, app/models/*.py).
 *
 * Conventions that differ from the previous renttrace backend and are easy to
 * trip over:
 *  - Responses are bare — there is no success envelope. Errors are FastAPI's
 *    default `{ detail }`, or `{ success, error, detail }` where a route uses
 *    the helper in app/utils/responses.py.
 *  - Every list endpoint is paginated as `{ items, total, page, page_size, pages }`
 *    with 1-based `page`.
 *  - Money arrives as a JSON number but is Decimal server-side; never do
 *    arithmetic on it beyond display.
 *  - The profile is GET /users/me, not /auth/me. verify-otp returns tokens and
 *    a role only.
 */

/* ── Enums ──────────────────────────────────────────────────
 *
 * These are real runtime values — screens compare against them and use
 * them as lookup keys. Everything below them is documentation only: JSDoc
 * typedefs mirroring the Pydantic schemas, so an editor still autocompletes
 * a Trip or an Invoice with no TypeScript in the project.
 */

export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  DRIVER: 'driver',
  USER: 'user',
};

export const UserStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
};

export const VehicleStatus = {
  ACTIVE: 'active',
  IN_TRIP: 'in_trip',
  INACTIVE: 'inactive',
};

export const DriverAvailability = {
  AVAILABLE: 'available',
  ON_TRIP: 'on_trip',
  OFF_DUTY: 'off_duty',
};

export const TripStatus = {
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  DRIVER_REACHED: 'driver_reached',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ChallanStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
};

export const InvoiceStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

export const QuotationStatus = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

/* ── Shapes (documentation only) ────────────────────────── */

/**
 * @typedef {Object} PageParams
 * @property {number} [page]
 * @property {number} [page_size]
 */

/**
 * @typedef {Object} SendOTPRequest
 * @property {string} mobile_number
 */

/**
 * @typedef {Object} VerifyOTPRequest
 * @property {string} mobile_number
 * @property {string} otp
 */

/**
 * verify-otp and refresh both return this. Note: no user object.
 *
 * @typedef {Object} TokenResponse
 * @property {string} access_token
 * @property {string} refresh_token
 * @property {string} token_type
 * @property {UserRole} role
 * @property {string} user_id
 */

/**
 * @typedef {Object} CurrentUser
 * @property {string} id
 * @property {string} mobile_number
 * @property {string|null} first_name
 * @property {string|null} last_name
 * @property {UserRole} role
 * @property {string|null} company_id
 * @property {UserStatus} status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Companies are created by registration, never directly — there is no
 * /companies endpoint. They reach the app nested on the rows that reference
 * them: registration requests, and (for a super admin, platform-wide) users.
 *
 * @typedef {Object} Company
 * @property {string} id
 * @property {string} name
 * @property {string|null} city
 * @property {string} created_at
 * @property {string} [updated_at]
 */

/**
 * GET /users/ returns ORM rows, so each one carries its eager-loaded company —
 * unlike /users/me, which the endpoint builds by hand. Super admins get every
 * company's users, which makes this list the app's only company directory.
 *
 * @typedef {Object} PlatformUser
 * @property {...CurrentUser} — also carries every CurrentUser field
 * @property {Company|null} [company]
 */

/**
 * Registration is also company onboarding: register_user looks the company up
 * by name and creates it when the name is new, which is why `city` is required.
 * Mobile must be 10 digits.
 *
 * @typedef {Object} RegistrationCreate
 * @property {string} mobile_number
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} company_name
 * @property {string} city
 */

/**
 * GET /registration/requests returns the ORM rows straight from paginate() —
 * no response_model — so the shape is the registration_requests table plus the
 * two relationships the model eager-loads (`user` and `company`, both
 * lazy="selectin"). The applicant's name and the company name live on those,
 * never on the row itself.
 *
 * @typedef {Object} RegistrationApplicant
 * @property {string} id
 * @property {string} mobile_number
 * @property {string|null} first_name
 * @property {string|null} last_name
 * @property {UserRole} role
 * @property {string} status
 * @property {string} [company_id]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} RegistrationRequest
 * @property {string} id
 * @property {string} user_id
 * @property {string} company_id
 * @property {string} status
 * @property {string|null} rejection_reason
 * @property {string|null} reviewed_by
 * @property {string|null} reviewed_at
 * @property {string} created_at
 * @property {string} updated_at
 * @property {RegistrationApplicant|null} [user]
 * @property {Company|null} [company]
 */

/**
 * POST /registration/ — the company is created here when the name is new.
 *
 * @typedef {Object} RegistrationSubmitted
 * @property {string} user_id
 * @property {string} status
 * @property {string} company_id
 * @property {boolean} is_new_company
 * @property {string} message
 */

/**
 * GET /registration/status is deliberately thin — it is public, so it gives an
 * applicant their status and a sentence, and nothing else about the account.
 *
 * @typedef {Object} RegistrationStatusResult
 * @property {string} user_id
 * @property {string} status
 * @property {string} message
 */

/**
 * POST /registration/{id}/approve | /reject
 *
 * @typedef {Object} RegistrationDecision
 * @property {string} user_id
 * @property {string} status
 * @property {string} [role]
 */

/**
 * Approving assigns a role only — the company is resolved from the request.
 *
 * @typedef {Object} RegistrationApprove
 * @property {'admin'|'user'} role
 */

/**
 * @typedef {Object} RegistrationReject
 * @property {string} reason
 */

/**
 * @typedef {Object} Vehicle
 * @property {string} id
 * @property {string} company_id
 * @property {string} registration_no
 * @property {string} type
 * @property {number|null} capacity_tons
 * @property {string|null} rc_expiry
 * @property {string|null} insurance_expiry
 * @property {string|null} fitness_expiry
 * @property {string|null} pollution_expiry
 * @property {VehicleStatus} status
 * @property {string|null} image_url
 * @property {ExpiryStatus|null} rc_expiry_status Computed server-side — drives the document expiry badges.
 * @property {ExpiryStatus|null} insurance_expiry_status
 * @property {ExpiryStatus|null} fitness_expiry_status
 * @property {ExpiryStatus|null} pollution_expiry_status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} VehicleCreate
 * @property {string} registration_no
 * @property {string} type
 * @property {number|null} [capacity_tons]
 * @property {string|null} [rc_expiry]
 * @property {string|null} [insurance_expiry]
 * @property {string|null} [fitness_expiry]
 * @property {string|null} [pollution_expiry]
 */

/**
 * @typedef {Object} VehicleListParams
 * @property {...PageParams} — also carries every PageParams field
 * @property {string} [vehicle_status]
 * @property {string} [vehicle_type]
 */

/**
 * @typedef {Object} Driver
 * @property {string} id
 * @property {string} company_id
 * @property {string|null} user_id
 * @property {string} full_name
 * @property {string} mobile
 * @property {string} license_number
 * @property {string|null} license_expiry
 * @property {string|null} assigned_vehicle_id
 * @property {DriverAvailability} availability
 * @property {string|null} emergency_contact_name
 * @property {string|null} emergency_contact_mobile
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} DriverCreate
 * @property {string} full_name
 * @property {string} mobile
 * @property {string} license_number
 * @property {string|null} [license_expiry]
 * @property {string|null} [user_id]
 * @property {string|null} [assigned_vehicle_id]
 * @property {DriverAvailability} [availability]
 * @property {string|null} [emergency_contact_name]
 * @property {string|null} [emergency_contact_mobile]
 */

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} company_id
 * @property {string|null} vehicle_id
 * @property {string|null} driver_id
 * @property {string|null} client_id
 * @property {string|null} origin
 * @property {string|null} destination
 * @property {Record<string, *>|null} load_details
 * @property {number|null} distance_km
 * @property {number|null} weight_tons
 * @property {number|null} base_fare
 * @property {number|null} distance_charge
 * @property {number|null} weight_charge
 * @property {number|null} waiting_charge
 * @property {number|null} toll_charge
 * @property {number|null} extra_charge
 * @property {number|null} gst_rate
 * @property {number|null} gst_amount
 * @property {number|null} final_amount
 * @property {TripStatus} status
 * @property {string|null} started_at The three lifecycle stamps the SRS tracker needs.
 * @property {string|null} reached_at
 * @property {string|null} completed_at
 * @property {string|null} notes
 * @property {string|null} created_by
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} TripCreate
 * @property {string|null} [vehicle_id]
 * @property {string|null} [driver_id]
 * @property {string|null} [client_id]
 * @property {string|null} [origin]
 * @property {string|null} [destination]
 * @property {Record<string, *>|null} [load_details]
 * @property {number|null} [distance_km]
 * @property {number|null} [weight_tons]
 * @property {number|null} [gst_rate]
 * @property {number|null} [toll_charge]
 * @property {number|null} [extra_charge]
 * @property {string|null} [notes]
 * @property {number|null} [base_fare]
 */

/**
 * POST /trips/{id}/settle — finalises the money on a finished trip.
 *
 * @typedef {Object} TripSettle
 * @property {number} distance_km
 * @property {number} weight_tons
 * @property {number} [waiting_hours]
 * @property {number} [toll_charge]
 * @property {number} [extra_charge]
 * @property {number} [gst_rate]
 */

/**
 * @typedef {Object} ReceiptCreate
 * @property {string|null} [receiver_name]
 * @property {string|null} [receiver_otp]
 * @property {string|null} [image_url]
 */

/**
 * @typedef {Object} Receipt
 * @property {string} id
 * @property {string} trip_id
 * @property {string|null} receiver_name
 * @property {string|null} received_at
 * @property {string|null} image_url
 * @property {string} created_at
 */

/**
 * @typedef {Object} TripListParams
 * @property {...PageParams} — also carries every PageParams field
 * @property {string} [trip_status]
 * @property {string} [vehicle_id]
 * @property {string} [driver_id]
 * @property {string} [client_id]
 * @property {string} [date_from]
 * @property {string} [date_to]
 */

/**
 * @typedef {Object} ChallanItemCreate
 * @property {string|null} [vehicle_id]
 * @property {string|null} [driver_id]
 * @property {number} running_hours
 */

/**
 * @typedef {Object} ChallanItem
 * @property {string} id
 * @property {string|null} vehicle_id
 * @property {string|null} driver_id
 * @property {number} running_hours
 * @property {number} amount
 * @property {string} created_at
 */

/**
 * @typedef {Object} Challan
 * @property {string} id
 * @property {string} company_id
 * @property {string|null} client_id
 * @property {string} challan_date
 * @property {number|null} total_hours
 * @property {number} total_amount
 * @property {ChallanStatus} status
 * @property {string|null} sms_sent_at
 * @property {string|null} pdf_url
 * @property {ChallanItem[]} items
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ChallanCreate
 * @property {string|null} [client_id]
 * @property {string} challan_date
 * @property {ChallanItemCreate[]} items
 */

/**
 * @typedef {Object} ChallanCalendarEntry
 * @property {string} challan_date
 * @property {number} challan_count
 * @property {number} total_amount
 * @property {string[]} statuses
 */

/**
 * @typedef {Object} InvoiceItemCreate
 * @property {string} description
 * @property {number} amount
 * @property {string|null} [trip_id]
 * @property {string|null} [challan_id]
 */

/**
 * @typedef {Object} InvoiceItem
 * @property {string} id
 * @property {string} description
 * @property {number} amount
 * @property {string|null} trip_id
 * @property {string|null} challan_id
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} company_id
 * @property {string} client_id
 * @property {string} invoice_number
 * @property {InvoiceStatus} status
 * @property {number} total_amount
 * @property {number} gst_amount
 * @property {number} tds_amount
 * @property {number} final_amount
 * @property {number} paid_amount
 * @property {string|null} due_date
 * @property {string|null} notes
 * @property {string|null} pdf_url
 * @property {InvoiceItem[]} items
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} InvoiceCreate
 * @property {string} client_id
 * @property {string|null} [due_date]
 * @property {string|null} [notes]
 * @property {InvoiceItemCreate[]} items
 * @property {number} [gst_percentage]
 * @property {number} [tds_percentage]
 */

/**
 * @typedef {Object} InvoiceUpdateStatus
 * @property {string} status
 * @property {number} [paid_amount]
 */

/**
 * @typedef {Object} Quotation
 * @property {string} id
 * @property {string} quotation_number
 * @property {string} company_id
 * @property {string|null} client_id
 * @property {string|null} machine_type
 * @property {string|null} package_details
 * @property {number|null} base_rate
 * @property {number|null} per_km_rate
 * @property {number|null} per_ton_rate
 * @property {number|null} total_rate
 * @property {string|null} validity_date
 * @property {string|null} custom_terms
 * @property {QuotationStatus} status
 * @property {string|null} trip_id
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} QuotationCreate
 * @property {string|null} [client_id]
 * @property {string|null} [machine_type]
 * @property {string|null} [package_details]
 * @property {number|null} [base_rate]
 * @property {number|null} [per_km_rate]
 * @property {number|null} [per_ton_rate]
 * @property {number|null} [total_rate]
 * @property {string|null} [validity_date]
 * @property {string|null} [terms_id]
 * @property {string|null} [custom_terms]
 */

/**
 * @typedef {Object} LedgerEntry
 * @property {string} id
 * @property {string} company_id
 * @property {string} client_id
 * @property {'debit'|'credit'|string} entry_type
 * @property {number} amount
 * @property {number} balance_after
 * @property {string|null} reference_id
 * @property {string|null} reference_type
 * @property {string|null} notes
 * @property {string} created_at
 */

/**
 * @typedef {Object} PaymentCreate
 * @property {number} amount
 * @property {string} payment_mode
 * @property {string|null} [reference_no]
 * @property {string|null} [notes]
 * @property {string|null} [invoice_id]
 */

/**
 * @typedef {Object} TDSRecord
 * @property {string} id
 * @property {string} company_id
 * @property {string} client_id
 * @property {string|null} invoice_id
 * @property {string} financial_year
 * @property {number} tds_percentage
 * @property {number} deducted_amount
 * @property {string|null} certificate_number
 * @property {string|null} certificate_url
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} TDSCreate
 * @property {string} client_id
 * @property {string|null} [invoice_id]
 * @property {string} financial_year
 * @property {number} tds_percentage
 * @property {number} deducted_amount
 * @property {string|null} [certificate_number]
 */

/**
 * @typedef {Object} RevenueReport
 * @property {number} total_revenue
 * @property {*[]} breakdown
 */

/**
 * @typedef {Object} TripReport
 * @property {number} total_trips
 * @property {number} completed
 * @property {number} cancelled
 * @property {number} in_progress
 * @property {Record<string, number>} breakdown
 */
