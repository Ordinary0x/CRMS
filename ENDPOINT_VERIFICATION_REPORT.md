# CRMBS Final Endpoint and Feature Verification Report

This report captures final verification done after implementing bug fixes and requested improvements.

Environment used for verification:

- API: `http://127.0.0.1:5000`
- DB: PostgreSQL `127.0.0.1:5433`, database `crmbs`

## 1) Authentication and Registration

Verified:

- `POST /api/auth/login` works for admin/hod/rm/faculty/student and seeded department-specific HOD/RM users.
- `POST /api/auth/register` now creates users as active by default with role `student`.
- `GET /api/auth/me` works for active/inactive profile flow.

Result:

- Register returns `201`; `is_active = true` by default.

## 2) Booking Conflict and Cancellation

Verified:

- Student vs Student overlap booking: `409`
- Faculty vs Student overlap booking: `409`
- Pending bookings block same-slot inserts.
- Cancel endpoint `PATCH /api/bookings/:id/cancel` works and updates status to `Cancelled`.

Result:

- Conflict prevention is consistent in API and DB.
- Cancel operation is functioning as expected.

## 3) Resource Approval Flow Behavior

Verified:

- Per-resource approval override support (0/1/2 steps) added.
- CSE Smart Classroom configured to require 2-step path.
- Admin-created resources can set explicit approval flow.

Result:

- Approval strategy is no longer category-only; resource-level policy works.

## 4) Department-Specific HOD/RM Scoping

Verified:

- HOD users and approvals scoped by department.
- ECE HOD no longer receives unrelated CSE step-2 approvals.
- ECE end-to-end flow tested:
  - ECE user booking
  - ECE RM step-1 approve
  - ECE HOD sees pending step-2

Result:

- Multi-department flow (CSE/ECE/MECH) works.

## 5) Admin Resource Management

Verified:

- Admin resource create endpoint added:
  - `POST /api/admin/resources`
- Admin resource update endpoint added:
  - `PATCH /api/admin/resources/:id`

Result:

- Admin can create resources directly and set manager/department/approval override.

## 6) Inactive and Availability Visibility

Verified:

- RM can set owned resource inactive and still see it in RM list.
- Inactive resources cannot be booked.

Result:

- Visibility and booking restrictions for inactive resources are correct.

## 7) Blackout Behavior

Verified:

- Admin blackout create/delete works.
- Booking during blackout returns `400` with proper message.

Result:

- Blackout enforcement is functioning.

## 8) Frontend UX/Navigation Fixes

Implemented and validated by build/typecheck and endpoint flow:

- Logout now forces redirect to `/login`.
- Profile page added for staff/student/faculty.
- Profile access entry added in user menu.
- Not-found refresh mitigation:
  - SPA fallback support file `_redirects` added for static hosts.
  - fallback route redirects authenticated users to role dashboard.
- Staff booking step now blocks progression on detected conflicts.
- Inactive state shown in search cards.
- 12-hour time display applied in booking UI paths.

## 9) Analytics and Notifications

Previously verified endpoints remain operational:

- utilization/by-department/busiest-resources/approval-stats role scoped
- notifications list/read/read-all/unread-count

## 10) Final API Smoke Status (Critical Flows)

Critical paths verified with live calls:

- health: `200`
- auth login/register/me: `200/201`
- booking create conflict: `409`
- booking cancel: `200`
- admin resource create: `201`
- hod approvals pending (dept scope): correct
- blackout block booking: `400`
- inactive resource booking attempt: `400`

### Targeted final regression rerun (2026-04-06)

A targeted regression script was executed against a fresh backend instance on `http://127.0.0.1:5050/api` covering:

- auth (admin/rm/hod/faculty/student login + `/auth/me`)
- booking conflict and cancellation
- admin resource CRUD (create/update/read/reactivate)
- approval flow (student create -> RM step-1 approve -> HOD step-2 approve -> final Approved)

Result:

- `25/25` checks passed.

Fixes applied during this rerun:

- `POST /bookings` now reports effective approval steps using `COALESCE(resource.approval_steps_override, category.approval_steps)`.
- RM step-1 decision flow now uses effective approval steps, so two-step resources correctly route to HOD pending queue.

## 11) Deployment Routing Note

For static hosting, ensure SPA rewrite is configured:

- source: `/*`
- destination: `/index.html`
- action: `Rewrite`

Without rewrite, refresh on nested routes can show 404/not-found.
