# Endpoint Verification Report (Local)

Environment verified on local setup:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:5000`
- DB: PostgreSQL `127.0.0.1:5433`, database `crmbs`

## Status Summary

All core endpoint groups were verified with live requests and role-based tokens.

## 1) Health

- `GET /api/healthz` -> `200`

## 2) Auth

Verified for all seeded roles:

- `POST /api/auth/login` -> `200`
- `GET /api/auth/me` -> `200` for admin/hod/rm/faculty/student
- `POST /api/auth/register` -> `201` (new user flow tested)

Inactive behavior verified:

- Inactive user can still access `/api/auth/me` (for pending page flow) -> `200`
- Inactive user blocked from protected route (`/api/bookings`) -> `403`

## 3) Admin Endpoints

Verified:

- `GET /api/admin/users` -> `200`
- `PATCH /api/admin/users/:id/role` -> `200`
- `DELETE /api/admin/users/:id` -> `200`
- `GET /api/admin/departments` -> `200`
- `POST /api/admin/departments` -> `201`
- `PATCH /api/admin/departments/:id` -> `200`
- `GET /api/admin/blackout` -> `200`
- `POST /api/admin/blackout` -> `201`
- `DELETE /api/admin/blackout/:id` -> `200`
- `GET /api/admin/audit-log` -> `200`
- `GET /api/admin/bookings` -> `200`
- `PATCH /api/admin/bookings/:id/cancel` -> `200`
- `GET /api/admin/dashboard` -> `200`

## 4) HOD Endpoints

Verified:

- `GET /api/hod/users` -> `200`
- `PATCH /api/hod/users/:id/activate` -> `200`
- `GET /api/hod/approvals/pending` -> `200`
- `POST /api/hod/approvals/:id/decide` -> `200`
- `GET /api/hod/bookings` -> `200`
- `GET /api/hod/analytics` -> `200`
- `GET /api/hod/dashboard` -> `200`

Validation check:

- rejection without remarks -> `400` as expected

Department scope check:

- HOD users endpoint returned no outside-department users.

## 5) Resource Manager Endpoints

Verified:

- `GET /api/rm/resources` -> `200`
- `POST /api/rm/resources` -> `201`
- `PATCH /api/rm/resources/:id` -> `200`
- `PATCH /api/rm/resources/:id/status` -> `200`
- `POST /api/rm/resources/:id/unavailability` -> `201`
- `DELETE /api/rm/resources/:id/unavailability/:uid` -> `200`
- `GET /api/rm/approvals/pending` -> `200`
- `POST /api/rm/approvals/:id/decide` -> `200`
- `GET /api/rm/analytics` -> `200`
- `GET /api/rm/dashboard` -> `200`

Authorization check:

- non-RM trying RM unavailability endpoint -> `403`

## 6) Resources Endpoints

Verified:

- `GET /api/resources` -> `200`
- `GET /api/resources/categories` -> `200`
- `GET /api/resources/:id` -> `200`
- `GET /api/resources/:id/availability?date=...` -> `200`

Filtering check:

- category/capacity/search filters returned expected filtered records.

## 7) Bookings Endpoints

Verified:

- `POST /api/bookings` -> `201`
- conflict create booking -> `409` with alternatives payload
- `GET /api/bookings` -> `200`
- `GET /api/bookings/:id` (owner) -> `200`
- `GET /api/bookings/:id` (non-owner) -> `404`
- `PATCH /api/bookings/:id/cancel` -> `200`

## 8) Notifications Endpoints

Verified:

- `GET /api/notifications` -> `200`
- `PATCH /api/notifications/:id/read` -> `200`
- `PATCH /api/notifications/read-all` -> `200`
- `GET /api/notifications/unread-count` -> `200`
- backward alias `GET /api/notifications/count` -> `200`

Unread counter changed correctly after mark-read operations.

## 9) Analytics Endpoints

Verified:

- `GET /api/analytics/utilization` -> `200` (admin/rm), `403` (student)
- `GET /api/analytics/by-department` -> `200` (admin)
- `GET /api/analytics/busiest-resources` -> `200`
- `GET /api/analytics/approval-stats` -> `200`

## 10) Approval Flow Validation

Verified end-to-end:

- step-1 RM approve for 1-step category -> booking moved to `Approved`
- step-1 RM approve for 2-step category -> step-2 created, HOD sees pending
- step-2 HOD approve -> booking `Approved`
- RM reject path -> booking `Rejected`
- HOD reject path -> booking `Rejected`

## 11) Database-Level Conflict & Audit Checks

Verified in DB:

- exclusion constraint `no_overlap` exists on `booking`
- active overlap rows count in tested slot = `0`
- direct conflicting insert raises exclusion constraint violation
- audit rows exist for tracked tables
- `audit_log` update/delete attempts affect 0 rows (immutable behavior)

