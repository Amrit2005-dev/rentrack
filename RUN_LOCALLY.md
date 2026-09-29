# RentTrack TMS — Local Laptop Launch Guide

This guide enables anyone to clone and run the complete RentTrack Transportation Management System on their laptop (Windows, macOS, or Linux) in under 5 minutes.

---

## 📋 Prerequisites

Ensure you have the following installed on your laptop:
1. **Docker Desktop** (running) — [Download Docker](https://www.docker.com/products/docker-desktop/)
2. **Python 3.11, 3.12, or 3.13** — [Download Python](https://www.python.org/)
3. **Node.js 18+ & npm** *(only if running the frontend mobile/web app)* — [Download Node.js](https://nodejs.org/)
4. **Git**

---

## 🚀 Quick Launch in 5 Steps

### Step 1: Clone the Repo & Enter Directory
```bash
git clone <your-repository-url>
cd renttrack
```

---

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux:**
```bash
cp .env.example .env
```

> **Note:** The default `.env.example` is pre-configured to connect to the local Docker database and Redis out of the box. No manual edits are required to get started!

---

### Step 3: Start Database & Redis (Docker)
Ensure Docker Desktop is running, then start the containers in the background:

```bash
docker compose up -d
```

Verify the containers are healthy:
```bash
docker ps
```
You should see:
- `renttrack-postgres` running on port `5432`
- `renttrack-redis` running on port `6379`

---

### Step 4: Setup Python Environment & Run Migrations

#### A. Create and activate a virtual environment:

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### B. Install dependencies:
```bash
pip install -r requirements.txt
```

#### C. Run Database Migrations:
```bash
alembic upgrade head
```

#### D. Seed Initial Accounts:
Run the seed script to automatically create an initial organization and active testing accounts:
```bash
python -m scripts.seed_data
```

This creates the following ready-to-use accounts:

| Role | Email | Mobile | Password |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@renttrack.com` | `9000000001` | `Password123!` |
| **Admin** | `admin@renttrack.com` | `9000000002` | `Password123!` |
| **Driver / User** | `driver@renttrack.com` | `9000000003` | `Password123!` |

---

### Step 5: Start the Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

* **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health) (`{"status": "ok"}`)
* **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔑 How Authentication Works Locally

1. **Email + Password 2FA Login**:
   - Make a `POST` request to `/api/v1/auth/login` with your email and password.
   - The backend generates a secure 6-digit OTP and prints it directly to your terminal:
     ```
     [SMS] Verification OTP for admin@renttrack.com (9000000002): 482910
     ```
   - Submit the OTP to `/api/v1/auth/login/verify` to receive your JWT access and refresh tokens.

2. **Phone-Only OTP Login**:
   - `POST /api/v1/auth/request-otp` with `{"mobile_number": "9000000001"}`.
   - Read the OTP from the terminal output.
   - Submit to `POST /api/v1/auth/verify-otp`.

*(No paid SMS provider or credit card required for local development!)*

---

## 📱 (Optional) Launch Frontend App

To run the React Native / Expo frontend:

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Copy the frontend environment template:
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```

   In `frontend/.env`, set:
   ```env
   EXPO_PUBLIC_USE_MOCK_API=false
   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

3. Install frontend dependencies and start Expo:
   ```bash
   npm install
   npm start
   ```

   - Press `w` to open in your web browser.
   - Or scan the QR code using the **Expo Go** mobile app on iOS or Android.
   *(If using Expo Go on a physical phone, ensure your phone and laptop are on the same Wi-Fi network and replace `localhost` in `EXPO_PUBLIC_API_URL` with your laptop's local IP address, e.g. `http://192.168.1.50:8000/api/v1`).*

---

## 🛑 Stopping the Services

To stop Docker containers:
```bash
docker compose down
```

To stop containers and wipe the database volumes:
```bash
docker compose down -v
```

---

## 🛠️ Common Troubleshooting

- **Port 5432 already in use**:
  If you already have a local PostgreSQL instance running natively on your laptop, stop it or change the port mapping in `docker-compose.yml` to `"5433:5432"` and update `DATABASE_URL` in `.env` to `5433`.
- **429 Too Many Requests (Rate Limit / Lockout)**:
  If you trigger the OTP rate limit (3 attempts per 10 mins) or brute-force lockout while testing, flush Redis:
  ```bash
  docker exec -it renttrack-redis redis-cli FLUSHALL
  ```
