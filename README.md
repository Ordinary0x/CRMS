# Campus Resource Management and Booking System (CRMBS)

This project is running locally as a full-stack app with separate frontend, backend, and database folders.

## Folder Structure

- `frontend/` - frontend runtime folder
  - `frontend/client` -> symlink to `artifacts/crmbs`
  - `frontend/client.log` - frontend logs
- `backend/` - backend runtime folder
  - `backend/server` -> symlink to `artifacts/api-server`
  - `backend/server.log` - backend logs
- `db/` - local PostgreSQL runtime folder
  - `db/postgres-data/` - database data directory
  - `db/postgres.log` - database logs

## Prerequisites

- Node.js >= 20
- npm (for `npx pnpm`)
- PostgreSQL binaries available in PATH (`initdb`, `pg_ctl`, `psql`)

## Install Dependencies

From project root:

```bash
npx pnpm install
```

## Firebase Setup (Frontend + Token Verification)

Firebase is integrated in frontend (`artifacts/crmbs/src/lib/firebase.ts`) and backend token verification (`artifacts/api-server/src/middlewares/verifyToken.ts`).

Frontend Firebase variables are required at build/runtime. Copy:

```bash
cp artifacts/crmbs/.env.example artifacts/crmbs/.env
```

### Frontend env

- `VITE_API_BASE_URL` (for static deploys, set to your backend URL, e.g. `https://crms-api.onrender.com`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Backend env

- `FIREBASE_PROJECT_ID` (default currently `dbms-9403e`)

## Start Database

First-time init only:

```bash
initdb -D "db/postgres-data"
createdb -h "db" -p 5433 crmbs
```

Start PostgreSQL:

```bash
pg_ctl -D "db/postgres-data" -l "db/postgres.log" -o "-p 5433 -k $(pwd)/db" start
```

Stop PostgreSQL:

```bash
pg_ctl -D "db/postgres-data" stop
```

## Start Backend

```bash
PORT=5000 \
DATABASE_URL=postgresql://sharad@127.0.0.1:5433/crmbs \
JWT_SECRET=crmbs-local-dev \
FIREBASE_PROJECT_ID=dbms-9403e \
npx pnpm --filter @workspace/api-server run dev
```

Backend health endpoint:

- `http://127.0.0.1:5000/api/healthz`

## Start Frontend

```bash
PORT=5173 \
BASE_PATH=/ \
VITE_API_PROXY_TARGET=http://127.0.0.1:5000 \
npx pnpm --filter @workspace/crmbs run dev
```

Frontend URL:

- `http://127.0.0.1:5173`

## Test Accounts

- Admin: `admin@nitc.ac.in` / `Admin@123`
- HOD: `hod.cse@nitc.ac.in` / `Test@123`
- Resource Manager: `rm.cse@nitc.ac.in` / `Test@123`
- Faculty: `faculty.cse@nitc.ac.in` / `Test@123`
- Student: `student@nitc.ac.in` / `Test@123`

## Logs

- Backend: `backend/server.log`
- Frontend: `frontend/client.log`
- DB: `db/postgres.log`

## Quick Endpoint Check

```bash
curl -s http://127.0.0.1:5000/api/healthz
```
