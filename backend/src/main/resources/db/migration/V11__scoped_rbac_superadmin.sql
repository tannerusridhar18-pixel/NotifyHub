-- Additive scoped RBAC.  The pre-existing roles table is retained for legacy auth.
ALTER TABLE roles
  ADD COLUMN is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE roles SET is_system_role = TRUE, is_superadmin = TRUE WHERE name = 'SUPER_ADMIN';
UPDATE roles SET is_system_role = TRUE, is_superadmin = FALSE WHERE name = 'ADMIN';

CREATE TABLE role_permissions (
  role_id BIGINT NOT NULL,
  permission_key VARCHAR(64) NOT NULL,
  PRIMARY KEY (role_id, permission_key),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_role_assignments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  scope_type ENUM('GLOBAL','DEPARTMENT','SECTION') NOT NULL,
  scope_id BIGINT NULL,
  assigned_by BIGINT NULL,
  assigned_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  revoked_at TIMESTAMP(6) NULL,
  KEY ix_role_assignment_user_active (user_id, revoked_at),
  KEY ix_role_assignment_role_active (role_id, revoked_at),
  CONSTRAINT fk_role_assignment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_role_assignment_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_role_assignment_actor FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_role_assignment_scope CHECK ((scope_type = 'GLOBAL' AND scope_id IS NULL) OR (scope_type <> 'GLOBAL' AND scope_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure both system roles have an active GLOBAL assignment for existing users.
INSERT INTO user_role_assignments (user_id, role_id, scope_type, assigned_by)
SELECT u.id, r.id, 'GLOBAL', NULL FROM users u JOIN roles r ON r.name = 'SUPER_ADMIN'
WHERE u.role = 'SUPER_ADMIN' AND NOT EXISTS (SELECT 1 FROM user_role_assignments a WHERE a.user_id = u.id AND a.role_id = r.id AND a.revoked_at IS NULL);
INSERT INTO user_role_assignments (user_id, role_id, scope_type, assigned_by)
SELECT u.id, r.id, 'GLOBAL', NULL FROM users u JOIN roles r ON r.name = 'ADMIN'
WHERE u.role = 'ADMIN' AND NOT EXISTS (SELECT 1 FROM user_role_assignments a WHERE a.user_id = u.id AND a.role_id = r.id AND a.revoked_at IS NULL);

CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(120) NOT NULL,
  metadata JSON NULL,
  timestamp TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY ix_audit_actor_time (actor_id, timestamp),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
