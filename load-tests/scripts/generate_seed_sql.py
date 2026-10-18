import uuid

def generate():
    lines = []
    lines.append("-- NotifyHub Load Test Seed Script")
    lines.append("USE notifyhub;")
    lines.append("")
    lines.append("-- 1. Create Synthetic Department Admins")
    lines.append("INSERT INTO users (username, email, password_hash, role, role_id, department, department_id, public_id, account_status, active, deleted, created_at, updated_at)")
    lines.append("VALUES ('loadtest_deptadmin_cse', 'loadtest_deptadmin_cse@notifyhub.loadtest', '$2a$12$FAMQ700HWUSzMAeTOf7Ju.chUu0A5rLe5Mx6i38jm1UTJADjJUWKe', 'DEPARTMENT_ADMIN', 9, 'CSE', 292, UUID(), 'ACTIVE', 1, 0, NOW(6), NOW(6))")
    lines.append("ON DUPLICATE KEY UPDATE updated_at = NOW(6);")
    lines.append("")
    lines.append("INSERT INTO users (username, email, password_hash, role, role_id, department, department_id, public_id, account_status, active, deleted, created_at, updated_at)")
    lines.append("VALUES ('loadtest_deptadmin_aiml', 'loadtest_deptadmin_aiml@notifyhub.loadtest', '$2a$12$FAMQ700HWUSzMAeTOf7Ju.chUu0A5rLe5Mx6i38jm1UTJADjJUWKe', 'DEPARTMENT_ADMIN', 9, 'AIML', 293, UUID(), 'ACTIVE', 1, 0, NOW(6), NOW(6))")
    lines.append("ON DUPLICATE KEY UPDATE updated_at = NOW(6);")
    lines.append("")
    
    lines.append("-- 2. Create 250 Synthetic Students")
    lines.append("INSERT INTO users (username, email, password_hash, role, role_id, department, department_id, public_id, account_status, active, deleted, created_at, updated_at) VALUES")
    student_values = []
    for i in range(1, 251):
        u_name = f"loadtest_stu_{i}"
        u_email = f"loadtest_stu_{i}@notifyhub.loadtest"
        student_values.append(f"('{u_name}', '{u_email}', '$2a$12$FAMQ700HWUSzMAeTOf7Ju.chUu0A5rLe5Mx6i38jm1UTJADjJUWKe', 'STUDENT', 6, 'CSE', 292, UUID(), 'ACTIVE', 1, 0, NOW(6), NOW(6))")
    lines.append(",\n".join(student_values))
    lines.append("ON DUPLICATE KEY UPDATE updated_at = NOW(6);")
    lines.append("")

    lines.append("-- 3. Create Student Profiles for Synthetic Students")
    lines.append("INSERT INTO student_profiles (user_id, student_id, name, department_id, branch_id, section_id, year, semester, created_at, updated_at)")
    lines.append("SELECT u.id, CONCAT('LT-2026-', LPAD(SUBSTRING_INDEX(u.username, '_', -1), 4, '0')), CONCAT('LoadTest Student ', SUBSTRING_INDEX(u.username, '_', -1)), 292, 165, 789, 3, 5, NOW(6), NOW(6)")
    lines.append("FROM users u")
    lines.append("WHERE u.username LIKE 'loadtest_stu_%'")
    lines.append("AND NOT EXISTS (SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id);")
    lines.append("")

    lines.append("-- 4. Create Dedicated Test Events")
    lines.append("INSERT INTO events (title, description, venue, start_at, end_at, status, target_type, recipient_type, created_by, registration_enabled, registration_deadline, created_at, updated_at, status_changed_at)")
    lines.append("VALUES ('LOADTEST Open Event for Concurrency', 'Primary test event for 200 concurrent user registration load test.', 'Virtual Auditorium Hall 1', '2026-11-01 10:00:00', '2026-11-05 18:00:00', 'PUBLISHED', 'GLOBAL', 'global', 1, 1, '2026-11-01 09:00:00', NOW(6), NOW(6), NOW(6))")
    lines.append("ON DUPLICATE KEY UPDATE updated_at = NOW(6);")
    lines.append("")

    lines.append("INSERT INTO events (title, description, venue, start_at, end_at, status, target_type, target_department_id, department, recipient_type, created_by, registration_enabled, registration_deadline, created_at, updated_at, status_changed_at)")
    lines.append("VALUES ('LOADTEST CSE Department Event', 'CSE scoped event to verify Department Admin authorized access.', 'CSE Seminar Hall', '2026-11-02 10:00:00', '2026-11-03 17:00:00', 'PUBLISHED', 'DEPARTMENT', 292, 'CSE', 'department', 1, 1, '2026-11-02 09:00:00', NOW(6), NOW(6), NOW(6))")
    lines.append("ON DUPLICATE KEY UPDATE updated_at = NOW(6);")
    lines.append("")

    lines.append("INSERT INTO events (title, description, venue, start_at, end_at, status, target_type, target_department_id, department, recipient_type, created_by, registration_enabled, registration_deadline, created_at, updated_at, status_changed_at)")
    lines.append("VALUES ('LOADTEST AIML Department Event', 'AIML scoped event to verify Department Admin forbidden access from CSE admin.', 'AIML Lab 3', '2026-11-03 10:00:00', '2026-11-04 17:00:00', 'PUBLISHED', 'DEPARTMENT', 293, 'AIML', 'department', 1, 1, '2026-11-03 09:00:00', NOW(6), NOW(6), NOW(6))")
    lines.append("ON DUPLICATE KEY UPDATE updated_at = NOW(6);")
    lines.append("")

    with open("load-tests/scripts/setup-data.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("Wrote setup-data.sql successfully.")

    cleanup = [
        "-- NotifyHub Load Test Cleanup Script",
        "USE notifyhub;",
        "",
        "-- Remove registrations for loadtest events and students",
        "DELETE FROM event_registrations WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'LOADTEST%') OR student_id IN (SELECT id FROM users WHERE username LIKE 'loadtest_%');",
        "",
        "-- Remove student profiles for synthetic users",
        "DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'loadtest_%');",
        "",
        "-- Remove draft events created during admin tests",
        "DELETE FROM events WHERE title LIKE 'LOADTEST%' OR title LIKE 'Draft Event Automated LoadTest%';",
        "",
        "-- Remove synthetic users",
        "DELETE FROM users WHERE username LIKE 'loadtest_%';",
        "",
        "SELECT 'Cleanup complete' as status;"
    ]
    with open("load-tests/scripts/cleanup-data.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(cleanup))
    print("Wrote cleanup-data.sql successfully.")

if __name__ == "__main__":
    generate()
