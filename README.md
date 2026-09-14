# NotifyHub

A centralized campus communication and notification platform for students, faculty, and administrators.

NotifyHub solves a common problem in educational institutions: important announcements, events, academic information, and campus queries are scattered across WhatsApp groups, Telegram groups, notice boards, emails, and informal channels. NotifyHub brings all of that into one secure, role-based platform.

This is being built as a real full-stack application — not a static frontend prototype.

## Table of Contents

- [Project Vision](#project-vision)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [User Roles](#user-roles)
- [Core Modules](#core-modules)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Testing](#testing)
- [Current Development Status](#current-development-status)
- [Development Roadmap](#development-roadmap)
- [Development Philosophy](#development-philosophy)
- [License](#license)

## Project Vision

NotifyHub aims to become the centralized digital communication hub for a college or university, allowing:

**Students** to register/log in, view announcements, discover events, receive notifications, track read/unread status, submit campus queries, view query responses, and manage their profile and notification preferences.

**Faculty** to register/log in, publish permitted announcements, create and manage events, communicate academic information, and respond to student queries where permitted.

**Administrators** to manage users and roles, control announcements and events, handle queries, manage urgent notifications, and monitor platform activity and configuration.

### Main Objectives

- Centralize campus communication and reduce missed announcements
- Provide role-based access and relevance-driven delivery
- Provide secure authentication and persistent storage via MySQL
- Deliver a modern, responsive user experience
- Build a scalable backend with clean separation between frontend, backend, and database
- Build a production-style application rather than an academic prototype

## System Architecture

```
                    ┌──────────────────────────┐
                    │        NotifyHub         │
                    │      Web Application     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      Next.js Frontend    │
                    │     React + Tailwind CSS │
                    └────────────┬─────────────┘
                                 │
                           REST API / HTTP
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      Spring Boot API     │
                    │         Java 21          │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌───────────┐     ┌─────────────┐    ┌─────────────┐
        │   Auth    │     │Announcements│    │   Events    │
        └───────────┘     └─────────────┘    └─────────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │   Query System   │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │      MySQL       │
                       │     Database     │
                       └──────────────────┘
```

## Technology Stack

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS
- JavaScript

Handles the UI, authentication pages, dashboards, announcements, events, notifications, query submission, and responsive design.

### Backend
- Java 21
- Spring Boot 3.x (Web, Data JPA, Security)
- JWT + BCrypt for authentication
- Bean Validation
- Flyway (database migrations)
- Spring Boot Actuator
- Maven

The backend follows a modular architecture with separate domains for authentication, announcements, events, queries, security, and common functionality.

### Database
- **MySQL** is the project's database. (Note: older docs referencing Neon PostgreSQL are obsolete — MySQL is the current architecture.)
- Schema is managed via Flyway migrations.
- Core tables: `users`, `refresh_tokens`, `announcements`, `events`, `queries`
- Hibernate/JPA is configured to **validate** the schema rather than auto-generate or modify it in production.

### Authentication & Security
- Spring Security with JWT access tokens and refresh tokens
- BCrypt password hashing (passwords are never stored in plain text)
- Role-based authorization
- CORS configuration, security headers, rate limiting, and bean validation

Flow: `Register → Backend validation → Password hashing → MySQL (users table) → Login → JWT access token → Access protected APIs / Refresh via refresh token`

## User Roles

| Role | Capabilities |
|---|---|
| 🎓 **Student** | Registration/login, dashboard, announcement & event feeds, notification center, read/unread tracking, query submission & status tracking, profile & notification preferences |
| 👨‍🏫 **Faculty** | Registration/login, dashboard, publish permitted announcements, create/manage permitted events, respond to assigned queries, notification & profile management |
| 🛡️ **Administrator** | Admin authentication & dashboard, user/role management, full announcement/event/query management, urgent notification control, platform monitoring & configuration |

## Core Modules

### 📢 Announcements
Backend domain implemented (entity, repository, service, controller).

```
GET    /api/v1/announcements
GET    /api/v1/announcements/urgent
POST   /api/v1/announcements
PUT    /api/v1/announcements/{id}
DELETE /api/v1/announcements/{id}
```

Public users can consume appropriate announcements; management operations are protected by role.

### 📅 Events
Dedicated domain for college events, seminars, workshops, exams, and other campus dates (entity, repository, service, controller implemented). Frontend event management experience is planned.

### ❓ Campus Queries
Structured way for students to ask campus-related questions instead of scattered channels:

`Student → Submit Query → Stored in MySQL → Faculty/Admin reviews → Answer submitted → Student receives response`

Backend query domain and core workflow are implemented.

### 🔔 Notifications
The most important long-term component — planned to cover new/urgent announcements, upcoming events, query responses, role-specific notifications, read/unread state, priority, and history. Will be built incrementally once auth and core data flows are stable.

## Project Structure

```
NotifyHub/
│
├── backend/
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/notifyhub/
│   │   │   │   ├── announcement/
│   │   │   │   ├── auth/
│   │   │   │   ├── common/
│   │   │   │   ├── config/
│   │   │   │   ├── event/
│   │   │   │   ├── query/
│   │   │   │   ├── security/
│   │   │   │   └── NotifyHubApplication.java
│   │   │   └── resources/
│   │   │       ├── db/migration/
│   │   │       └── application.yml
│   │   └── test/
│   └── ...
│
├── app/
│   ├── auth/
│   ├── login/
│   ├── register/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
│
├── components/
├── lib/
├── public/
├── package.json
├── tools/
├── prompt.txt
└── README.md
```

## Local Development Setup

### Prerequisites
- Java 21
- Maven
- MySQL
- Node.js
- npm
- Git

### Backend Setup

```bash
git clone https://github.com/tannerusridhar18-pixel/NotifyHub.git
cd NotifyHub/backend
```

Configure the MySQL database and application credentials in the backend configuration. The expected database name is `notifyhub`.

Run the backend:
```bash
mvn spring-boot:run
```
or build and run the jar:
```bash
mvn clean package
java -jar target/*.jar
```

### Frontend Setup

From the repository root:
```bash
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:3000` by default.

### Frontend ↔ Backend Flow

```
Browser → Next.js → REST API → Spring Boot → Service Layer → Repository → MySQL
```

Use environment-specific configuration for backend URLs rather than hardcoding endpoints in frontend components.

## Testing

Testing spans four levels:

- **Unit Testing** — services, validation, security logic, business rules, utility classes
- **Integration Testing** — controllers, services, repositories, DB interaction, auth flows
- **API Testing** — HTTP status codes, request validation, auth/authz, error responses, CRUD
- **End-to-End Testing** — full flows such as Register → Database → Login → Dashboard → Create/View data → Notification → User interaction

Run backend tests:
```bash
mvn test
```

A feature is not considered complete until its relevant tests pass, and a feature is not complete merely because its UI exists — the full flow (UI → API → Business Logic → Database → Response → UI State) must work.

## Current Development Status

NotifyHub is in **active development**. The repository already contains substantial foundations:

- ✅ Spring Boot backend (Java 21)
- ✅ MySQL integration
- ✅ Flyway database migrations
- ✅ User entity/repository
- ✅ JWT authentication infrastructure
- ✅ Refresh-token infrastructure
- ✅ Announcement module
- ✅ Event module
- ✅ Query module
- ✅ Security configuration
- ✅ Frontend authentication pages

**Not yet complete:** several frontend/backend flows still need to be fully connected and verified end-to-end. In particular, the **registration flow is currently being rebuilt and verified**:

```
Registration UI → Registration API → Backend validation → Password hashing → UserRepository → MySQL
```

This must work correctly before further features are layered on top.

### 🚀 Current Priority Order

1. Complete registration
2. Verify MySQL persistence
3. Complete login
4. Verify JWT + roles
5. Build student/faculty/admin dashboards
6. Connect announcements
7. Connect events
8. Complete campus queries
9. Build notification center
10. Complete administration features
11. Full testing
12. Production hardening & deployment

## Development Roadmap

| Phase | Focus |
|---|---|
| 1 | Foundation & Authentication — project structure, Spring Boot, MySQL, Flyway, user entity/repo, JWT + refresh tokens, password hashing, full registration/login flow, role-based access |
| 2 | Role-Based Dashboards — separate student, faculty, and admin experiences |
| 3 | Announcements — backend domain, CRUD API, frontend feed, creation/editing/deletion, urgent announcements, role-based visibility, notifications |
| 4 | Events — backend domain, event dashboard, CRUD, discovery, upcoming-event display, notifications |
| 5 | Campus Queries — backend domain, student/faculty/admin interfaces, notifications, history |
| 6 | Notification Center — data model, API, read/unread state, priority, urgent + role-specific notifications, history |
| 7 | User & Administration — user/role management, account activation, profile management, admin controls, audit-oriented functionality |
| 8 | Production Hardening — full test coverage, E2E testing, security review, error handling, rate-limit verification, migration verification, performance, deployment prep |

### Development Workflow

```
Understand requirement → Design feature → Implement backend → Implement DB changes →
Implement frontend → Connect frontend ↔ backend → Write/update tests →
Run backend tests → Run frontend tests → API smoke tests → E2E verification → Review → Commit
```

## Development Philosophy

- Correctness before speed
- Security by design
- Database persistence must be real — no fake or simulated backend behavior
- Frontend success messages must reflect actual backend success
- Features must be tested end-to-end
- Clean, maintainable, incremental architecture
- No unnecessary technologies or dependencies
- NotifyHub should feel like a real modern SaaS product, not a college-project prototype

### Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Implemented and verified |
| 🟡 | Partially implemented / integration required |
| 🔴 | Not implemented |
| 🚧 | Currently under development |

## License

This project is currently under development. License information will be added when the project reaches an appropriate release stage.

## Project

**NotifyHub** — A centralized campus notification and communication platform.

Repository: [github.com/tannerusridhar18-pixel/NotifyHub](https://github.com/tannerusridhar18-pixel/NotifyHub)