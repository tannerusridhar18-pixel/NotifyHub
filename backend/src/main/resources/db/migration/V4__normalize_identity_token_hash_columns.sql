ALTER TABLE invitations
    MODIFY COLUMN token_hash VARCHAR(64) NOT NULL;

ALTER TABLE password_reset_tokens
    MODIFY COLUMN token_hash VARCHAR(64) NOT NULL;
