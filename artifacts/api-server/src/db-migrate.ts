import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    logger.info("Running database migrations...");

    // Required extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // 1. DEPARTMENT
    await client.query(`
      CREATE TABLE IF NOT EXISTS department (
        department_id  SERIAL PRIMARY KEY,
        dept_name      VARCHAR(120) NOT NULL UNIQUE,
        building       VARCHAR(80),
        email          VARCHAR(120),
        hod_id         INT
      )
    `);

    // 2. USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id        SERIAL PRIMARY KEY,
        firebase_uid   VARCHAR(128) NOT NULL UNIQUE,
        first_name     VARCHAR(60)  NOT NULL,
        last_name      VARCHAR(60)  NOT NULL,
        email          VARCHAR(120) NOT NULL UNIQUE,
        phone          VARCHAR(20),
        role           VARCHAR(30)  NOT NULL DEFAULT 'student'
                         CHECK (role IN ('admin','hod','resource_manager','staff','faculty','student')),
        is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
        priority_level SMALLINT     NOT NULL DEFAULT 4,
        department_id  INT REFERENCES department(department_id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ  DEFAULT now()
      )
    `);

    // Add password_hash column if not exists
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT
    `);

    await client.query(`
      ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE
    `);

    // Add FK back to department (safe if already exists)
    try {
      await client.query(`
        ALTER TABLE department
          ADD CONSTRAINT fk_hod
          FOREIGN KEY (hod_id) REFERENCES users(user_id) ON DELETE SET NULL
      `);
    } catch { /* already exists */ }

    // 3. RESOURCE CATEGORY
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_category (
        category_id       SERIAL PRIMARY KEY,
        category_name     VARCHAR(80) NOT NULL UNIQUE,
        advance_days      SMALLINT    NOT NULL DEFAULT 90,
        approval_steps    SMALLINT    NOT NULL DEFAULT 0
                            CHECK (approval_steps IN (0,1,2))
      )
    `);

    // 4. RESOURCE
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource (
        resource_id   SERIAL PRIMARY KEY,
        resource_name VARCHAR(120) NOT NULL,
        capacity      SMALLINT     NOT NULL CHECK (capacity > 0),
        location      VARCHAR(120),
        status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','maintenance')),
        features      JSONB        NOT NULL DEFAULT '{}',
        approval_steps_override SMALLINT CHECK (approval_steps_override IN (0,1,2)),
        category_id   INT          NOT NULL REFERENCES resource_category(category_id),
        manager_id    INT          REFERENCES users(user_id) ON DELETE SET NULL,
        department_id INT          REFERENCES department(department_id) ON DELETE SET NULL
      )
    `);

    await client.query(`
      ALTER TABLE resource ADD COLUMN IF NOT EXISTS approval_steps_override SMALLINT
        CHECK (approval_steps_override IN (0,1,2))
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_resource_category ON resource(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_resource_features ON resource USING GIN(features)`);

    // 5. BOOKING STATUS
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_status (
        status_id   SERIAL PRIMARY KEY,
        status_name VARCHAR(30) NOT NULL UNIQUE
      )
    `);
    await client.query(`
      INSERT INTO booking_status (status_name)
      VALUES ('Pending'),('Approved'),('Rejected'),('Cancelled'),('Completed')
      ON CONFLICT DO NOTHING
    `);

    // 6. PRIORITY
    await client.query(`
      CREATE TABLE IF NOT EXISTS priority (
        priority_id    SERIAL PRIMARY KEY,
        priority_level SMALLINT NOT NULL UNIQUE CHECK (priority_level BETWEEN 1 AND 4),
        description    VARCHAR(60)
      )
    `);
    await client.query(`
      INSERT INTO priority (priority_level, description) VALUES
        (1,'System Administrator'),(2,'Manager'),(3,'Staff/Faculty'),(4,'Student')
      ON CONFLICT DO NOTHING
    `);

    // 7. RECURRENCE
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurrence (
        recurrence_id     SERIAL PRIMARY KEY,
        rrule             TEXT NOT NULL,
        parent_booking_id INT
      )
    `);

    // 8. BOOKING
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking (
        booking_id     BIGSERIAL PRIMARY KEY,
        user_id        INT         NOT NULL REFERENCES users(user_id),
        resource_id    INT         NOT NULL REFERENCES resource(resource_id),
        status_id      INT         NOT NULL REFERENCES booking_status(status_id),
        is_slot_blocking BOOLEAN   NOT NULL DEFAULT TRUE,
        priority_level SMALLINT    NOT NULL DEFAULT 4,
        recurrence_id  INT         REFERENCES recurrence(recurrence_id),
        date           DATE        NOT NULL,
        start_time     TIME        NOT NULL,
        end_time       TIME        NOT NULL,
        purpose        TEXT,
        created_at     TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT chk_time_order CHECK (start_time < end_time)
      )
    `);

    await client.query(`
      ALTER TABLE booking
      ADD COLUMN IF NOT EXISTS is_slot_blocking BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION fn_set_booking_blocking_flag()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW.is_slot_blocking := EXISTS (
          SELECT 1
          FROM booking_status bs
          WHERE bs.status_id = NEW.status_id
            AND bs.status_name IN ('Pending','Approved')
        );
        RETURN NEW;
      END;
      $$
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_set_booking_blocking_flag ON booking
    `);
    await client.query(`
      CREATE TRIGGER trg_set_booking_blocking_flag
      BEFORE INSERT OR UPDATE OF status_id
      ON booking
      FOR EACH ROW
      EXECUTE FUNCTION fn_set_booking_blocking_flag()
    `);

    await client.query(`
      UPDATE booking b
      SET is_slot_blocking = EXISTS (
        SELECT 1
        FROM booking_status bs
        WHERE bs.status_id = b.status_id
          AND bs.status_name IN ('Pending','Approved')
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_resource_time
        ON booking(resource_id, date, start_time, end_time)
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_booking_user ON booking(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status_id)`);

    // Try to add EXCLUDE constraint (requires btree_gist)
    try {
      await client.query(`
        ALTER TABLE booking ADD CONSTRAINT no_overlap
        EXCLUDE USING gist (
          resource_id WITH =,
          tsrange(date + start_time, date + end_time) WITH &&
        ) WHERE (is_slot_blocking)
      `);
    } catch { /* already exists */ }

    // 9. APPROVAL
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval (
        approval_id   SERIAL PRIMARY KEY,
        booking_id    INT         NOT NULL REFERENCES booking(booking_id),
        approver_id   INT         REFERENCES users(user_id),
        step_number   SMALLINT    NOT NULL CHECK (step_number IN (1,2)),
        decision      VARCHAR(20) CHECK (decision IN ('Approved','Rejected')),
        remarks       TEXT,
        approval_time TIMESTAMPTZ
      )
    `);

    // 10. LOG
    await client.query(`
      CREATE TABLE IF NOT EXISTS log (
        log_id      BIGSERIAL PRIMARY KEY,
        user_id     INT REFERENCES users(user_id),
        booking_id  INT REFERENCES booking(booking_id),
        action_type VARCHAR(60) NOT NULL,
        description TEXT,
        timestamp   TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 11. AUDIT LOG
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        audit_id    BIGSERIAL PRIMARY KEY,
        table_name  VARCHAR(60)  NOT NULL,
        operation   VARCHAR(10)  NOT NULL,
        old_data    JSONB,
        new_data    JSONB,
        changed_by  INT          REFERENCES users(user_id),
        changed_at  TIMESTAMPTZ  DEFAULT now()
      )
    `);

    try {
      await client.query(`
        CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO audit_log DO INSTEAD NOTHING
      `);
      await client.query(`
        CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING
      `);
    } catch { /* ignore */ }

    // 12. NOTIFICATION
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification (
        notification_id SERIAL PRIMARY KEY,
        user_id         INT         NOT NULL REFERENCES users(user_id),
        message         TEXT        NOT NULL,
        channel         VARCHAR(10) DEFAULT 'email'
                          CHECK (channel IN ('email','sms','push')),
        status          VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN ('pending','sent','failed')),
        retry_count     SMALLINT    DEFAULT 0,
        sent_at         TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT now(),
        read_at         TIMESTAMPTZ
      )
    `);

    // 13. BLACKOUT PERIOD
    await client.query(`
      CREATE TABLE IF NOT EXISTS blackout_period (
        blackout_id SERIAL PRIMARY KEY,
        category_id INT  REFERENCES resource_category(category_id),
        start_date  DATE NOT NULL,
        end_date    DATE NOT NULL,
        reason      VARCHAR(200),
        CONSTRAINT chk_blackout CHECK (start_date <= end_date)
      )
    `);

    // 14. RESOURCE UNAVAILABILITY
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_unavailability (
        unavail_id  SERIAL PRIMARY KEY,
        resource_id INT         NOT NULL REFERENCES resource(resource_id),
        day_of_week SMALLINT    CHECK (day_of_week BETWEEN 0 AND 6),
        start_time  TIME        NOT NULL,
        end_time    TIME        NOT NULL,
        label       VARCHAR(80)
      )
    `);

    // MATERIALIZED VIEW
    try {
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_resource_utilization AS
          SELECT
            r.resource_id,
            r.resource_name,
            rc.category_name,
            date_trunc('week', b.date::TIMESTAMP) AS week_start,
            COUNT(b.booking_id)                   AS total_bookings,
            SUM(EXTRACT(EPOCH FROM (
              (b.date + b.end_time) - (b.date + b.start_time)
            )) / 3600.0)                          AS booked_hours
          FROM booking b
          JOIN resource r        ON r.resource_id  = b.resource_id
          JOIN resource_category rc ON rc.category_id = r.category_id
          WHERE b.status_id IN (
            SELECT status_id FROM booking_status
            WHERE status_name IN ('Approved','Completed')
          )
          GROUP BY r.resource_id, r.resource_name, rc.category_name,
                   date_trunc('week', b.date::TIMESTAMP)
        WITH DATA
      `);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_util
          ON mv_resource_utilization(resource_id, week_start)
      `);
    } catch { /* already exists */ }

    // AUDIT TRIGGER
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_audit_trigger()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO audit_log(table_name, operation, old_data, new_data, changed_at)
        VALUES (
          TG_TABLE_NAME,
          TG_OP,
          CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::JSONB END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::JSONB END,
          now()
        );
        RETURN NEW;
      END;
      $$
    `);

    try {
      await client.query(`
        CREATE OR REPLACE TRIGGER trg_audit_booking
          AFTER INSERT OR UPDATE OR DELETE ON booking
          FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()
      `);
      await client.query(`
        CREATE OR REPLACE TRIGGER trg_audit_users
          AFTER INSERT OR UPDATE OR DELETE ON users
          FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()
      `);
      await client.query(`
        CREATE OR REPLACE TRIGGER trg_audit_resource
          AFTER INSERT OR UPDATE OR DELETE ON resource
          FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()
      `);
    } catch { /* ignore trigger errors */ }

    // CREATE BOOKING STORED PROCEDURE
    await client.query(`
      CREATE OR REPLACE FUNCTION create_booking(
        p_user_id     INT,
        p_resource_id INT,
        p_date        DATE,
        p_start       TIME,
        p_end         TIME,
        p_purpose     TEXT DEFAULT NULL
      ) RETURNS BIGINT LANGUAGE plpgsql AS $$
      DECLARE
        v_booking_id     BIGINT;
        v_status_id      INT;
        v_approval_steps SMALLINT;
        v_adv_days       INT;
        v_conflict_cnt   INT;
        v_priority       SMALLINT;
      BEGIN
        IF p_start >= p_end THEN
          RAISE EXCEPTION 'start_time must be before end_time';
        END IF;

        SELECT rc.advance_days, COALESCE(r.approval_steps_override, rc.approval_steps)
          INTO v_adv_days, v_approval_steps
        FROM resource r
        JOIN resource_category rc ON rc.category_id = r.category_id
        WHERE r.resource_id = p_resource_id;

        IF NOT EXISTS (
          SELECT 1 FROM resource r
          WHERE r.resource_id = p_resource_id
            AND r.status = 'active'
        ) THEN
          RAISE EXCEPTION 'Resource is not active for booking';
        END IF;

        IF p_date > CURRENT_DATE + v_adv_days THEN
          RAISE EXCEPTION 'Booking date exceeds advance window of % days', v_adv_days;
        END IF;

        IF EXISTS (
          SELECT 1 FROM blackout_period bp
          JOIN resource r ON r.category_id = bp.category_id
          WHERE r.resource_id = p_resource_id
            AND p_date BETWEEN bp.start_date AND bp.end_date
        ) THEN
          RAISE EXCEPTION 'Date falls within a blackout period';
        END IF;

        IF EXISTS (
          SELECT 1 FROM resource_unavailability ru
          WHERE ru.resource_id = p_resource_id
            AND ru.day_of_week  = EXTRACT(DOW FROM p_date)
            AND ru.start_time   < p_end
            AND ru.end_time     > p_start
        ) THEN
          RAISE EXCEPTION 'Resource is unavailable (maintenance window)';
        END IF;

        PERFORM pg_advisory_xact_lock(p_resource_id);

        SELECT COUNT(*) INTO v_conflict_cnt
        FROM booking
        WHERE resource_id = p_resource_id
          AND date        = p_date
          AND is_slot_blocking = TRUE
          AND start_time  < p_end
          AND end_time    > p_start;

        IF v_conflict_cnt > 0 THEN
          RAISE EXCEPTION 'CONFLICT: resource already booked for that slot'
            USING ERRCODE = 'P0001';
        END IF;

        IF v_approval_steps = 0 THEN
          SELECT status_id INTO v_status_id
          FROM booking_status WHERE status_name = 'Approved';
        ELSE
          SELECT status_id INTO v_status_id
          FROM booking_status WHERE status_name = 'Pending';
        END IF;

        SELECT priority_level INTO v_priority FROM users WHERE user_id = p_user_id;

        INSERT INTO booking(user_id, resource_id, status_id, priority_level,
                            date, start_time, end_time, purpose)
        VALUES (p_user_id, p_resource_id, v_status_id, v_priority,
                p_date, p_start, p_end, p_purpose)
        RETURNING booking_id INTO v_booking_id;

        INSERT INTO notification(user_id, message, channel)
        VALUES (p_user_id,
                'Booking #' || v_booking_id || ' created for ' || p_date,
                'email');

        IF v_approval_steps >= 1 THEN
          INSERT INTO approval(booking_id, step_number)
          VALUES (v_booking_id, 1);
        END IF;

        RETURN v_booking_id;
      END;
      $$
    `);

    // SEED DATA
    await client.query(`
      INSERT INTO department(dept_name, building, email) VALUES
        ('Computer Science and Engineering', 'LHC Block', 'cse@nitc.ac.in'),
        ('Electronics and Communication', 'ECE Block', 'ece@nitc.ac.in'),
        ('Mechanical Engineering', 'Mech Block', 'mech@nitc.ac.in')
      ON CONFLICT DO NOTHING
    `);

    await client.query(`
      INSERT INTO resource_category(category_name, advance_days, approval_steps) VALUES
        ('Classroom',     90, 0),
        ('Laboratory',    60, 1),
        ('Seminar Hall',  90, 2),
        ('Meeting Room',  30, 1),
        ('Equipment',     30, 1)
      ON CONFLICT DO NOTHING
    `);

    // Seed core users with known credentials
    // Admin password: Admin@123
    // Others password: Test@123
    await client.query(`
      WITH cse AS (
        SELECT department_id FROM department WHERE dept_name = 'Computer Science and Engineering' LIMIT 1
      )
      INSERT INTO users(
        firebase_uid, first_name, last_name, email, role, is_active,
        priority_level, department_id, password_hash
      )
      VALUES
        (
          'seed-admin', 'System', 'Admin', 'admin@nitc.ac.in', 'admin', true,
          1, (SELECT department_id FROM cse),
          '$2y$10$o7yda6lHEIzWrb89ak87c.VzkrPBmc1KO9cNWdNuhNvXjMnu7k0AO'
        ),
        (
          'seed-hod-cse', 'CSE', 'HOD', 'hod.cse@nitc.ac.in', 'hod', true,
          2, (SELECT department_id FROM cse),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-hod-ece', 'ECE', 'HOD', 'hod.ece@nitc.ac.in', 'hod', true,
          2, (SELECT department_id FROM department WHERE dept_name = 'Electronics and Communication' LIMIT 1),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-hod-mech', 'Mech', 'HOD', 'hod.mech@nitc.ac.in', 'hod', true,
          2, (SELECT department_id FROM department WHERE dept_name = 'Mechanical Engineering' LIMIT 1),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-rm-cse', 'CSE', 'Resource Manager', 'rm.cse@nitc.ac.in', 'resource_manager', true,
          2, (SELECT department_id FROM cse),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-rm-ece', 'ECE', 'Resource Manager', 'rm.ece@nitc.ac.in', 'resource_manager', true,
          2, (SELECT department_id FROM department WHERE dept_name = 'Electronics and Communication' LIMIT 1),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-rm-mech', 'Mech', 'Resource Manager', 'rm.mech@nitc.ac.in', 'resource_manager', true,
          2, (SELECT department_id FROM department WHERE dept_name = 'Mechanical Engineering' LIMIT 1),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-faculty-cse', 'CSE', 'Faculty', 'faculty.cse@nitc.ac.in', 'faculty', true,
          3, (SELECT department_id FROM cse),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        ),
        (
          'seed-student', 'NITC', 'Student', 'student@nitc.ac.in', 'student', true,
          4, (SELECT department_id FROM cse),
          '$2y$10$R0/33NzgymTyZKf0OWpyg.gJSRa27YlG4TfJCSOqDAiC.ycRSTgpq'
        )
      ON CONFLICT (email) DO UPDATE SET
        firebase_uid = EXCLUDED.firebase_uid,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        priority_level = EXCLUDED.priority_level,
        department_id = EXCLUDED.department_id,
        password_hash = EXCLUDED.password_hash
    `);

    // Ensure CSE HOD is assigned in department table
    await client.query(`
      UPDATE department d
      SET hod_id = u.user_id
      FROM users u
      WHERE d.dept_name = 'Computer Science and Engineering'
        AND u.email = 'hod.cse@nitc.ac.in'
    `);

    await client.query(`
      UPDATE department d
      SET hod_id = u.user_id
      FROM users u
      WHERE d.dept_name = 'Electronics and Communication'
        AND u.email = 'hod.ece@nitc.ac.in'
    `);

    await client.query(`
      UPDATE department d
      SET hod_id = u.user_id
      FROM users u
      WHERE d.dept_name = 'Mechanical Engineering'
        AND u.email = 'hod.mech@nitc.ac.in'
    `);

    // Seed sample resources for RM flows
    await client.query(`
      INSERT INTO resource(
        resource_name, capacity, location, status, features,
        category_id, manager_id, department_id
      )
      SELECT
        'CSE Seminar Hall', 180, 'LHC Block - SH1', 'active',
        '{"projector": true, "ac": true, "audio_system": true}'::jsonb,
        (SELECT category_id FROM resource_category WHERE category_name = 'Seminar Hall' LIMIT 1),
        (SELECT user_id FROM users WHERE email = 'rm.cse@nitc.ac.in' LIMIT 1),
        (SELECT department_id FROM department WHERE dept_name = 'Computer Science and Engineering' LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM resource WHERE resource_name = 'CSE Seminar Hall'
      )
    `);

    await client.query(`
      INSERT INTO resource(
        resource_name, capacity, location, status, features,
        category_id, manager_id, department_id
      )
      SELECT
        'CSE Networking Lab', 60, 'CSE Block - Lab 2', 'active',
        '{"projector": true, "computers": true, "whiteboard": true}'::jsonb,
        (SELECT category_id FROM resource_category WHERE category_name = 'Laboratory' LIMIT 1),
        (SELECT user_id FROM users WHERE email = 'rm.cse@nitc.ac.in' LIMIT 1),
        (SELECT department_id FROM department WHERE dept_name = 'Computer Science and Engineering' LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM resource WHERE resource_name = 'CSE Networking Lab'
      )
    `);

    await client.query(`
      INSERT INTO resource(
        resource_name, capacity, location, status, features,
        approval_steps_override, category_id, manager_id, department_id
      )
      SELECT
        'CSE Smart Classroom', 80, 'LHC Block - CR4', 'active',
        '{"projector": true, "smart_board": true, "ac": true}'::jsonb,
        2,
        (SELECT category_id FROM resource_category WHERE category_name = 'Classroom' LIMIT 1),
        (SELECT user_id FROM users WHERE email = 'rm.cse@nitc.ac.in' LIMIT 1),
        (SELECT department_id FROM department WHERE dept_name = 'Computer Science and Engineering' LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM resource WHERE resource_name = 'CSE Smart Classroom'
      )
    `);

    await client.query(`
      UPDATE resource
      SET approval_steps_override = 2
      WHERE resource_name = 'CSE Smart Classroom'
    `);

    await client.query(`
      INSERT INTO resource(
        resource_name, capacity, location, status, features,
        category_id, manager_id, department_id
      )
      SELECT
        'ECE Seminar Hall', 140, 'ECE Block - SH1', 'active',
        '{"projector": true, "ac": true}'::jsonb,
        (SELECT category_id FROM resource_category WHERE category_name = 'Seminar Hall' LIMIT 1),
        (SELECT user_id FROM users WHERE email = 'rm.ece@nitc.ac.in' LIMIT 1),
        (SELECT department_id FROM department WHERE dept_name = 'Electronics and Communication' LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM resource WHERE resource_name = 'ECE Seminar Hall'
      )
    `);

    await client.query(`
      INSERT INTO resource(
        resource_name, capacity, location, status, features,
        category_id, manager_id, department_id
      )
      SELECT
        'MECH CAD Lab', 70, 'Mech Block - Lab 1', 'active',
        '{"workstations": true, "projector": true}'::jsonb,
        (SELECT category_id FROM resource_category WHERE category_name = 'Laboratory' LIMIT 1),
        (SELECT user_id FROM users WHERE email = 'rm.mech@nitc.ac.in' LIMIT 1),
        (SELECT department_id FROM department WHERE dept_name = 'Mechanical Engineering' LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM resource WHERE resource_name = 'MECH CAD Lab'
      )
    `);

    logger.info("Database migrations completed successfully");
  } catch (err) {
    logger.error({ err }, "Migration error");
    throw err;
  } finally {
    client.release();
  }
}
