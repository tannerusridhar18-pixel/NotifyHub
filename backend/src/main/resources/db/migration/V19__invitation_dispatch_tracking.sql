ALTER TABLE invitations
    ADD COLUMN last_dispatched_at TIMESTAMP(6) NULL;

UPDATE invitations
    SET last_dispatched_at = created_at
    WHERE last_dispatched_at IS NULL;

CREATE INDEX ix_invitations_last_dispatched ON invitations(last_dispatched_at);

