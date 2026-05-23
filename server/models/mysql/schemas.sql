-- ============================================================================
-- CAMPUS EVENT AGGREGATOR & CONFLICT-PREVENTION ENGINE
-- RELATIONAL DATABASE DDL SCHEMAS (MySQL 8.0+)
-- ============================================================================

-- Create tables sequentially to satisfy foreign key relationships

-- 1. Users Table (RBAC Authentication Base)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'ORGANIZER', 'ADMIN') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Venues Table (Physical Event Spaces)
CREATE TABLE IF NOT EXISTS venues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    capacity INT NOT NULL,
    operating_start TIME NOT NULL, -- Format: 'HH:MM:SS'
    operating_end TIME NOT NULL -- Format: 'HH:MM:SS'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Event Schedules Table (Relational & Transactional Event States)
CREATE TABLE IF NOT EXISTS event_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    venue_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Composite index for rapid query overlap checking (Conflict Prevention Engine)
    INDEX idx_conflict_prevention (venue_id, start_time, end_time, status),
    INDEX idx_org_schedules (organization_id, start_time, end_time, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Approvals Table (Audit Trail of Admin Actions)
CREATE TABLE IF NOT EXISTS approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_schedule_id INT NOT NULL,
    admin_id INT NOT NULL,
    action ENUM('APPROVED', 'REJECTED') NOT NULL,
    reason TEXT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_schedule_id) REFERENCES event_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. RSVPs Table (Attendee Registrations)
CREATE TABLE IF NOT EXISTS rsvps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_schedule_id INT NOT NULL,
    user_id INT NOT NULL,
    checked_in BOOLEAN DEFAULT FALSE,
    qr_signature VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_schedule_id) REFERENCES event_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Composite index for validating double-RSVPs and user check-ins
    UNIQUE INDEX idx_unique_rsvp (event_schedule_id, user_id),
    INDEX idx_user_rsvps (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
