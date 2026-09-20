CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  level INT NOT NULL,
  parent_role_id BIGINT NULL,
  created_by BIGINT NULL,
  can_post_to TEXT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_roles_name (name),
  KEY ix_roles_level (level),
  CONSTRAINT fk_roles_parent FOREIGN KEY (parent_role_id) REFERENCES roles(id) ON DELETE SET NULL,
  CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, level, parent_role_id, created_by, can_post_to) VALUES
  ('SUPER_ADMIN', 0, NULL, NULL, '[0,1,2,3,4,5]'),
  ('PRINCIPAL', 1, NULL, NULL, '[1,2,3,4,5]'),
  ('DEAN', 2, NULL, NULL, '[2,3,4,5]'),
  ('HOD', 3, NULL, NULL, '[3,4,5]'),
  ('FACULTY', 4, NULL, NULL, '[4,5]'),
  ('STUDENT', 5, NULL, NULL, '[]');

UPDATE roles SET parent_role_id = (SELECT r2.id FROM (SELECT id FROM roles WHERE name = 'SUPER_ADMIN') r2) WHERE name = 'PRINCIPAL';
UPDATE roles SET parent_role_id = (SELECT r2.id FROM (SELECT id FROM roles WHERE name = 'PRINCIPAL') r2) WHERE name = 'DEAN';
UPDATE roles SET parent_role_id = (SELECT r2.id FROM (SELECT id FROM roles WHERE name = 'DEAN') r2) WHERE name = 'HOD';
UPDATE roles SET parent_role_id = (SELECT r2.id FROM (SELECT id FROM roles WHERE name = 'HOD') r2) WHERE name = 'FACULTY';
UPDATE roles SET parent_role_id = (SELECT r2.id FROM (SELECT id FROM roles WHERE name = 'FACULTY') r2) WHERE name = 'STUDENT';

ALTER TABLE users
  ADD COLUMN role_id BIGINT NULL,
  ADD COLUMN department VARCHAR(100) NULL,
  ADD COLUMN department_id BIGINT NULL,
  ADD COLUMN branch_id BIGINT NULL,
  ADD COLUMN reports_to BIGINT NULL,
  ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_reports_to FOREIGN KEY (reports_to) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX ix_users_role_id ON users(role_id);
CREATE INDEX ix_users_department_id ON users(department_id);
CREATE INDEX ix_users_reports_to ON users(reports_to);

UPDATE users u JOIN roles r ON r.name = (CASE WHEN u.role = 'ADMIN' THEN 'SUPER_ADMIN' WHEN u.role = 'FACULTY' THEN 'FACULTY' ELSE 'STUDENT' END) SET u.role_id = r.id;

UPDATE users u JOIN student_profiles sp ON sp.user_id = u.id SET u.department_id = sp.department_id, u.branch_id = sp.branch_id;
UPDATE users u JOIN faculty_profiles fp ON fp.user_id = u.id SET u.department_id = fp.department_id;

ALTER TABLE announcements
  ADD COLUMN recipient_type VARCHAR(40) NOT NULL DEFAULT 'all',
  ADD COLUMN recipient_targets TEXT NULL;

ALTER TABLE events
  ADD COLUMN recipient_type VARCHAR(40) NOT NULL DEFAULT 'all',
  ADD COLUMN recipient_targets TEXT NULL;
