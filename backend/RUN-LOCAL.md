# NotifyHub local run checklist

## 1. MySQL
Create the `notifyhub` database and make sure MySQL is running.

## 2. Backend environment
PowerShell example:

```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_mysql_password"
$env:JWT_SECRET="replace_with_a_long_random_secret_at_least_32_characters"
$env:ADMIN_USERNAME="admin"
$env:ADMIN_EMAIL="admin@notifyhub.local"
$env:ADMIN_PASSWORD="your_strong_admin_password"
$env:ADMIN_SYNC_PASSWORD="true"
$env:FRONTEND_ORIGIN="http://localhost:3000"
```

`ADMIN_PASSWORD` is never sent to the frontend. The backend hashes it with BCrypt and synchronizes the bootstrap admin account at startup.

## 3. Start backend

```powershell
mvn spring-boot:run
```

The application must remain running on port 8080. If startup reports `JWT secret is missing`, the environment variable was not set in the same terminal.

## 4. Frontend

Create `frontend/.env.local` from `.env.example` if required, then:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5. Admin login

Use:

- Email: the value of `ADMIN_EMAIL` (default `admin@notifyhub.local`)
- Password: the value of `ADMIN_PASSWORD`

The admin portal does not ask for an invitation.

## 6. Student / faculty invitation flow

Admin -> People & Invites -> enter the campus member details -> Send invitation email.

The backend generates a one-time, hashed invitation token and sends a registration URL through the configured SMTP account. The recipient opens that URL, chooses a password, and becomes `ACTIVE`. After activation, normal login uses only email + password; the invitation is not required again.

### SMTP example

```powershell
$env:MAIL_ENABLED="true"
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="yourgmail@gmail.com"
$env:MAIL_PASSWORD="your_gmail_app_password"
$env:MAIL_SMTP_AUTH="true"
$env:MAIL_SMTP_STARTTLS="true"
$env:MAIL_FROM="yourgmail@gmail.com"
```

For Gmail, use an App Password rather than the normal account password.
