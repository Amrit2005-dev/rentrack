# Deploy the backend on Render

## 1. Push the repository

Create or select the GitHub repository, then push this project to its `main` branch. The repository root must contain `render.yaml`, `requirements.txt`, `alembic.ini`, and the `app/` package.

## 2. Create the Render services

In Render, choose **New > Blueprint** and select the repository. Render will read `render.yaml` and create:

- `renttrack-api`, a Python web service
- `renttrack-web`, an Expo web static site

The PostgreSQL database is hosted separately on Neon. The Blueprint asks you to provide its connection string as a secret environment variable.

The web service runs migrations during its build and starts with Uvicorn. The health check is `GET /health`.
The frontend is built with `npm ci && npm run build` and served from `frontend/dist`.

## 3. Configure required environment variables

Set these values in the `renttrack-api` service:

- `DATABASE_URL`: the Neon PostgreSQL connection string. Use the connection string from your Neon project; the backend converts it for its async PostgreSQL driver.
- `REDIS_URL`: a managed Redis URL, such as an Upstash Redis `rediss://` URL. Render Redis is not declared in this Blueprint, so provide this value manually.
- `CORS_ORIGINS`: the deployed frontend origin, for example `https://your-frontend.example.com`. Add more origins as a comma-separated list if needed.
- `PUBLIC_BASE_URL`: the API URL, for example `https://renttrack-api.onrender.com`.
- `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_REGION`: production S3-compatible storage credentials.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: email delivery values, if email delivery is enabled.
- SMS provider values from `.env.example` if production SMS is enabled.

The Blueprint generates `SECRET_KEY`. Keep the Neon connection string private and do not commit it to the repository. If a connection password has been exposed, reset it in Neon before deploying.

Keep `SHOW_TEST_OTP=false` in production. Only enable it in a private local environment.

## 4. Verify the deployment

After deployment, check:

- `https://your-api.onrender.com/health`
- `https://your-api.onrender.com/docs`
- `https://your-api.onrender.com/api/v1/openapi.json`

Inspect the deploy logs if migrations or startup fail. The build command is:

```bash
pip install -r requirements.txt && alembic upgrade head
```

The start command is:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## 5. Point the Expo frontend at Render

In `frontend/.env` for local web testing, set:

```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_URL=https://your-api.onrender.com/api/v1
```

For an Expo/EAS build, set the same URL in the relevant `eas.json` profile. Add the resulting frontend origin to the backend `CORS_ORIGINS` value.

## 6. Create the Neon schema or import existing data

Create a Neon project and database. Choose one of these paths:

- **New database:** add the Neon PostgreSQL connection string as `DATABASE_URL` in Render. On deploy, `alembic upgrade head` creates/updates all application tables. No manual SQL import is needed.
- **Existing local data:** restore it into an empty Neon database *before* setting `DATABASE_URL` in Render or deploying. The restore includes the source schema and Alembic revision; the first Render deploy then applies any newer migrations.

To import the local Docker database, use PowerShell with Docker and PostgreSQL client tools installed. Use Neon’s direct (unpooled) connection string for the restore, and do not restore into a database that already contains tables or records:

```powershell
docker compose up -d postgres
docker exec renttrack-postgres pg_dump -U tms -d tms --format=custom --no-owner --no-privileges --file=/tmp/renttrack.dump
docker cp renttrack-postgres:/tmp/renttrack.dump .\renttrack.dump
```

Restore using the Neon PostgreSQL connection string (not the `postgresql+asyncpg` SQLAlchemy form):

```powershell
pg_restore --no-owner --no-privileges --dbname "<NEON_POSTGRESQL_URL>" .\renttrack.dump
```

After the restore, set Neon’s connection string as `DATABASE_URL` in Render and deploy. Do not commit `renttrack.dump`; it can contain private customer data.

To add the optional development accounts to a new database, run `python -m scripts.seed_data` with `DATABASE_URL` set to Neon. These are test credentials; change or remove them before production use.

## Notes

- `docker-compose.yml` is for local PostgreSQL and Redis only; Render does not use it.
- Local `uploads/` storage is not durable on Render. Use S3-compatible storage for vehicle images and documents.
- Render free services may sleep when idle, so the first request after inactivity can be slow.
