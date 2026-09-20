-- V13: Cross-cutting audience targeting, faculty-department mappings, query routing, and system roles

CREATE TABLE faculty_department_mappings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  faculty_id BIGINT NOT NULL,
  department_id BIGINT NOT NULL,
  relationship VARCHAR(20) NOT NULL DEFAULT 'HOME',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_faculty_dept_mapping (faculty_id, department_id),
  KEY ix_faculty_dept_department (department_id),
  KEY ix_faculty_dept_relationship (relationship),
  CONSTRAINT fk_faculty_dept_faculty FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_faculty_dept_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing faculty profiles into HOME department mapping
INSERT INTO faculty_department_mappings (faculty_id, department_id, relationship)
SELECT id, department_id, 'HOME' FROM faculty_profiles WHERE department_id IS NOT NULL;

-- Extend announcements for attachments
ALTER TABLE announcements
  ADD COLUMN attachment_url VARCHAR(2048) NULL,
  ADD COLUMN attachment_name VARCHAR(255) NULL;

-- Extend queries for faculty routing and asker types
ALTER TABLE queries
  ADD COLUMN target_type VARCHAR(30) NOT NULL DEFAULT 'DEPARTMENT_ADMIN',
  ADD COLUMN target_faculty_id BIGINT NULL,
  ADD COLUMN asker_type VARCHAR(30) NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN asker_id BIGINT NULL,
  ADD CONSTRAINT fk_queries_target_faculty FOREIGN KEY (target_faculty_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_queries_asker FOREIGN KEY (asker_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX ix_queries_target_faculty ON queries(target_faculty_id);
CREATE INDEX ix_queries_asker ON queries(asker_id);

-- Ensure all required system roles exist and are marked as system roles
INSERT INTO roles (name, level, parent_role_id, created_by, can_post_to, is_system_role, is_superadmin)
VALUES
  ('DEPARTMENT_ADMIN', 3, NULL, NULL, '[3,4,5]', TRUE, FALSE)
ON DUPLICATE KEY UPDATE is_system_role = TRUE;

UPDATE roles SET is_system_role = TRUE WHERE name IN ('SUPER_ADMIN', 'PRINCIPAL', 'DEAN', 'HOD', 'DEPARTMENT_ADMIN', 'FACULTY', 'STUDENT', 'ADMIN');

-- Populate default permissions for system roles (ignoring duplicates)
INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key FROM roles r
CROSS JOIN (
  SELECT 'ANNOUNCEMENT_CREATE' as permission_key UNION ALL
  SELECT 'EVENT_CREATE' UNION ALL
  SELECT 'QUERY_VIEW'
) p
WHERE r.name IN ('PRINCIPAL', 'DEAN');

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key FROM roles r
CROSS JOIN (
  SELECT 'ANNOUNCEMENT_CREATE' as permission_key UNION ALL
  SELECT 'ANNOUNCEMENT_DELETE' UNION ALL
  SELECT 'EVENT_CREATE' UNION ALL
  SELECT 'EVENT_DELETE' UNION ALL
  SELECT 'USER_EDIT' UNION ALL
  SELECT 'QUERY_VIEW' UNION ALL
  SELECT 'QUERY_ANSWER'
) p
WHERE r.name = 'HOD';

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key FROM roles r
CROSS JOIN (
  SELECT 'USER_INVITE' as permission_key UNION ALL
  SELECT 'USER_EDIT' UNION ALL
  SELECT 'ANNOUNCEMENT_CREATE' UNION ALL
  SELECT 'ANNOUNCEMENT_DELETE' UNION ALL
  SELECT 'EVENT_CREATE' UNION ALL
  SELECT 'EVENT_DELETE' UNION ALL
  SELECT 'QUERY_CREATE' UNION ALL
  SELECT 'QUERY_VIEW' UNION ALL
  SELECT 'QUERY_ANSWER' UNION ALL
  SELECT 'ROLE_ASSIGN' UNION ALL
  SELECT 'ROLE_REVOKE'
) p
WHERE r.name = 'DEPARTMENT_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key FROM roles r
CROSS JOIN (
  SELECT 'ANNOUNCEMENT_CREATE' as permission_key UNION ALL
  SELECT 'ANNOUNCEMENT_DELETE' UNION ALL
  SELECT 'EVENT_CREATE' UNION ALL
  SELECT 'EVENT_DELETE' UNION ALL
  SELECT 'QUERY_CREATE' UNION ALL
  SELECT 'QUERY_VIEW' UNION ALL
  SELECT 'QUERY_ANSWER'
) p
WHERE r.name = 'FACULTY';

INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key FROM roles r
CROSS JOIN (
  SELECT 'QUERY_CREATE' as permission_key UNION ALL
  SELECT 'QUERY_VIEW'
) p
WHERE r.name = 'STUDENT';
