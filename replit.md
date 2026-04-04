# CRMBS — Campus Resource Management and Booking System

## Overview

pnpm workspace monorepo using TypeScript. Full-stack application for NIT Calicut covering resource booking, multi-step approvals, analytics, notifications, and department management.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Replit built-in)
- **Auth**: Custom JWT (bcryptjs + jsonwebtoken) — no Firebase
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/`)
- **Build**: esbuild (CJS bundle for API server)
- **Charts**: Recharts

## Artifacts

| Artifact | URL | Port |
|---|---|---|
| Frontend (crmbs) | `/` | 18817 |
| API Server | `/api/*` (proxied) | 8080 |

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@nitc.ac.in` | `Admin@123` |
| HOD (CSE) | `hod.cse@nitc.ac.in` | `Test@123` |
| Resource Manager (CSE) | `rm.cse@nitc.ac.in` | `Test@123` |
| Faculty (CSE) | `faculty.cse@nitc.ac.in` | `Test@123` |
| Student (CSE) | `student@nitc.ac.in` | `Test@123` |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Authentication
- JWT tokens stored in `localStorage`
- Token injected via `setAuthTokenGetter` from `@workspace/api-client-react`
- `JWT_SECRET` defaults to `crmbs-dev-secret-change-in-production`
- `firebase_uid` column kept for schema compatibility, populated with `randomUUID()` for new users

### Database
- Auto-migration on startup via `artifacts/api-server/src/db-migrate.ts`
- Creates: users, booking, approval, resource, resource_category, notification, audit_log, booking_status, department, blackout_period, resource_unavailability
- Seed data: 3 departments, 5 resource categories, 7 campus resources

### Approval Flow
- `resource_category.approval_steps` controls number of approval steps (0–2)
- Step 1: Resource Manager approves
- Step 2: HOD approves (for resources requiring 2-step approval)

### Role Hierarchy
- `admin` (priority 4) — full system access
- `hod` (priority 1) — department management, step-2 approvals
- `resource_manager` (priority 2) — resource management, step-1 approvals
- `faculty`/`staff` (priority 3) — booking
- `student` (priority 5) — booking

## Key Files

- `artifacts/api-server/src/db-migrate.ts` — database migrations and seed data
- `artifacts/api-server/src/routes/` — all API routes (auth, admin, hod, rm, staff, resources, notifications, analytics)
- `artifacts/crmbs/src/components/providers/AuthProvider.tsx` — JWT auth context
- `lib/api-client-react/src/index.ts` — exports `customFetch`, `setAuthTokenGetter`, generated hooks
- `lib/api-client-react/src/generated/api.ts` — Orval-generated typed API hooks

## Pages Status

All pages implemented with real API data:
- **Admin**: Dashboard, Users, Resources, Bookings, Departments, Blackouts, Audit Log, Analytics
- **HOD**: Dashboard, Approvals, Users, Bookings, Analytics
- **RM**: Dashboard, Approvals, Resources, Analytics
- **Staff/Faculty**: Dashboard, Search, Book, My Bookings, Notifications
- **Student**: Same as Staff/Faculty
