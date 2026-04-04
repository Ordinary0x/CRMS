# CRMBS DB Design, Queries, Indexing, and Conflict Resolution

This document explains the database design used in CRMBS, including normalization, indexing, critical query patterns, and DB-level conflict handling.

## 1) Database Overview

- Engine: PostgreSQL
- Core domain: resource booking with role-based approvals and auditability
- Key goals:
  - prevent overlapping bookings
  - support multi-step approvals
  - keep strong audit trail
  - support fast filtered queries for admin/hod/rm dashboards

## 2) Schema and Normalization

Main tables:

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

Normalization approach:

- Lookup values extracted to separate tables (`booking_status`, `priority`) instead of storing repeated status strings everywhere.
- Department is separated and referenced by FK in users/resources.
- Resource categories are separated and referenced by FK in resource.
- Approval steps are modeled in separate `approval` rows instead of denormalized booking columns.
- Result: mostly 3NF-style structure with reduced redundancy and cleaner updates.

## 3) Indexing Strategy

Used indexes:

- `idx_resource_category` on `resource(category_id)`
- `idx_resource_features` (GIN) on `resource(features)` for JSONB filtering
- `idx_booking_resource_time` on `(resource_id, date, start_time, end_time)`
- `idx_booking_user` on `booking(user_id)`
- `idx_booking_status` on `booking(status_id)`
- `idx_mv_util` unique index on materialized view `mv_resource_utilization(resource_id, week_start)`

Why:

- resource search and category filters are frequent.
- booking conflict checks and availability checks require fast time-range scans per resource/date.
- dashboards and user pages filter by user/status heavily.

## 4) DB-Level Conflict Resolution

### 4.1 Stored Procedure (`create_booking`)

Booking creation goes through `create_booking(...)` and performs:

1. time-order check (`start_time < end_time`)
2. advance-window validation from `resource_category.advance_days`
3. blackout period check
4. recurring maintenance/unavailability check
5. advisory lock (`pg_advisory_xact_lock(resource_id)`) to serialize concurrent requests for same resource
6. overlap check against existing `Pending/Approved` bookings
7. inserts booking + notifications + approval step row if needed

### 4.2 Exclusion Constraint (hard DB guard)

To protect at pure DB level even if app logic is bypassed:

- `booking` has `is_slot_blocking BOOLEAN`
- trigger `trg_set_booking_blocking_flag` sets it true for `Pending/Approved`, false otherwise
- exclusion constraint:

```sql
EXCLUDE USING gist (
  resource_id WITH =,
  tsrange(date + start_time, date + end_time) WITH &&
) WHERE (is_slot_blocking)
```

This blocks overlapping active slots directly at DB level.

### 4.3 Why both advisory lock + exclusion constraint?

- Advisory lock reduces race windows and gives cleaner app-level conflict behavior.
- Exclusion constraint is final consistency guardrail.
- Together they provide strong correctness under concurrency.

## 5) Audit Integrity

`audit_log` is append-only in practice:

- rule `no_update_audit`: updates become no-op
- rule `no_delete_audit`: deletes become no-op
- triggers on `users`, `resource`, `booking` write change snapshots into `audit_log`

This preserves historical change records.

## 6) Materialized View for Analytics

`mv_resource_utilization` aggregates usage by week/resource/category from approved/completed bookings.

Benefits:

- faster analytics reads
- reduced repeated aggregation overhead in dashboard queries

## 7) Important Query Patterns Used

### Auth/profile

- `SELECT * FROM users WHERE email = $1`
- `SELECT * FROM users WHERE firebase_uid = $1`
- profile join with department:
  - `users LEFT JOIN department`

### Admin filters

- users with dynamic filters (`role`, `department_id`, `is_active`, `search`)
- bookings with dynamic filters (`status`, `resource_id`, `user_id`, date range)
- audit log with filters (`table_name`, `operation`, pagination)

### HOD scope

- users/bookings filtered by `department_id`
- step-2 approvals filtered by resource/requester department

### RM scope

- resources where `manager_id = current_user`
- step-1 approvals on managed resources

### Resource discovery

- list with `category_id`, `min_capacity`, text search
- per-resource availability from `booking` + status conditions

### Booking operations

- create via stored procedure
- list own bookings with optional status/date filters
- cancel rules enforce state/time constraints

### Notifications

- list recent notifications by user
- mark read by setting `read_at`
- unread count via `read_at IS NULL`

## 8) API/DB Behavior Verified

Verified with live local testing:

- overlap conflict returns `409` with alternatives
- no overlap rows exist for active statuses on same slot
- exclusion constraint exists and blocks conflicting inserts
- role-scoped data filters work (admin/hod/rm/student/faculty)
- approval transitions update booking statuses correctly
- notification read/unread behavior works with `read_at`
- audit rows are not mutable by update/delete

## 9) Notes for Future Improvements

- schedule periodic refresh for materialized view
- add more covering indexes after production query profiling
- optional table partitioning for booking history at high scale
- optional stricter RLS if DB users are split per service

