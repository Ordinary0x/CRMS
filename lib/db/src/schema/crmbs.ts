import {
  pgTable,
  serial,
  varchar,
  integer,
  smallint,
  boolean,
  text,
  timestamp,
  date,
  time,
  bigserial,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// We use raw SQL for the complex schema (exclusion constraints, stored procedures, etc.)
// These Drizzle tables are for basic ORM queries where convenient.

export const departmentTable = pgTable("department", {
  department_id: serial("department_id").primaryKey(),
  dept_name: varchar("dept_name", { length: 120 }).notNull().unique(),
  building: varchar("building", { length: 80 }),
  email: varchar("email", { length: 120 }),
  hod_id: integer("hod_id"),
});

export const usersTable = pgTable("users", {
  user_id: serial("user_id").primaryKey(),
  firebase_uid: varchar("firebase_uid", { length: 128 }).notNull().unique(),
  first_name: varchar("first_name", { length: 60 }).notNull(),
  last_name: varchar("last_name", { length: 60 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 30 }).notNull().default("student"),
  is_active: boolean("is_active").notNull().default(false),
  priority_level: smallint("priority_level").notNull().default(4),
  department_id: integer("department_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const resourceCategoryTable = pgTable("resource_category", {
  category_id: serial("category_id").primaryKey(),
  category_name: varchar("category_name", { length: 80 }).notNull().unique(),
  advance_days: smallint("advance_days").notNull().default(90),
  approval_steps: smallint("approval_steps").notNull().default(0),
});

export const resourceTable = pgTable(
  "resource",
  {
    resource_id: serial("resource_id").primaryKey(),
    resource_name: varchar("resource_name", { length: 120 }).notNull(),
    capacity: smallint("capacity").notNull(),
    location: varchar("location", { length: 120 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    features: jsonb("features").notNull().default({}),
    category_id: integer("category_id").notNull(),
    manager_id: integer("manager_id"),
    department_id: integer("department_id"),
  },
  (t) => [
    index("idx_resource_category").on(t.category_id),
    index("idx_resource_features").on(t.features),
  ],
);

export const bookingStatusTable = pgTable("booking_status", {
  status_id: serial("status_id").primaryKey(),
  status_name: varchar("status_name", { length: 30 }).notNull().unique(),
});

export const priorityTable = pgTable("priority", {
  priority_id: serial("priority_id").primaryKey(),
  priority_level: smallint("priority_level").notNull().unique(),
  description: varchar("description", { length: 60 }),
});

export const recurrenceTable = pgTable("recurrence", {
  recurrence_id: serial("recurrence_id").primaryKey(),
  rrule: text("rrule").notNull(),
  parent_booking_id: integer("parent_booking_id"),
});

export const bookingTable = pgTable(
  "booking",
  {
    booking_id: bigserial("booking_id", { mode: "number" }).primaryKey(),
    user_id: integer("user_id").notNull(),
    resource_id: integer("resource_id").notNull(),
    status_id: integer("status_id").notNull(),
    priority_level: smallint("priority_level").notNull().default(4),
    recurrence_id: integer("recurrence_id"),
    date: date("date").notNull(),
    start_time: time("start_time").notNull(),
    end_time: time("end_time").notNull(),
    purpose: text("purpose"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_booking_resource_time").on(
      t.resource_id,
      t.date,
      t.start_time,
      t.end_time,
    ),
    index("idx_booking_user").on(t.user_id),
    index("idx_booking_status").on(t.status_id),
  ],
);

export const approvalTable = pgTable("approval", {
  approval_id: serial("approval_id").primaryKey(),
  booking_id: integer("booking_id").notNull(),
  approver_id: integer("approver_id"),
  step_number: smallint("step_number").notNull(),
  decision: varchar("decision", { length: 20 }),
  remarks: text("remarks"),
  approval_time: timestamp("approval_time", { withTimezone: true }),
});

export const logTable = pgTable("log", {
  log_id: bigserial("log_id", { mode: "number" }).primaryKey(),
  user_id: integer("user_id"),
  booking_id: integer("booking_id"),
  action_type: varchar("action_type", { length: 60 }).notNull(),
  description: text("description"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

export const auditLogTable = pgTable("audit_log", {
  audit_id: bigserial("audit_id", { mode: "number" }).primaryKey(),
  table_name: varchar("table_name", { length: 60 }).notNull(),
  operation: varchar("operation", { length: 10 }).notNull(),
  old_data: jsonb("old_data"),
  new_data: jsonb("new_data"),
  changed_by: integer("changed_by"),
  changed_at: timestamp("changed_at", { withTimezone: true }).defaultNow(),
});

export const notificationTable = pgTable("notification", {
  notification_id: serial("notification_id").primaryKey(),
  user_id: integer("user_id").notNull(),
  message: text("message").notNull(),
  channel: varchar("channel", { length: 10 }).default("email"),
  status: varchar("status", { length: 20 }).default("pending"),
  retry_count: smallint("retry_count").default(0),
  sent_at: timestamp("sent_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  read_at: timestamp("read_at", { withTimezone: true }),
});

export const blackoutPeriodTable = pgTable("blackout_period", {
  blackout_id: serial("blackout_id").primaryKey(),
  category_id: integer("category_id"),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  reason: varchar("reason", { length: 200 }),
});

export const resourceUnavailabilityTable = pgTable("resource_unavailability", {
  unavail_id: serial("unavail_id").primaryKey(),
  resource_id: integer("resource_id").notNull(),
  day_of_week: smallint("day_of_week"),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  label: varchar("label", { length: 80 }),
});
