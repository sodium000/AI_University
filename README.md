# 🎓 AI Agentic University — Backend API

A full-featured **University Management System** REST API built with **Express.js**, **TypeScript**, **Prisma 8 (ORM)**, **PostgreSQL**, **Redis**, and **Stripe** — deployed on **Vercel**.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Features](#features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Roles and Permissions](#roles-and-permissions)
- [Payment Flow Stripe](#payment-flow-stripe)
- [Deployment Vercel](#deployment-vercel)

---

## Overview

**AI Agentic University** is a scalable backend system that handles the full lifecycle of a university:

- Student registration, enrollment, attendance, results, and billing
- Faculty management, assignment grading, and exam scheduling
- Admin oversight with department/program/course management
- Super Admin system control with audit logs and health monitoring
- Stripe-powered payment processing with webhook support
- Redis-backed OTP caching and token management
- JWT authentication with role-based access control
- Email notifications via Nodemailer

**Base URL:** `http://localhost:5000`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js + TypeScript |
| **Framework** | Express.js v5 |
| **ORM** | Prisma 8 (`@prisma/orm-postgres`) |
| **Database** | PostgreSQL (via Prisma Platform) |
| **Cache / OTP Store** | Redis |
| **Auth** | JWT (Access + Refresh tokens) |
| **Password Hashing** | bcryptjs |
| **Email** | Nodemailer (Gmail SMTP) |
| **Payments** | Stripe (Checkout Sessions + Webhooks) |
| **Validation** | Zod |
| **Templating** | EJS (email templates) |
| **Build Tool** | tsup |
| **Dev Runner** | tsx (watch mode) |
| **Deployment** | Vercel |

---

## Architecture

```
Client Request
      |
      v
  Express Router
      |
      v
  Middleware (Auth Guard, Role Guard, Error Handler)
      |
      v
  Controller  -->  Service  -->  Prisma ORM  -->  PostgreSQL
                      |
                      +-->  Redis (OTP / Token cache)
                      |
                      +-->  Stripe (Payment processing)
                      |
                      +-->  Nodemailer (Email notifications)
```

---

## Database Schema

The database is modelled with **Prisma 8** and uses a PostgreSQL backend.

| Model | Description |
|-------|-------------|
| `User` | Base user account (STUDENT / FACULTY / ADMIN / SUPER_ADMIN) |
| `Student` | Student profile linked to a User |
| `Faculty` | Faculty profile linked to a User |
| `Department` | Academic department |
| `Program` | Degree program within a department |
| `Course` | Individual course (code, credits, etc.) |
| `Semester` | Academic semester (UPCOMING / ACTIVE / COMPLETED) |
| `Section` | Course section offered in a semester by a faculty member |
| `ClassSchedule` | Weekly schedule for a section (day, time, room) |
| `Enrollment` | Student <-> Section enrollment record |
| `Attendance` | Per-student per-day attendance records |
| `Assignment` | Assignment created by faculty for a section |
| `AssignmentSubmission` | Student file submission for an assignment |
| `Exam` | Exam (MIDTERM / FINAL / QUIZ / PRACTICAL) |
| `Result` | Student grade and grade point for an enrollment |
| `Invoice` | Fee invoice generated for a student |
| `Payment` | Payment record tied to an invoice |
| `Notification` | In-app notifications for users |
| `AuditLog` | Full audit trail of admin/super-admin actions |
| `Role` | RBAC role with permissions (JSON) |
| `SystemSetting` | Key-value system configuration |

### Key Enums

```
UserRole:       STUDENT | FACULTY | ADMIN | SUPER_ADMIN
UserStatus:     ACTIVE | INACTIVE | SUSPENDED | BLOCKED
ExamType:       MIDTERM | FINAL | QUIZ | PRACTICAL
InvoiceStatus:  PENDING | PAID | CANCELLED
PaymentStatus:  SUCCESS | FAILED | PENDING
SemesterStatus: UPCOMING | ACTIVE | COMPLETED
```

---

## Features

### 🔐 Authentication
- OTP-based email verification on registration
- JWT access + refresh token pair
- Cookie-based token storage
- Forgot / Reset password via OTP
- bcrypt password hashing (configurable salt rounds)

### 🎓 Student Portal
- Create and update student profile (auto-generated student ID e.g. STU20267027)
- Enroll in / drop course sections
- View class schedules and attendance records
- View academic results and full transcript with CGPA
- View and submit assignments
- Stripe payment for invoices and payment verification

### 👨‍🏫 Faculty Portal
- Create and manage faculty profile (auto-generated employee ID e.g. FAC20262596)
- View assigned sections and enrolled students
- Record and correct attendance
- Create and update assignments, grade submissions
- Schedule exams and post academic results

### 🛡️ Admin Panel
- Dashboard statistics
- Full CRUD for students, faculty, departments, programs, courses, semesters, sections
- Manage enrollments (force enroll)
- View all payments and generate reports

### 👑 Super Admin
- System health monitoring
- Full user management (status changes: ACTIVE / BLOCKED / SUSPENDED)
- Create admin accounts
- Audit log viewer
- System settings management

### 💳 Payments (Stripe)
- Create Stripe Checkout Sessions from invoices
- Webhook handler (/webhook) for automatic payment fulfillment
- Payment success redirect (/payment/success?session_id=...)
- Payment cancellation redirect (/payment/cancel)

### 📧 Notifications
- In-app notification system
- Email notifications via Nodemailer (EJS templates)
- Unread filter support

---

## Project Structure

```
AI_agentic_University/
├── src/
│   ├── app.ts                  # Express app setup, middleware, routes
│   ├── server.ts               # Server entry point (port binding)
│   ├── config/                 # Stripe, Redis, env configs
│   ├── errors/                 # AppError class
│   ├── lib/                    # Shared utilities / libraries
│   ├── middleware/             # Auth guard, error handler, role guard
│   ├── module/
│   │   ├── auth/               # Registration, login, token refresh, OTP
│   │   ├── student/            # Student routes, service, controller
│   │   ├── faculty/            # Faculty routes, service, controller
│   │   ├── admin/              # Admin routes, service, controller
│   │   └── super-admin/        # Super admin routes, service, controller
│   ├── prisma/
│   │   ├── contract.prisma     # Prisma 8 schema (all models + enums)
│   │   ├── db.ts               # Prisma client instance
│   │   ├── contract.json       # Compiled contract
│   │   └── contract.d.ts       # Generated types
│   ├── Templated/              # EJS email templates
│   └── utils/                  # apiResponse helper, etc.
├── migrations/                 # Prisma migration files
├── dist/                       # Compiled output (tsup)
├── prisma.config.ts            # Prisma 8 config
├── tsconfig.json               # TypeScript config
├── tsup.config.ts              # Build config
├── vercel.json                 # Vercel deployment config
├── .env.example                # Environment variable template
├── api_reference.md            # Full API endpoint reference
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
# Server
PORT=5000
APP_URL=http://localhost:5000

# Database (Prisma Platform / PostgreSQL >= 15)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Redis (OTP caching and token storage)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_USER=default
REDIS_PASSWORD=your-redis-password

# Email (Gmail SMTP via Nodemailer)
EMAIL_SENDER=your-email@gmail.com
APP_PASSWORD=your-gmail-app-password

# Security
BCRYPT_SALT_ROUNDS=15
JWT_ACCESS_SECRET=your-very-long-access-secret
JWT_REFRESH_SECRET=your-very-long-refresh-secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SEMESTER_PRICE_ID=price_...
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- Redis instance
- Stripe account (for payments)
- Gmail account with App Password (for email)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/AI_agentic_University.git
cd AI_agentic_University

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your actual credentials

# 4. Apply database migrations
npx prisma migrate dev

# 5. Start development server
npm run dev
```

### Build and Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

> The server starts on `http://localhost:5000` by default.

---

## API Reference

Full API documentation is available in [`api_reference.md`](./api_reference.md).

**Base URL:** `http://localhost:5000`

**Auth Header (protected routes):**
```
Authorization: Bearer <your_access_token>
```

### Auth Endpoints (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Step 1 — Send OTP to email |
| POST | /api/v1/auth/verifyUser | Step 2 — Verify OTP and create account |
| POST | /api/v1/login | Login (returns tokens) |
| POST | /api/v1/refresh-token | Refresh access token |
| POST | /api/v1/logout | Logout (clears cookie) |
| POST | /api/v1/forgot-password | Send reset OTP |
| POST | /api/v1/reset-password | Reset password with OTP |
| GET | /api/v1/me/:userId | Get current user info |

### Student Endpoints (Role: STUDENT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PATCH | /api/v1/student/me | Profile management |
| GET/POST/DELETE | /api/v1/student/me/enrollments | Enrollment management |
| GET | /api/v1/student/me/courses | View enrolled courses |
| GET | /api/v1/student/me/schedule | Class and exam schedule |
| GET | /api/v1/student/me/attendance | Attendance records |
| GET | /api/v1/student/me/results | Academic results |
| GET | /api/v1/student/me/transcript | Full transcript + CGPA |
| GET/POST | /api/v1/student/me/assignments | View and submit assignments |
| GET | /api/v1/student/me/invoices | Fee invoices |
| POST | /api/v1/student/me/payments/checkout | Create Stripe checkout |
| POST | /api/v1/student/me/payments/verify | Verify payment |
| GET | /api/v1/student/me/notifications | Notifications |

### Faculty Endpoints (Role: FACULTY)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PATCH | /api/v1/faculty/me | Profile management |
| GET | /api/v1/faculty/me/sections | Assigned sections |
| GET | /api/v1/faculty/me/students | Students I teach |
| POST | /api/v1/faculty/sections/:sectionId/attendance | Record attendance |
| PATCH | /api/v1/faculty/attendance/:attendanceId | Correct attendance |
| POST | /api/v1/faculty/assignments | Create assignment |
| PATCH | /api/v1/faculty/assignments/:assignmentId | Update assignment |
| GET | /api/v1/faculty/assignments/:assignmentId/submissions | View submissions |
| POST | /api/v1/faculty/results | Post result |
| PATCH | /api/v1/faculty/results/:resultId | Correct result |
| POST | /api/v1/faculty/exams | Create exam |

### Admin Endpoints (Role: ADMIN)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/admin/dashboard | Dashboard stats |
| GET/POST | /api/v1/admin/students | List / create students |
| PATCH/DELETE | /api/v1/admin/students/:id | Update / delete student |
| GET/POST | /api/v1/admin/faculty | List / create faculty |
| POST | /api/v1/admin/departments | Create department |
| PATCH | /api/v1/admin/departments/:id | Update department |
| POST | /api/v1/admin/programs | Create program |
| POST | /api/v1/admin/courses | Create course |
| POST | /api/v1/admin/semesters | Create semester |
| POST | /api/v1/admin/sections | Create section |
| GET/POST | /api/v1/admin/enrollments | List / force enroll |
| GET | /api/v1/admin/payments | All payments |
| GET | /api/v1/admin/reports | Generate reports |

### Super Admin Endpoints (Role: SUPER_ADMIN)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/super-admin/dashboard | System dashboard |
| GET | /api/v1/super-admin/users | All users |
| PATCH | /api/v1/super-admin/users/:id/status | Change user status |
| POST | /api/v1/super-admin/admins | Create admin |
| GET | /api/v1/super-admin/audit-logs | View audit trail |
| GET | /api/v1/super-admin/system-health | System health check |
| GET | /api/v1/super-admin/settings | Get settings |
| PATCH | /api/v1/super-admin/settings | Update settings |

---

## Authentication Flow

```
1. POST /api/v1/auth/register     ->  OTP sent to email (cached in Redis, expires in 5 min)
2. POST /api/v1/auth/verifyUser   ->  Account created, returns accessToken + refreshToken
3. POST /api/v1/login             ->  Returns new token pair
4. Include header: Authorization: Bearer <accessToken> on protected routes
5. POST /api/v1/refresh-token     ->  Obtain new accessToken using refreshToken
6. POST /api/v1/logout            ->  Clears auth cookie
```

---

## Roles and Permissions

| Role | Access Level |
|------|-------------|
| STUDENT | Own profile, enrollments, attendance, results, assignments, payments |
| FACULTY | Own profile, assigned sections, attendance recording, grading |
| ADMIN | All students / faculty / academic structure management |
| SUPER_ADMIN | Everything + user status control, audit logs, system settings |

> **Role Upgrade:** A user starts as STUDENT and is automatically upgraded to FACULTY  
> when they create a faculty profile via `POST /api/v1/faculty/me`.  
> New access token and refresh token are returned with the updated role.

---

## Payment Flow (Stripe)

```
1. Admin creates an Invoice for a student
2. Student calls POST /api/v1/student/me/payments/checkout  ->  Stripe Checkout URL returned
3. Student completes payment on Stripe hosted checkout page
4. Stripe sends event to POST /webhook                      ->  Invoice marked as PAID automatically
5. (Alternative) POST /api/v1/student/me/payments/verify with { sessionId }
6. GET /payment/success?session_id=...                      ->  Auto-verify (useful for localhost)
7. GET /payment/cancel?invoice_id=...                       ->  Cancellation handled gracefully
```

---

## Deployment (Vercel)

The project is pre-configured for Vercel deployment via `vercel.json`:

```json
{
  "version": 2,
  "builds": [{ "src": "dist/server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/server.js" }]
}
```

### Deploy Steps

```bash
# 1. Build the project
npm run build

# 2. Deploy to Vercel
vercel --prod
```

> Set all environment variables in the Vercel Dashboard under  
> **Project Settings > Environment Variables** before deploying.

---

## License

This project is licensed under the **ISC License**.

---

## Author

Built as part of **Level 2 — Assignment 7 (Backend)**  
AI Agentic University Management System
