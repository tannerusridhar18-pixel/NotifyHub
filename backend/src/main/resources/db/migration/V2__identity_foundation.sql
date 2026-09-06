ALTER TABLE users
    ADD COLUMN public_id CHAR(36) NULL,
    ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP(6) NULL,
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET public_id = UUID(),
    account_status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END
WHERE public_id IS NULL;

ALTER TABLE users
    MODIFY COLUMN public_id CHAR(36) NOT NULL,
    ADD UNIQUE KEY ux_users_public_id (public_id),
    ADD KEY ix_users_account_status (account_status);

CREATE TABLE departments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_departments_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE branches (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  department_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  course_note VARCHAR(255),
  max_year INT NOT NULL DEFAULT 4,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_branches_department_name (department_id, name),
  KEY ix_branches_department (department_id),
  CONSTRAINT fk_branches_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  department_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  academic_year INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_sections_scope (department_id, branch_id, academic_year, name),
  KEY ix_sections_branch (branch_id),
  CONSTRAINT fk_sections_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sections_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  student_id VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  personal_email VARCHAR(190),
  department_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  year INT NOT NULL,
  semester INT NOT NULL,
  section_id BIGINT NOT NULL,
  batch VARCHAR(40),
  is_hosteller BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_student_profiles_user (user_id),
  UNIQUE KEY ux_student_profiles_student_id (student_id),
  KEY ix_student_profiles_targeting (department_id, branch_id, year, section_id),
  CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_profiles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_profiles_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_profiles_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT,
  CONSTRAINT chk_student_profiles_year CHECK (year > 0),
  CONSTRAINT chk_student_profiles_semester CHECK (semester > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE faculty_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  faculty_id VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  department_id BIGINT NOT NULL,
  designation VARCHAR(160),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_faculty_profiles_user (user_id),
  UNIQUE KEY ux_faculty_profiles_faculty_id (faculty_id),
  KEY ix_faculty_profiles_department (department_id),
  CONSTRAINT fk_faculty_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_faculty_profiles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invitations (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP(6) NOT NULL,
  used_at TIMESTAMP(6) NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_invitations_token_hash (token_hash),
  KEY ix_invitations_user (user_id),
  KEY ix_invitations_expiry (expires_at),
  CONSTRAINT fk_invitations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invitations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP(6) NOT NULL,
  used_at TIMESTAMP(6) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_password_reset_token_hash (token_hash),
  KEY ix_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE refresh_tokens
    ADD COLUMN family_id CHAR(36) NULL,
    ADD COLUMN replaced_by_hash CHAR(64) NULL,
    ADD COLUMN revoked_at TIMESTAMP(6) NULL;

UPDATE refresh_tokens
SET family_id = UUID(),
    revoked_at = CASE WHEN revoked THEN CURRENT_TIMESTAMP(6) ELSE NULL END
WHERE family_id IS NULL;

ALTER TABLE refresh_tokens
    MODIFY COLUMN family_id CHAR(36) NOT NULL,
    ADD KEY ix_refresh_family (family_id),
    ADD KEY ix_refresh_user_active (user_id, revoked, expires_at);
