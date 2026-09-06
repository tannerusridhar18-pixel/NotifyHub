ALTER TABLE refresh_tokens
    MODIFY COLUMN replaced_by_hash VARCHAR(64) NULL;
