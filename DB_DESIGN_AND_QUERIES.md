# CRMBS Database Design and Query Report

This report documents the final database design used in the Campus Resource Management and Booking System (CRMBS), including schema design choices, normalization, indexing, core query patterns, and conflict resolution strategy.

## 1) Database Engine and Scope

- Engine: PostgreSQL 16+
- Design goals:
  - strict overlap prevention for booking slots
  - role-aware approvals
  - auditability and traceability
  - efficient filtered reads for role dashboards

## 2) Core Tables and Relationships

Primary transactional and master tables:

- `department`
- `users`
- `resource_category`
- `resource`
- `booking_status` (lookup)
- `priority` (lookup)
- `booking`
- `approval`
- `notification`
- `blackout_period`
- `resource_unavailability`
- `audit_log`
- `log`

### Key foreign keys

- `users.department_id -> department.department_id`
- `department.hod_id -> users.user_id`
- `resource.category_id -> resource_category.category_id`
- `resource.manager_id -> users.user_id`
- `resource.department_id -> department.department_id`
- `booking.user_id -> users.user_id`
- `booking.resource_id -> resource.resource_id`
- `booking.status_id -> booking_status.status_id`
- `approval.booking_id -> booking.booking_id`
- `approval.approver_id -> users.user_id`

## 3) Normalization Strategy

The schema follows practical 3NF patterns:

- Status and priority vocabularies are normalized into lookup tables (`booking_status`, `priority`).
- Department data is separated from user/resource entities.
- Resource category policy (`advance_days`, default `approval_steps`) is centralized in `resource_category`.
- Booking decisions are normalized into `approval` step records instead of denormalized approval columns in `booking`.

This reduces duplication and keeps updates consistent.

## 4) Approval Model

Approval behavior uses both category defaults and per-resource override:

- `resource_category.approval_steps` is system default
- `resource.approval_steps_override` allows resource-specific policy:
  - `0` = auto-approve
  - `1` = RM only
  - `2` = RM + HOD

Effective steps = `COALESCE(resource.approval_steps_override, resource_category.approval_steps)`.

## 5) Indexing and Performance

Implemented indexes:

- `idx_resource_category` on `resource(category_id)`
- `idx_resource_features` GIN on `resource(features)`
- `idx_booking_resource_time` on `booking(resource_id, date, start_time, end_time)`
- `idx_booking_user` on `booking(user_id)`
- `idx_booking_status` on `booking(status_id)`
- `idx_mv_util` unique index on materialized view `mv_resource_utilization(resource_id, week_start)`

Why these matter:

- fast resource filtering by category/features
- fast conflict/availability scans by resource and slot
- fast role dashboards by user and status

## 6) Booking Conflict Resolution (DB-Level)

Conflict safety is implemented in **three layers**:

### 6.1 Stored function path (`create_booking`)

`create_booking(...)` enforces:

1. start/end time ordering
2. advance window (`advance_days`)
3. blackout period block
4. recurring maintenance/unavailability block
5. advisory transaction lock on resource (`pg_advisory_xact_lock(resource_id)`)
6. overlap check against active slot-blocking bookings

### 6.2 Slot-blocking state column

- `booking.is_slot_blocking` marks whether the row should participate in overlap lock.
- Trigger `trg_set_booking_blocking_flag` updates this on insert/update based on status.
- `Pending`/`Approved` => slot-blocking true.

### 6.3 Exclusion constraint (hard guard)

`no_overlap` constraint:

```sql
EXCLUDE USING gist (
  resource_id WITH =,
  tsrange(date + start_time, date + end_time) WITH &&
) WHERE (is_slot_blocking)
```

This guarantees no overlapping active slots even if application logic is bypassed.

## 7) Blackout and Maintenance Rules

Booking rejection paths in `create_booking` include:

- category blackout period (`blackout_period`)
- per-resource recurring unavailability (`resource_unavailability`)
- inactive/maintenance resource state check

This ensures policy constraints are enforced before any booking row is inserted.

## 8) Audit and Immutability

Audit design:

- Trigger function `fn_audit_trigger()` writes old/new row snapshots for `users`, `resource`, and `booking`.
- Rules `no_update_audit` and `no_delete_audit` block mutation/deletion of audit entries.

Result: append-only audit trail semantics.

## 9) Materialized Analytics View

Materialized view: `mv_resource_utilization`

- Pre-aggregates weekly bookings and booked hours by resource/category.
- Improves role analytics endpoint performance.

## 10) Important Query Patterns in the App

### Auth and identity

- lookup by email and `firebase_uid`
- role/status enrichment with department join

### Admin operations

- dynamic filtered user queries (`role`, `department`, `is_active`, free text)
- system-wide booking filters (`status`, `user`, `resource`, date range)
- department CRUD and blackout CRUD

### HOD operations

- department-scoped users
- step-2 approvals scoped by **resource department**
- department-scoped bookings/analytics

### RM operations

- manager-owned resource listing and updates
- step-1 approvals scoped by managed resources
- recurring unavailability management

### Student/Faculty operations

- resource search + availability views
- create booking via stored function
- booking detail + approval trail + cancel rules

## 11) Constraints and Data Quality

Key checks and controls:

- role enum check in `users.role`
- resource status enum check in `resource.status`
- booking time order check (`start_time < end_time`)
- approval decision enum check
- blackout start/end date check
- unique email and unique firebase UID

## 12) Final Behavior Summary

Verified in final checks:

- student-student and faculty-student conflicts return `409`
- pending requests correctly block new requests in same slot
- cancellation works under policy rules
- resource approval can be configured per resource (0/1/2)
- multi-department HOD/RM flows work (CSE/ECE/MECH)
- inactive resources are visible and non-bookable
- blackout periods correctly reject booking requests
- audit logging remains append-only

## 13) Suggested Future Enhancements

- scheduled materialized view refresh job
- query plan profiling for additional composite indexes
- optional partitioning for high-volume booking history
- optional row-level security per role at DB level
