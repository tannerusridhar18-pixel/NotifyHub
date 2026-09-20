-- V14: Allow faculty profiles to exist without a legacy department_id before mapping or with SUB/GUEST mappings only
ALTER TABLE faculty_profiles MODIFY COLUMN department_id BIGINT NULL;
