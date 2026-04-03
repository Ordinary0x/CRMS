SELECT * FROM users;
SELECT * FROM resource;
SELECT * FROM booking;
SELECT * FROM department;
SELECT * FROM booking_status;
SELECT * FROM priority;
SELECT * FROM recurrence;
SELECT * FROM resource_category;
SELECT * FROM approval;
SELECT * FROM log;
SELECT * FROM notification;
SELECT * FROM audit_log;
-- Dropping tables...
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS resource CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS department CASCADE;
DROP TABLE IF EXISTS booking_status CASCADE;
DROP TABLE IF EXISTS priority CASCADE;
DROP TABLE IF EXISTS recurrence CASCADE;
DROP TABLE IF EXISTS resource_category CASCADE;
DROP TABLE IF EXISTS approval CASCADE;
DROP TABLE IF EXISTS log CASCADE;
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
CREATE TABLE IF NOT EXISTS department (
    department_id INT PRIMARY KEY,
    dept_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    building VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS booking_status (
    status_id INT PRIMARY KEY,
    status_name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS priority (
    priority_id INT PRIMARY KEY,
    priority_level INT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS recurrence (
    recurrence_id INT PRIMARY KEY,
    pattern VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS resource_category (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS resource (
    resource_id INT PRIMARY KEY,
    resource_name VARCHAR(255),
    capacity VARCHAR(255),
    status VARCHAR(255),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
	role VARCHAR(50) CHECK (role IN ('professor','hod')),
    c_id INT REFERENCES resource_category(category_id)
);
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY,
    f_name VARCHAR(255),
    l_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15),
    firebase_uid INT UNIQUE,
    role VARCHAR(50) CHECK (role IN ('student','faculty','admin')),
    dept_id INT REFERENCES department(department_id),
    is_active BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS booking (
    booking_id INT PRIMARY KEY,
    start_time TIME,
    end_time TIME,
    date DATE,
    purpose VARCHAR(255),
    u_id INT REFERENCES users(user_id),
    r_id INT REFERENCES resource(resource_id),
    booking_status_id INT REFERENCES booking_status(status_id),
    prior_id INT REFERENCES priority(priority_id),
    recurr_id INT REFERENCES recurrence(recurrence_id)
);
CREATE TABLE IF NOT EXISTS approval (
    approval_id SERIAL PRIMARY KEY,
    u_id INT REFERENCES users(user_id),
    decision VARCHAR(255),
    remarks TEXT,
    step_number INT,
    b_id INT REFERENCES booking(booking_id)
);
CREATE TABLE IF NOT EXISTS log (
    log_id INT PRIMARY KEY,
    check_in_time TIME,
    check_out_time TIME,
    u_id INT REFERENCES users(user_id),
    b_id INT REFERENCES booking(booking_id)
);
CREATE TABLE IF NOT EXISTS notification (
    notification_id INT PRIMARY KEY,
    u_id INT REFERENCES users(user_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message VARCHAR(255),
    status VARCHAR(20) DEFAULT 'NOT SENT'
        CHECK (status IN ('SENT','NOT SENT'))
);
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id INT PRIMARY KEY,
    new_data VARCHAR(255),
    operation VARCHAR(255),
    description TEXT
);
CREATE OR REPLACE FUNCTION prevent_conflict()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM booking
        WHERE r_id = NEW.r_id
        AND date = NEW.date
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Time slot conflict!';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_conflict_trigger
BEFORE INSERT ON booking
FOR EACH ROW
EXECUTE FUNCTION prevent_conflict();

SELECT * FROM resource r
WHERE NOT EXISTS (
    SELECT 1 FROM booking b
    WHERE b.r_id = r.resource_id
    AND b.date = '2026-03-30'
    AND ('10:00' < b.end_time AND '11:00' > b.start_time)
);