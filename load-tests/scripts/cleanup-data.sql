-- NotifyHub Load Test Cleanup Script
USE notifyhub;

-- Remove registrations for loadtest events and students
DELETE FROM event_registrations WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'LOADTEST%') OR student_id IN (SELECT id FROM users WHERE username LIKE 'loadtest_%');

-- Remove student profiles for synthetic users
DELETE FROM student_profiles WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'loadtest_%');

-- Remove draft events created during admin tests
DELETE FROM events WHERE title LIKE 'LOADTEST%' OR title LIKE 'Draft Event Automated LoadTest%';

-- Remove synthetic users
DELETE FROM users WHERE username LIKE 'loadtest_%';

SELECT 'Cleanup complete' as status;