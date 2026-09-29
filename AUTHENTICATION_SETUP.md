# RentTrack Authentication System Setup & Reference Manual

This guide provides everything needed to run, test, and develop the RentTrack authentication system locally using **Docker (PostgreSQL + Redis)** and **FastAPI**, along with instructions for connecting the **React Native / Expo** frontend and configuring production SMS providers.

---

## Architecture Overview

RentTrack uses a secure, modern multi-factor authentication flow:
- **Primary Auth Mode (2FA)**: Email + Password verification followed by a 6-digit OTP dispatched to the user's verified mobile number.
- **Secondary Auth Mode**: Direct mobile number OTP sign-in (ideal for drivers and field operations).
- **Session Management**: Short-lived JWT Access Tokens (HS256 HMAC, 30 min expiry) paired with opaque Refresh Tokens (stored as SHA-256 hashes in PostgreSQL with 7-day expiry and single-use rotation).
- **Security Controls**: Redis-backed rate limiting (maximum 3 OTP requests per 10-minute window) and brute-force lockout (30-minute lockout after 5 consecutive failed attempts).
- **Local Dev Friendly**: When running locally without paid SMS credentials, generated OTPs are printed directly to the FastAPI server console while still queuing background delivery if SMS credentials are provided.

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│  React Native / │ ────> │  FastAPI Server │ ────> │  PostgreSQL (Docker) │
│  Expo Frontend  │ <──── │  (:8000)        │       │  (:5432)             │
└─────────────────┘       └────────┬────────┘       └──────────────────────┘
                                   │
                                   ├──────────────> ┌──────────────────────┐
                                   │                │  Redis (Docker)      │
                                   │                │  (:6379)             │
                                   │                └──────────────────────┘
                                   ▼
                          ┌─────────────────┐
                          │ Twilio / MSG91  │
                          │ (or Dev Console)│
                          └─────────────────┘
```

---

## 1. Quick Start: Local Docker Setup

A complete `docker-compose.yml` is configured in the root of the project to run both PostgreSQL 15 and Redis 7 with persistent storage.

### Start the containers
```bash
docker compose up -d
```

### Verify containers are healthy
```bash
docker ps
```
You should see:
- `renttrack-postgres` listening on `0.0.0.0:5432->5432/tcp`
- `renttrack-redis` listening on `0.0.0.0:6379->6379/tcp`

### Useful Docker commands
- Stop containers: `docker compose down`
- Stop and wipe data volumes: `docker compose down -v`
- View logs: `docker compose logs -f`

---

## 2. Environment Configuration (`.env`)

Verify or update `.env` in the repository root:

```env
# ─── Database (PostgreSQL on Docker) ──────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://tms:tms@localhost:5432/tms

# ─── Redis (Docker) ───────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ─── JWT / Auth Secrets ───────────────────────────────────────────────────────
# Generate a secure 32-byte hex key with: openssl rand -hex 32
SECRET_KEY=e834b6f1947e4ad08be65cf572d8a436283b9c7df62a6d71b30df4ea61bb819c
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ─── OTP Security Settings ─────────────────────────────────────────────────────
OTP_EXPIRE_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RATE_LIMIT_COUNT=3
OTP_RATE_LIMIT_WINDOW_MINUTES=10
OTP_LOCKOUT_MINUTES=30

# ─── SMS Provider (Twilio or MSG91) ───────────────────────────────────────────
# For local dev without Twilio, leave as-is: OTPs print to the console!
SMS_PROVIDER=twilio
SMS_API_KEY=your_twilio_auth_token
SMS_API_SECRET=your_twilio_account_sid
SMS_FROM_NUMBER=+1234567890

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8081,http://localhost:19006
```

---

## 3. Database Migrations & Initial Data Seeding

Once Docker containers are running, apply all database migrations:

```bash
# 1. Run Alembic migrations
.\venv\Scripts\alembic upgrade head
```

### Seed Default Accounts
We have provided a seed script (`scripts/seed_data.py`) to create an organization and active user accounts for testing:

```bash
# 2. Run seed script
.\venv\Scripts\python -m scripts.seed_data
```

This creates the following verified accounts:

| Role | Email | Mobile Number | Password |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@renttrack.com` | `9000000001` | `Password123!` |
| **Admin** | `admin@renttrack.com` | `9000000002` | `Password123!` |
| **Driver / User** | `driver@renttrack.com` | `9000000003` | `Password123!` |

*(Company: `RentTrack Logistics`, Status: `active`)*

---

## 4. Running the Backend API

Start the FastAPI application:

```bash
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Base URL: `http://localhost:8000/api/v1`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

## 5. Testing the Authentication API (Step-by-Step)

### Flow A: Email + Password 2FA Login

#### 1. Submit Email & Password
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@renttrack.com",
    "password": "Password123!"
  }'
```
**Response:**
```json
{
  "message": "Verification code sent to your mobile.",
  "mobile_hint": "***0002"
}
```
*(In your backend terminal, look for: `[SMS] Verification OTP for admin@renttrack.com (9000000002): 123456`)*

#### 2. Verify OTP and Obtain Tokens
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@renttrack.com",
    "otp": "<OTP_FROM_CONSOLE>"
  }'
```
**Response:**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "5e171e16-...",
  "token_type": "bearer",
  "role": "admin",
  "user_id": "c1f7b8d4-..."
}
```

---

### Flow B: Phone-Only OTP Login

#### 1. Request OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "9000000001"
  }'
```
*(Look in the backend terminal for: `[SMS] Dispatching OTP to 9000000001: 654321`)*

#### 2. Verify OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "9000000001",
    "otp": "<OTP_FROM_CONSOLE>"
  }'
```

---

### Flow C: Access Protected Profile (`/auth/me`)

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### Flow D: Refresh Token Rotation

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<REFRESH_TOKEN>"
  }'
```

---

### Flow E: Forgot Password & Reset

#### 1. Request Password Reset OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "9000000002"
  }'
```

#### 2. Reset Password with OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "9000000002",
    "otp": "<OTP_FROM_CONSOLE>",
    "new_password": "NewSecurePassword456!"
  }'
```

---

## 6. Frontend Integration (`frontend/.env`)

To point the React Native / Expo application to your real local backend instead of mock data:

1. Open `frontend/.env`:
   ```env
   # Disable the offline mock backend
   EXPO_PUBLIC_USE_MOCK_API=false

   # Local API endpoint
   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

2. Note for Mobile Physical Devices / Emulators:
   - If running in an **Android Emulator**, use `http://10.0.2.2:8000/api/v1` instead of `localhost`.
   - If running on a **Physical Phone (Expo Go)**, use your machine's local LAN IP (e.g. `http://192.168.1.50:8000/api/v1`).

3. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

---

## 7. Production SMS Provider Configuration

When moving to production, replace dummy SMS credentials in `.env`:

### Twilio
```env
SMS_PROVIDER=twilio
SMS_API_SECRET=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # Twilio Account SID
SMS_API_KEY=your_twilio_auth_token                  # Twilio Auth Token
SMS_FROM_NUMBER=+1234567890                         # Twilio Phone Number
```

### MSG91
```env
SMS_PROVIDER=msg91
SMS_API_KEY=your_msg91_authkey                      # MSG91 AuthKey
SMS_FROM_NUMBER=TMSSVC                              # Approved Sender ID / Header
```
*(Templates and flow IDs are mapped in `app/services/sms_service.py`)*.

---

## 8. Troubleshooting & FAQ

* **429 Too Many Requests**: You hit the OTP rate limit (3 requests per 10 minutes) or account lockout. Flush Redis key using `docker exec -it renttrack-redis redis-cli FLUSHALL` to reset in local dev.
* **Database Connection Refused**: Verify PostgreSQL container is running (`docker compose ps`) and port 5432 is not occupied by a native PostgreSQL installation.
* **Cannot Log In / 403 Forbidden**: Newly registered users have `status="pending"`. Only active/approved users can log in. Use the seeded `superadmin@renttrack.com` account or approve pending registrations via `POST /api/v1/registration/{id}/approve`.
