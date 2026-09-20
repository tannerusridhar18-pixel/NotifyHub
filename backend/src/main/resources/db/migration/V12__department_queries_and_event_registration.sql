-- Extends the legacy public query form without dropping its audit/history fields.
ALTER TABLE queries
  ADD COLUMN student_id BIGINT NULL,
  ADD COLUMN department_id BIGINT NULL,
  ADD COLUMN question TEXT NULL,
  ADD COLUMN answer TEXT NULL,
  ADD COLUMN answered_by BIGINT NULL,
  ADD CONSTRAINT fk_queries_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_queries_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_queries_answered_by FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE events
  ADD COLUMN photo_url VARCHAR(2048) NULL,
  ADD COLUMN external_link VARCHAR(2048) NULL,
  ADD COLUMN registration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN registration_deadline TIMESTAMP(6) NULL;

CREATE TABLE event_registrations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  registered_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_event_registration_student (event_id, student_id),
  KEY ix_event_registrations_event (event_id),
  CONSTRAINT fk_event_registration_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
  CONSTRAINT fk_event_registration_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
