-- Phase 3 extends the original public feed tables without rewriting old migrations.
ALTER TABLE announcements
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' AFTER urgent,
  ADD COLUMN target_type VARCHAR(20) NOT NULL DEFAULT 'GLOBAL' AFTER status,
  ADD COLUMN target_department_id BIGINT NULL,
  ADD COLUMN target_branch_id BIGINT NULL,
  ADD COLUMN target_section_id BIGINT NULL,
  ADD COLUMN target_role VARCHAR(20) NULL,
  ADD COLUMN created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ADD COLUMN updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  ADD COLUMN status_changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  MODIFY COLUMN department VARCHAR(100) NULL,
  MODIFY COLUMN category VARCHAR(80) NOT NULL DEFAULT 'GENERAL',
  MODIFY COLUMN published_at TIMESTAMP(6) NULL,
  ADD KEY ix_ann_visibility (status, target_type, published_at),
  ADD KEY ix_ann_target_department (target_department_id),
  ADD KEY ix_ann_target_branch (target_branch_id),
  ADD KEY ix_ann_target_section (target_section_id),
  ADD CONSTRAINT fk_ann_target_department FOREIGN KEY (target_department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ann_target_branch FOREIGN KEY (target_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ann_target_section FOREIGN KEY (target_section_id) REFERENCES sections(id) ON DELETE RESTRICT;

ALTER TABLE events
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' AFTER end_at,
  ADD COLUMN target_type VARCHAR(20) NOT NULL DEFAULT 'GLOBAL' AFTER status,
  ADD COLUMN target_department_id BIGINT NULL,
  ADD COLUMN target_branch_id BIGINT NULL,
  ADD COLUMN target_section_id BIGINT NULL,
  ADD COLUMN target_role VARCHAR(20) NULL,
  ADD COLUMN published_at TIMESTAMP(6) NULL,
  ADD COLUMN created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ADD COLUMN updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  ADD COLUMN status_changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  MODIFY COLUMN department VARCHAR(100) NULL,
  ADD KEY ix_event_visibility (status, target_type, start_at),
  ADD KEY ix_event_target_department (target_department_id),
  ADD KEY ix_event_target_branch (target_branch_id),
  ADD KEY ix_event_target_section (target_section_id),
  ADD CONSTRAINT fk_event_target_department FOREIGN KEY (target_department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_event_target_branch FOREIGN KEY (target_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_event_target_section FOREIGN KEY (target_section_id) REFERENCES sections(id) ON DELETE RESTRICT;

UPDATE announcements SET status = 'PUBLISHED', target_type = 'GLOBAL', published_at = COALESCE(published_at, created_at);
UPDATE events SET status = 'PUBLISHED', target_type = 'GLOBAL', published_at = COALESCE(published_at, created_at);
