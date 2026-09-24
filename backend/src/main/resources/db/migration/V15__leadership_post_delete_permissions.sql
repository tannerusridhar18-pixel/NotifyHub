-- V15: Grant ANNOUNCEMENT_DELETE and EVENT_DELETE to PRINCIPAL and DEAN for managing own posts
INSERT IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.permission_key FROM roles r
CROSS JOIN (
  SELECT 'ANNOUNCEMENT_DELETE' as permission_key UNION ALL
  SELECT 'EVENT_DELETE'
) p
WHERE r.name IN ('PRINCIPAL', 'DEAN');
