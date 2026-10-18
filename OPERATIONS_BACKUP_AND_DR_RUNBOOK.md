# NotifyHub — Production Operations, Backup & Disaster Recovery Runbook

This runbook defines the operational requirements, backup workflows, disaster recovery procedures, and infrastructure configuration for deploying and operating NotifyHub in production.

---

## 1. Architecture Overview & Security Perimeter

- **Frontend Tier**: Next.js 16 (Node.js 20 Alpine container), reverse-proxied behind cloud ingress.
- **Backend Tier**: Spring Boot 3.5.4 (Eclipse Temurin 21 JRE Alpine container), running as a non-privileged `notifyhub` user.
- **Database Tier**: MySQL 8.0 with InnoDB engine, utf8mb4 charset, SSL connection enforcement.
- **Mail Gateway**: External SMTP (Google Workspace / AWS SES) over TLS (port 587).

---

## 2. Ingress & TLS Termination

### 2.1 TLS Requirements
- Production ingress (e.g., AWS ALB, NGINX Ingress, Cloudflare) must terminate TLS 1.3/1.2 using modern cipher suites.
- SSL certificates must be issued by a trusted public CA (e.g., Let's Encrypt, AWS Certificate Manager) with automated renewal &le;30 days before expiration.
- Plain HTTP (port 80) must issue a `301 Moved Permanently` redirect to HTTPS (port 443).

### 2.2 Forwarding Headers & Cookies
Configure the reverse proxy to pass standard proxy headers:
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-Host $host;
```
The backend enforces:
- `AUTH_COOKIE_SECURE=true`: Session cookies (`NH_ACCESS`, `NH_REFRESH`) transmitted exclusively over HTTPS.
- `AUTH_COOKIE_SAME_SITE=Lax`: Defends against cross-site request forgery while permitting top-level navigation.
- HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

---

## 3. Database Least-Privilege Access Configuration

In production, avoid connecting the application with the MySQL `root` account. Provision two separated accounts:

### 3.1 Migration User (Flyway / CI/CD)
```sql
CREATE USER 'notifyhub_migration'@'%' IDENTIFIED BY '${MIGRATION_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON notifyhub.* TO 'notifyhub_migration'@'%';
ALTER USER 'notifyhub_migration'@'%' REQUIRE SSL;
FLUSH PRIVILEGES;
```

### 3.2 Application Runtime User (Spring Boot)
```sql
CREATE USER 'notifyhub_app'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON notifyhub.* TO 'notifyhub_app'@'%';
-- Explicitly deny schema modifications at runtime:
REVOKE CREATE, ALTER, DROP, REFERENCES, INDEX ON notifyhub.* FROM 'notifyhub_app'@'%';
ALTER USER 'notifyhub_app'@'%' REQUIRE SSL;
FLUSH PRIVILEGES;
```

---

## 4. Automated Database Backup & Retention Policy

### 4.1 Backup Strategy
- **Frequency**: Full logical dump daily at 02:00 UTC (during lowest campus activity).
- **Tooling**: `mysqldump` with transactional consistency flags:
  ```bash
  mysqldump --host="${DB_HOST}" \
            --user="notifyhub_backup" \
            --password="${BACKUP_DB_PASSWORD}" \
            --single-transaction \
            --quick \
            --routines \
            --triggers \
            --hex-blob \
            --ssl-mode=REQUIRED \
            notifyhub | gzip -9 > "/backups/notifyhub_$(date +%Y%m%d_%H%M%S).sql.gz"
  ```
- **Offsite Synchronization**: Sync to an offsite S3/GCS bucket configured with SSE-KMS and bucket versioning:
  ```bash
  aws s3 cp "/backups/notifyhub_$(date +%Y%m%d_%H%M%S).sql.gz" \
            "s3://notifyhub-production-backups-secure/daily/" \
            --sse aws:kms
  ```

### 4.2 Retention Schedule (Grandfather-Father-Son)
- **Daily Backups**: Retained for 7 days.
- **Weekly Backups** (Sunday snapshot): Retained for 4 weeks.
- **Monthly Backups** (1st of month): Retained for 12 months.
- **Annual Backups**: Retained for 7 years (compliance / institutional archive).
- Storage buckets must have Object Lock / WORM policy enabled to mitigate ransomware risks.

---

## 5. Disaster Recovery & Restoration Runbook

In the event of database corruption, accidental loss, or infrastructure failure:

### Step 1: Declare Maintenance & Stop Application Traffic
```bash
# Scale down backend to prevent partial write inconsistency during recovery
kubectl scale deployment/notifyhub-backend --replicas=0
```

### Step 2: Retrieve & Verify Target Backup
```bash
# Download target timestamped snapshot
aws s3 cp s3://notifyhub-production-backups-secure/daily/notifyhub_YYYYMMDD_HHMMSS.sql.gz ./
# Verify SHA256 checksum against metadata log
sha256sum -c notifyhub_YYYYMMDD_HHMMSS.sql.gz.sha256
```

### Step 3: Restore Schema into Target Database
```bash
# Decompress and apply to database
gunzip -c notifyhub_YYYYMMDD_HHMMSS.sql.gz | mysql --host="${DB_HOST}" \
                                                   --user="notifyhub_admin" \
                                                   --password="${ADMIN_DB_PASSWORD}" \
                                                   --ssl-mode=REQUIRED \
                                                   notifyhub
```

### Step 4: Validate Flyway Schema State
```bash
# Run Flyway validate from backend container or CLI to confirm checksum consistency
java -jar app.jar --spring.profiles.active=prod --flyway.validate-only=true
```

### Step 5: Resume Traffic & Verify Health
```bash
kubectl scale deployment/notifyhub-backend --replicas=3
curl -sSf https://api.notifyhub.edu/actuator/health | grep '"status":"UP"'
```

---

## 6. Monitoring, Health Checks & Operational Logging

### 6.1 Endpoints
- **Liveness Probe**: `GET /actuator/health` (returns `{"status":"UP"}` with HTTP 200).
- **Readiness Probe**: `GET /actuator/health` verifies database connectivity before accepting ingress traffic.

### 6.2 Recommended Metrics & Alert Thresholds
| Metric | Threshold | Severity | Recommended Action |
|---|---|:---:|---|
| HTTP 5xx Error Rate | &gt; 1% over 5m | Critical | Inspect centralized logs; check database latency. |
| Hikari Connection Pool | &gt; 90% active connections | High | Increase `DB_POOL_MAX` or investigate slow queries. |
| Disk Free Space | &lt; 15% | High | Rotate local container logs or expand volume. |
| JVM Heap Usage | &gt; 85% for &gt; 10m | Medium | Capture thread dump; check memory allocation. |

### 6.3 Sensitive Data Hygiene
- Application logs are configured with `server.error.include-stacktrace: never`.
- Password and token parameters are sanitized by `InvitationEmailDispatcher` and `InvitationEmailService` regex filters.
- Never output `application.yml` or environment variable dumps to stdout.
