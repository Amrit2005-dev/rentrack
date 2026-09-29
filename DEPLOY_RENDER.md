# Deploy the backend on Render

## 1. Push the repository

Create or select the GitHub repository, then push this project to its `main` branch. The repository root must contain `render.yaml`, `requirements.txt`, `alembic.ini`, and the `app/` package.

## 2. Create the Render services

In Render, choose **New > Blueprint** and select the repository. Render will read `render.yaml` and create:

- `renttrack-api`, a Python web service
- `renttrack-web`, an Expo web static site
- `renttrack-db`, a PostgreSQL database

The web service runs migrations during its build and starts with Uvicorn. The health check is `GET /health`.
The frontend is built with `npm ci && npm run build` and served from `frontend/dist`.

## 3. Configure required environment variables

Set these values in the `renttrack-api` service:

- `REDIS_URL`: a managed Redis URL, such as an Upstash Redis `rediss://` URL. Render Redis is not declared in this Blueprint, so provide this value manually.
- `CORS_ORIGINS`: the deployed frontend origin, for example `https://your-frontend.example.com`. Add more origins as a comma-separated list if needed.
- `PUBLIC_BASE_URL`: the API URL, for example `https://renttrack-api.onrender.com`.
- `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_REGION`: production S3-compatible storage credentials.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: email delivery values, if email delivery is enabled.
- SMS provider values from `.env.example` if production SMS is enabled.

The Blueprint generates `SECRET_KEY` and connects `DATABASE_URL` to the Render database. The application normalizes Render's standard Postgres URL for asyncpg automatically.

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

## 6. Move existing local database data

The Render database is new; Docker volumes are not uploaded automatically. To copy the current local PostgreSQL data:

```powershell
docker compose up -d postgres
docker exec renttrack-postgres pg_dump -U tms -d tms --format=custom --no-owner > renttrack.dump
```

Use the Render PostgreSQL **External Database URL** to restore the dump:

```powershell
pg_restore --clean --if-exists --no-owner --dbname "<RENDER_EXTERNAL_DATABASE_URL>" renttrack.dump
```

Do not commit `renttrack.dump`; it can contain private customer data.

## Notes

- `docker-compose.yml` is for local PostgreSQL and Redis only; Render does not use it.
- Local `uploads/` storage is not durable on Render. Use S3-compatible storage for vehicle images and documents.
- Render free services may sleep when idle, so the first request after inactivity can be slow.
