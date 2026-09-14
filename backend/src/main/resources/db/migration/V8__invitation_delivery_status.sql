ALTER TABLE invitations
    ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN email_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN email_error VARCHAR(500) NULL;

CREATE INDEX ix_invitations_status ON invitations(status);
CREATE INDEX ix_invitations_email_status ON invitations(email_status);
