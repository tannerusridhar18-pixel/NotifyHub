ALTER TABLE announcements
    ADD COLUMN target_hostel_id BIGINT NULL,
    ADD COLUMN target_user_id BIGINT NULL,
    ADD CONSTRAINT fk_ann_target_hostel FOREIGN KEY (target_hostel_id) REFERENCES hostels(id),
    ADD CONSTRAINT fk_ann_target_user FOREIGN KEY (target_user_id) REFERENCES users(id);

ALTER TABLE events
    ADD COLUMN target_hostel_id BIGINT NULL,
    ADD COLUMN target_user_id BIGINT NULL,
    ADD CONSTRAINT fk_event_target_hostel FOREIGN KEY (target_hostel_id) REFERENCES hostels(id),
    ADD CONSTRAINT fk_event_target_user FOREIGN KEY (target_user_id) REFERENCES users(id);

CREATE INDEX ix_ann_target_hostel ON announcements(target_hostel_id);
CREATE INDEX ix_ann_target_user ON announcements(target_user_id);
CREATE INDEX ix_event_target_hostel ON events(target_hostel_id);
CREATE INDEX ix_event_target_user ON events(target_user_id);
