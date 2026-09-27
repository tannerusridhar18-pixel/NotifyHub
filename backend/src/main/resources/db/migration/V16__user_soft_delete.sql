ALTER TABLE users ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX ix_users_deleted ON users(deleted);
