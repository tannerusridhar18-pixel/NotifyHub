CREATE TABLE hostels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(40),
  total_capacity INT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_hostels_name (name),
  CONSTRAINT chk_hostels_capacity CHECK (total_capacity IS NULL OR total_capacity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hostel_blocks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  hostel_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  capacity INT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_hostel_blocks_hostel_name (hostel_id, name),
  KEY ix_hostel_blocks_hostel (hostel_id),
  CONSTRAINT fk_hostel_blocks_hostel FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE RESTRICT,
  CONSTRAINT chk_hostel_blocks_capacity CHECK (capacity IS NULL OR capacity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rooms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  block_id BIGINT NOT NULL,
  room_number VARCHAR(40) NOT NULL,
  floor INT,
  capacity INT NOT NULL,
  current_occupancy INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY ux_rooms_block_number (block_id, room_number),
  KEY ix_rooms_block (block_id),
  CONSTRAINT fk_rooms_block FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE RESTRICT,
  CONSTRAINT chk_rooms_floor CHECK (floor IS NULL OR floor >= 0),
  CONSTRAINT chk_rooms_capacity CHECK (capacity > 0),
  CONSTRAINT chk_rooms_occupancy CHECK (current_occupancy >= 0 AND current_occupancy <= capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE student_profiles
    ADD COLUMN hostel_id BIGINT NULL,
    ADD COLUMN block_id BIGINT NULL,
    ADD COLUMN room_id BIGINT NULL,
    ADD KEY ix_student_profiles_hostel (hostel_id),
    ADD KEY ix_student_profiles_block (block_id),
    ADD KEY ix_student_profiles_room (room_id),
    ADD CONSTRAINT fk_student_profiles_hostel FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_student_profiles_block FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_student_profiles_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    ADD CONSTRAINT chk_student_profiles_hostel_fields CHECK (is_hosteller = TRUE OR (hostel_id IS NULL AND block_id IS NULL AND room_id IS NULL));
