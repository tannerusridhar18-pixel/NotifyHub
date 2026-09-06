NotifyHub

A centralized campus communication and notification platform for students, faculty, and administrators.

NotifyHub is a full-stack campus communication platform designed to solve a common problem in educational institutions: important announcements, events, academic information, and campus queries are often distributed across multiple disconnected channels.

The goal of NotifyHub is to provide one secure, organized, role-based platform through which administrators and faculty can publish information and students can receive, discover, and interact with relevant campus updates.

The project is being developed as a real full-stack application, not as a static frontend prototype.

📌 Project Vision

NotifyHub aims to become a centralized digital communication hub for a college or university.

Instead of depending on:

WhatsApp groups

Telegram groups

notice boards

scattered emails

manually forwarded messages

separate event announcements

informal communication channels

NotifyHub brings campus communication into a single platform.

The long-term system will allow:

Students

Register and securely log in

View important announcements

Discover upcoming campus events

Receive relevant notifications

Track read/unread notifications

Submit campus-related queries

View responses to submitted queries

Manage their profile and notification preferences

Faculty

Securely register/log in

Publish permitted announcements

Create and manage events

Communicate important academic information

Respond to student queries where permitted

Manage information relevant to their responsibilities

Administrators

Manage users and roles

Control announcements

Manage campus events

Handle student queries

Control important/urgent notifications

Monitor platform activity

Manage platform-level configuration and permissions

🎯 Main Objectives

The main objectives of NotifyHub are:

Centralize campus communication

Reduce information loss and missed announcements

Provide role-based access

Deliver information according to user relevance

Provide secure authentication

Maintain persistent data using MySQL

Provide a modern and responsive user experience

Create a scalable backend architecture

Provide proper separation between frontend, backend, and database

Build the system as a production-style application rather than a simple academic prototype

🏗️ System Architecture

NotifyHub follows a full-stack architecture:

                    ┌──────────────────────────┐
                    │        NotifyHub         │
                    │      Web Application     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │       Next.js Frontend   │
                    │     React + Tailwind CSS  │
                    └────────────┬─────────────┘
                                 │
                           REST API / HTTP
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │     Spring Boot API      │
                    │       Java 21            │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌───────────┐     ┌─────────────┐    ┌─────────────┐
        │   Auth    │     │ Announcements│    │   Events    │
        └───────────┘     └─────────────┘    └─────────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │  Query System    │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │      MySQL       │
                       │    Database      │
                       └──────────────────┘

🧰 Technology Stack

Frontend

Next.js

React

Tailwind CSS

JavaScript

Next.js App Router

The frontend is responsible for:

User interface

Authentication pages

Dashboards

Announcements

Events

Notifications

Query submission

User interactions

Responsive design

Backend

Java 21

Spring Boot 3.x

Spring Web

Spring Data JPA

Spring Security

JWT

BCrypt

Bean Validation

Flyway

Spring Boot Actuator

Maven

The backend follows a modular architecture with separate domains for authentication, announcements, events, queries, security, and common functionality.

Database

MySQL

NotifyHub uses MySQL as the actual application database.

The database schema is managed using Flyway migrations.

The current initial migration contains core tables including:

users
refresh_tokens
announcements
events
queries

Hibernate/JPA is configured to validate the schema rather than silently creating or modifying the production schema.

🔐 Authentication & Security

Security is a major part of NotifyHub.

The backend currently uses:

Spring Security

JWT access tokens

Refresh tokens

BCrypt password hashing

Role-based authorization

Authentication filters

CORS configuration

Security headers

Rate limiting

Bean validation

The intended authentication architecture is:

User
 │
 ├── Register
 │
 ▼
Backend validation
 │
 ▼
Password hashing
 │
 ▼
MySQL users table
 │
 ▼
Login
 │
 ▼
JWT access token
 │
 ├── Access protected APIs
 │
 └── Refresh using refresh token

Passwords are never intended to be stored as plain text.

👥 User Roles

NotifyHub is designed around three primary user roles.

🎓 Student

Students are the main consumers of campus information.

Planned capabilities include:

Student registration

Student login

Student dashboard

Announcement feed

Event feed

Notification center

Read/unread notification management

Campus query submission

Query status tracking

Profile management

Notification preferences

👨‍🏫 Faculty

Faculty members have additional communication capabilities.

Planned capabilities include:

Faculty registration/login

Faculty dashboard

Publish permitted announcements

Create/manage permitted events

View relevant campus information

Handle assigned student queries

Notification management

Profile management

🛡️ Administrator

Administrators have platform-management privileges.

Planned capabilities include:

Admin authentication

Admin dashboard

User management

Role management

Announcement management

Event management

Query management

Urgent announcement management

Platform monitoring

Administrative controls

📢 Announcement System

Announcements are one of the core modules of NotifyHub.

The backend already contains an announcement domain with:

Announcement entity

Repository

Service

Controller

The API architecture supports operations such as:

GET    /api/v1/announcements
GET    /api/v1/announcements/urgent

POST   /api/v1/announcements
PUT    /api/v1/announcements/{id}
DELETE /api/v1/announcements/{id}

Public users should be able to consume appropriate announcements, while management operations are protected according to user roles.

📅 Event Management

NotifyHub includes a dedicated event system.

Events may represent:

College events

Seminars

Workshops

Examinations

Academic activities

Student activities

Important campus dates

The backend currently contains an event domain with its own:

Entity

Repository

Service

Controller

The system will eventually provide a complete event-management experience through the frontend.

❓ Campus Query System

NotifyHub is also intended to provide a structured way for students to ask campus-related questions.

Instead of asking questions through scattered communication channels, students will be able to submit queries through the platform.

Basic workflow:

Student
   │
   ▼
Submit Query
   │
   ▼
Query stored in MySQL
   │
   ▼
Faculty/Admin reviews query
   │
   ▼
Answer submitted
   │
   ▼
Student receives response

The backend currently contains a query domain and supports the core query workflow.

🔔 Notification System

The notification system is one of the most important long-term components of NotifyHub.

The objective is to ensure that users do not have to continuously search for important information.

Notifications will eventually support concepts such as:

New announcements

Urgent announcements

Upcoming events

Query responses

Important academic information

Role-specific notifications

Read/unread state

Notification priority

Notification history

The notification interface will visually distinguish between:

Unread
Read
Urgent
Important
Normal

The notification system will be developed incrementally after the core authentication and data flows are stable.

🎨 Frontend Design Philosophy

NotifyHub is not intended to look like a generic dashboard template.

The frontend should feel like a polished modern SaaS/product application.

Design principles include:

Strong visual hierarchy

Modern color palettes

Appropriate gradients

Responsive layouts

Clear navigation

Accessible contrast

Meaningful icons

Polished loading states

Clear success/error states

Professional spacing

Subtle animations and transitions

Mobile, tablet, and desktop support

Different user roles should have their own visual identity while remaining recognizably part of NotifyHub.

For example:

Student
→ Fresh and energetic

Faculty
→ Professional academic

Admin
→ Powerful management-oriented

Notifications
→ Clear visual priority based on state/type

📁 Project Structure

The repository is organized into the major application layers.

NotifyHub/
│
├── backend/
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/
│   │   │   │       └── notifyhub/
│   │   │   │           ├── announcement/
│   │   │   │           ├── auth/
│   │   │   │           ├── common/
│   │   │   │           ├── config/
│   │   │   │           ├── event/
│   │   │   │           ├── query/
│   │   │   │           ├── security/
│   │   │   │           └── NotifyHubApplication.java
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── db/
│   │   │       │   └── migration/
│   │   │       └── application.yml
│   │   │
│   │   └── test/
│   │
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

🗄️ Database Schema

The initial database design contains the following major areas:

users
 │
 ├── Authentication information
 ├── Role
 └── Account status

refresh_tokens
 │
 └── Secure session/token management

announcements
 │
 └── Campus announcements

events
 │
 └── Campus events

queries
 │
 └── Student questions and responses

The schema will evolve as additional NotifyHub functionality is implemented.

All database changes should be introduced through Flyway migrations.

🔌 API Architecture

NotifyHub exposes REST APIs under:

/api/v1/

Major API areas include:

/api/v1/auth
/api/v1/announcements
/api/v1/events
/api/v1/queries

The API will continue to expand as new modules are implemented.

🧪 Testing Strategy

Testing is an important part of the project.

The backend should be tested at multiple levels.

Unit Testing

Test:

Services

Validation

Security logic

Business rules

Utility classes

Integration Testing

Test:

Controllers

Services

Repositories

Database interaction

Authentication flows

API Testing

Test:

HTTP status codes

Request validation

Authentication

Authorization

Error responses

CRUD operations

End-to-End Testing

The final application should verify complete flows such as:

Register
   ↓
Database
   ↓
Login
   ↓
Dashboard
   ↓
Create/View data
   ↓
Notification
   ↓
User interaction

🚧 Current Development Status

NotifyHub is currently in active development.

The repository already contains substantial backend and frontend foundations, including:

Spring Boot backend

Java 21

MySQL integration

Flyway database migration

User entity/repository

JWT authentication infrastructure

Refresh-token infrastructure

Announcement module

Event module

Query module

Security configuration

Frontend authentication pages

However, the application is not yet considered complete.

Some frontend and backend flows still need to be fully connected and verified end-to-end.

In particular, the registration flow is currently being rebuilt and verified so that:

Registration UI
        ↓
Registration API
        ↓
Backend validation
        ↓
Password hashing
        ↓
UserRepository
        ↓
MySQL

works correctly before further features are built on top of it.

🛠️ Development Roadmap

The project will be developed in stages.

Phase 1 — Foundation & Authentication

Project structure

Spring Boot backend

MySQL integration

Flyway migration

User entity

User repository

JWT infrastructure

Refresh token infrastructure

Password hashing

Complete registration flow

Fully connect frontend authentication

Verify registration persistence

Verify login end-to-end

Verify role-based access

Phase 2 — Role-Based Dashboards

Develop separate experiences for:

Student

Faculty

Administrator

Each dashboard will have functionality appropriate to its role rather than simply reusing the same generic dashboard.

Phase 3 — Announcements

Backend announcement domain

Announcement CRUD API foundation

Frontend announcement feed

Announcement creation UI

Announcement editing

Announcement deletion

Urgent announcements

Role-based announcement visibility

Announcement notifications

Phase 4 — Events

Backend event domain

Event dashboard

Event creation

Event editing

Event deletion

Event discovery

Upcoming-event display

Event notifications

Phase 5 — Campus Queries

Backend query domain

Student query interface

Query status interface

Faculty/Admin response interface

Query notifications

Query history

Phase 6 — Notification Center

Notification database model

Notification API

Notification center

Read/unread state

Notification priority

Urgent notifications

Notification history

Role-specific notifications

Phase 7 — User & Administration

User management

Role management

Account activation/deactivation

Profile management

Admin controls

Administrative monitoring

Audit-oriented functionality

Phase 8 — Production Hardening

Complete backend test coverage

Frontend testing

End-to-end testing

API validation

Security review

Error handling improvements

Rate-limit verification

Database migration verification

Performance improvements

Production configuration

Deployment preparation

🔄 Development Workflow

Development should follow this workflow:

Understand requirement
        ↓
Design feature
        ↓
Implement backend
        ↓
Implement database changes
        ↓
Implement frontend
        ↓
Connect frontend ↔ backend
        ↓
Write/update tests
        ↓
Run backend tests
        ↓
Run frontend tests
        ↓
Perform API smoke tests
        ↓
Perform end-to-end verification
        ↓
Review
        ↓
Commit

A feature should not be considered complete merely because its UI exists.

A feature is complete only when its full flow works.

🧭 Project Development Principle

NotifyHub will be developed incrementally rather than by continuously adding disconnected features.

For every major feature, we will verify:

UI
 ↓
API
 ↓
Business Logic
 ↓
Database
 ↓
Response
 ↓
UI State

This prevents situations where the frontend displays a success message even though the backend/database operation did not actually occur.

🔒 Database & Backend Rule

The actual NotifyHub backend architecture uses:

Java
Spring Boot
MySQL
JPA
Flyway

MySQL is the project's database.

Neon PostgreSQL is not part of the current NotifyHub architecture.

Any older documentation referring to Neon PostgreSQL should be considered obsolete unless the architecture is explicitly changed in the future.

📋 API Development Principles

All APIs should:

Validate incoming data

Return appropriate HTTP status codes

Enforce authentication where required

Enforce role-based authorization

Avoid exposing sensitive information

Return consistent error responses

Follow REST conventions

Use DTOs where appropriate

Keep business logic inside services

Keep persistence logic inside repositories

🧑‍💻 Local Development

Prerequisites

Install:

Java 21

Maven

MySQL

Node.js

npm

Git

⚙️ Backend Setup

Clone the repository:

git clone https://github.com/tannerusridhar18-pixel/NotifyHub.git
cd NotifyHub

Move into the backend:

cd backend

Configure the MySQL database and application credentials according to the backend configuration.

The expected database is:

notifyhub

Run the backend:

mvn spring-boot:run

Or:

mvn clean package
java -jar target/*.jar

🧪 Backend Tests

Run:

mvn test

A feature should not be considered complete until its relevant tests pass.

🌐 Frontend Setup

From the repository root, install dependencies:

npm install

Start the development server:

npm run dev

The frontend development server will normally be available at:

http://localhost:3000

🔗 Frontend ↔ Backend

The frontend communicates with the Spring Boot backend through REST APIs.

The intended flow is:

Browser
   ↓
Next.js
   ↓
REST API
   ↓
Spring Boot
   ↓
Service Layer
   ↓
Repository
   ↓
MySQL

Environment-specific configuration should be used for backend URLs rather than hardcoding production endpoints into frontend components.

📈 Future Expansion

NotifyHub is designed so that additional capabilities can be introduced without rebuilding the entire application.

Potential future areas include:

More advanced notification delivery

Personalized notification feeds

Advanced search

Announcement categorization

Event categorization

Notification preferences

Analytics

Administrative reporting

Audit trails

Improved monitoring

Production deployment

Additional communication channels

These will be introduced only after the core platform is stable.

🎨 Product Quality Standard

Every new NotifyHub frontend feature should satisfy the following.

Visual quality

Modern

Professional

Responsive

Accessible

Consistent with NotifyHub

Clear visual hierarchy

Interaction quality

Clear loading states

Clear empty states

Clear success states

Clear error states

Useful feedback after actions

Responsive controls

Technical quality

Reusable components where appropriate

Clean separation of concerns

No unnecessary dependencies

Proper API integration

Proper validation

Secure handling of user data

NotifyHub should feel like a real modern SaaS/product application, not a basic college-project prototype.

📊 Project Status Legend

Symbol

Meaning

✅

Implemented and verified

🟡

Partially implemented / integration required

🔴

Not implemented

🚧

Currently under development

🤝 Development Philosophy

NotifyHub is being built with the following principles:

Correctness before speed

Security by design

Database persistence must be real

Frontend success messages must reflect actual backend success

Features must be tested end-to-end

Clean architecture

Maintainable code

Responsive UI

Incremental development

No unnecessary technologies

No fake or simulated backend behavior in the finished application

📜 License

This project is currently under development.

License information will be added when the project reaches the appropriate release stage.

👤 Project

NotifyHub

A centralized campus notification and communication platform.

Repository:

https://github.com/tannerusridhar18-pixel/NotifyHub

🚀 Current Priority

The immediate development priority is:

1. Complete registration
        ↓
2. Verify MySQL persistence
        ↓
3. Complete login
        ↓
4. Verify JWT + roles
        ↓
5. Build student/faculty/admin dashboards
        ↓
6. Connect announcements
        ↓
7. Connect events
        ↓
8. Complete campus queries
        ↓
9. Build notification center
        ↓
10. Complete administration features
        ↓
11. Full testing
        ↓
12. Production hardening & deployment

The objective is not simply to make individual screens work.

The objective is to make NotifyHub work as one complete, secure, connected platform from the user's browser to the database.