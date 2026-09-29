# MoveXpress — Mobile & Web Frontend

React Native (Expo) + React Native Web client for the RentTrack TMS trucking and
equipment-rental platform. One codebase serves Android, iOS and the browser.

The backend is the FastAPI service shipped as `RentTrack-Internal-sam.zip`.
Every screen here is written against its real routes — there is no mock layer.

---

## Running it

```bash
npm install
```

Point the app at your API (the path **must** include the `/api/v1` prefix):

```bash
cp .env.example .env
```

```bash
npm run web
```

`npm run android` and `npm run ios` build the native targets. `npm run lint`
checks formatting with Prettier; `npm run format` rewrites it.

The project is plain JavaScript — no TypeScript, no build step of its own.
The `@/` import alias is resolved by Metro from `jsconfig.json`.

### Pointing at the API

This is a frontend-only deliverable — the API is the separate FastAPI service.
Set `EXPO_PUBLIC_API_URL` to wherever it is running, including the `/api/v1`
suffix, e.g. `http://localhost:8000/api/v1`.

---

## Building for devices

This is a React Native app — the browser is just one of its three targets. The
native bundles build clean today (`expo export --platform android --platform
ios` produces Hermes bytecode for both).

`eas.json` defines three profiles:

| Profile | Output | Use |
|---|---|---|
| `development` | APK, dev client | Debugging on a device with fast refresh |
| `preview` | APK, internal | The installable file to hand someone for testing |
| `production` | AAB, auto-versioned | Play Store upload |

```bash
npx eas-cli login
```

```bash
npx eas-cli build --platform android --profile preview
```

The first build asks to create the project on your Expo account and to generate
an Android keystore — say yes to both; EAS stores the keystore for you.

**`EXPO_PUBLIC_API_URL` is baked in at build time**, and a cloud build never
sees your local `.env` (it is gitignored). Each profile therefore carries its
own value in `eas.json`, and `production` is a placeholder that must be changed
before you ship. `localhost` is meaningless on a phone — a device build needs
your machine's LAN address or a real host.

To run on a phone without building anything, use Expo Go:

```bash
npx expo start
```

---

## Scope

### Shipped — 38 screens

**Auth (amber)** — Login (mobile number), OTP verification (6-box entry with
auto-advance, paste and SMS autofill), Registration, Registration status lookup.

**Admin (indigo, six tabs)** — Dashboard, Vehicles, Drivers, Trips, Companies
(Super Admin only) and Account.

**Fleet & operations** — Add/Edit Vehicle with document-expiry badges, Add/Edit
Driver, Create Trip, Trip detail with the four-stage lifecycle tracker, Trip
calendar, Notifications (registration approvals + upcoming trips), Users.

**Challan** — Add Running Hours (per-vehicle ± steppers with direct entry and
per-row operator), challan history, vehicle-wise detail with the SMS trigger,
and a month calendar with per-day markers.

**Billing** — Quotations (list, create, detail with status transitions),
Invoices (list, create from challans or completed trips with live GST/TDS math,
detail with payment recording), Client Ledger (client picker and per-client
statement with Record Payment), TDS register by financial year, and Reports.

**Super Admin** — Companies directory with onboarding vs active split, and a
per-company drill-down showing members, fleet, crew and pending approvals.

**Driver (amber)** — Dashboard, My Trips, Trip detail (start → reached →
complete, plus the receipt sheet), Account.

### Not built — no endpoint exists

Rate cards, client multi-site, physical challan entry, driver daily collection
and outstanding reports are in the SRS but have no route on this API version.
Models exist for some of them; routers do not.

---

## What the API does not support yet

Each of these is surfaced in the UI rather than hidden, so nobody is led into a
dead end. All are backend-side.

**There is no client directory.** `app/models/client.py` is an explicit stub
("full version added in Module 6") and no endpoint returns a client name. The
app therefore offers only the client ids that already appear on trips, challans
or invoices, labelled `Client 8F3A1C9E`. `src/features/billing/ClientField.js`
is the single place to swap for `GET /clients` when it lands.

**`POST /challans/` will 500.** `challan_service.create_challan` is a marked
skeleton: it reads `payload.vehicle_id` and `payload.driver_id`, which are not
on `ChallanCreate`, uses `ChallanStatus.pending`, which is not in the enum, and
never creates the challan items. The Add Running Hours screen sends the
documented contract and will work unchanged once the service is finished.

**`POST /quotations/` will fail.** `create_quotation` stores only the client and
a draft status — every rate field is dropped — and never sets
`quotation_number`, which is `NOT NULL UNIQUE`.

**`/challans/{id}/notify` sends no SMS.** It writes a log line; the dispatch
call is commented out.

**Challans have no status route.** `ChallanUpdate` exists in the schemas but no
endpoint uses it, so Approve and Request Edit render disabled with an
explanation.

**Both ledger routes are broken.** `app/models/ledger.py` is still the Module-4
stub — its columns are `id, client_id, entry_type, amount, reference_no, note,
entry_date, created_at`. The service and `LedgerEntryResponse` both reference
`company_id`, `balance_after`, `reference_id`, `reference_type` and `notes`,
none of which exist, so `GET /ledger/{client_id}` raises on the company-scope
filter for any non-super-admin and `POST /ledger/{client_id}/payment` raises
constructing the row. The frontend types mirror the declared response schema,
which is what the service targets, so the fix belongs in the model.

**Reports are thin.** `breakdown` is always `[]` on the revenue report, and both
reports filter on `created_at` rather than on trip or invoice dates. Revenue is
the sum of invoice `final_amount` — what has been billed, not what has been
collected.

**Users are read-only.** `GET /users/` and `/users/me` are the only routes;
accounts are created by approving a registration.

**Trips cannot be edited.** There is a create route, a status route and a settle
route, but no update route.

---

## Notes on the API worth knowing

**Registration is company onboarding.** `register_user` looks the company up by
name and creates it when the name is new, which is why `city` is required on the
form. Approving a request is therefore how a company joins the platform — and,
since no `/companies` endpoint exists, the approvals queue plus the
platform-wide users list is where the Super Admin directory comes from
(`src/features/accounts/useCompanyDirectory.js`).

**Registration rows arrive nested.** `GET /registration/requests` returns ORM
rows straight from `paginate()` with no response model, so the applicant's name
and the company name live on the eager-loaded `user` and `company` objects, not
on the row.

**`GET /registration/status` is deliberately thin** — `{user_id, status,
message}` and nothing else, because it is public.

**Only page and page_size are supported on list routes.** No status, client or
date filters exist server-side, so every filter tab in the app narrows the
loaded page. That is also why the list screens request a generous page size.

**Drivers own the trip lifecycle.** `PUT /trips/{id}/status` carries no role
guard, so the driver app moves a trip through in_progress → driver_reached →
completed itself.

**Tokens rotate.** `/auth/refresh` returns a new refresh token each time, so the
client persists the new pair; a single in-flight refresh is shared by parallel
401s rather than each burning the token.

**Money is `Decimal` server-side** and arrives as a JSON number. Everything is
read through `Number(...)` before arithmetic.

---

## Architecture

```
app/                        expo-router routes
  (auth)/                   amber   — /login, /verify, /register,
                                      /registration-status
  driver/(tabs)/            amber   — /driver, /driver/trips, /driver/account
  driver/trip/[id]          amber   — trip detail
  admin/(tabs)/             indigo  — /admin, /admin/vehicles, /admin/drivers,
                                      /admin/trips, /admin/companies,
                                      /admin/account
  admin/vehicle|driver|trip|company|users/…
  admin/challans|quotations|invoices|ledger|tds/…
  admin/reports
src/
  api/                      axios instance + one module per domain
  components/ui/            the shared primitive set
  features/                 domain components (TripCard, ChallanCard, …)
  hooks/                    TanStack Query hooks + cache keys
  store/auth.js             zustand session, persisted to SecureStore
  theme/                    two accent palettes over one set of neutrals
  types/api.js              API enums + JSDoc typedefs for every payload
  utils/                    formatting, permissions, storage
```

**The two shells are real path segments, not route groups.** A parenthesised
group contributes no URL segment, so `(admin)/(tabs)/trips` and
`(driver)/(tabs)/trips` both resolved to `/trips` — one shell's deep links
silently landed in the other's routes. `admin/` and `driver/` keep every URL
unambiguous on the web target.

**Two themes, one component set.** `ThemeProvider` supplies an accent; every
primitive reads it. The amber/indigo split is a token swap at the layout level,
not a second component library.

**Role routing.** The root layout resolves the shell from the signed-in role and
bounces anyone who lands in the wrong group. `usePermissions()` mirrors the
backend guards so the UI never offers an action that would 403.

**Queries always fetch.** `networkMode` is `always`, because the browser's
online flag says nothing about whether a LAN or localhost API is reachable — and
when the query manager guesses wrong it pauses the request, which reads on
screen as "no records" while the server is actually down.

**The registration status route is `/registration-status`, not `/status`** — the
Metro dev server answers `/status` itself with `packager-status:running`.

Stack: Expo SDK 57 · React Native 0.86 · React 19.2 · expo-router · TanStack
Query v5 · Zustand v5 · React Hook Form + Zod · react-native-svg. Plain
JavaScript throughout.

---

## Design reference

The UI mockups live in the SRS PDF as embedded images. The photographic hero
behind the auth screens is redrawn as vector in
`src/components/brand/AuthHero.js` — the original renders are not ours to ship.

Avatars are initials on a tinted disc: neither the `User` nor the `Driver` model
stores an image URL.
