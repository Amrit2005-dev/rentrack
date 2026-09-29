# Automating the App Flow with Playwright

We have successfully set up the End-to-End (E2E) testing framework using **Playwright**. The infrastructure allows you to run a complete suite of tests against the web frontend, powered by an isolated test database and backend instance, ensuring that you don't pollute your local development database.

## What's Included
1. **Playwright Setup**: Configured in `frontend/playwright.config.js` to automatically spin up the Expo web server on port 8081.
2. **Database Seeding**: A python script `scripts/seed_test_db.py` that automatically creates a test `Company` and a Super Admin `User` before the tests begin.
3. **Authentication Tests**: Located in `frontend/e2e/auth.spec.js`, these tests verify the login flow using the seeded admin credentials.

## How to Run the Tests Locally

Open a PowerShell terminal in the root of the project and execute the following commands:

### 1. Start the Isolated Test Databases
We have configured a separate docker-compose file (`docker-compose.test.yml`) that runs Postgres on port 5433 and Redis on port 6380.
```powershell
docker compose -f docker-compose.test.yml up -d
```

### 2. Setup the Test Database Schema
Set the environment variables to point to the test database and run the migrations and seed script:
```powershell
$env:DATABASE_URL="postgresql+asyncpg://tms:tms@localhost:5433/tms"
$env:REDIS_URL="redis://localhost:6380/0"
$env:SECRET_KEY="e2e_test_secret"

.\venv\Scripts\alembic.exe upgrade head
.\venv\Scripts\python.exe scripts\seed_test_db.py
```

### 3. Start the Backend API
Start the FastAPI server connected to the test database.
```powershell
.\venv\Scripts\uvicorn.exe app.main:app --port 8000
```

### 4. Run Playwright
Open a **new** terminal, navigate to the `frontend` folder, and run Playwright. The Playwright configuration is set up to automatically start the Expo web server (`npm run web`) if it isn't already running.
```powershell
cd frontend
npx playwright test

# To see a visual report of the tests (and traces of any failures):
npx playwright show-report
```

### 5. Cleanup
When you're finished, you can stop the backend server (`Ctrl+C`) and tear down the test databases:
```powershell
docker compose -f docker-compose.test.yml down
```
