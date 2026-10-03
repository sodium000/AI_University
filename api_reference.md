# 📮 AI Agentic University — Full API Reference

> **Base URL (Local):** `http://localhost:5000`
> **Base URL (Production):** `https://ai-agentic-university.vercel.app`
>
> **Auth Header (all protected routes):**
> ```
> Authorization: Bearer <your_access_token>
> ```
> Tokens are also accepted via the `accessToken` **cookie**.

---

## 📋 Table of Contents

- [Standard Response Format](#standard-response-format)
- [Auth APIs](#-auth-apis-no-token-required)
- [Student APIs](#-student-apis)
- [Faculty APIs](#-faculty-apis)
- [Admin APIs](#️-admin-apis)
- [Super Admin APIs](#-super-admin-apis)
- [Payment Webhooks & Redirects](#-payment-webhooks--redirects)
- [Error Codes](#-error-codes)

---

## Standard Response Format

All responses follow this shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable success message",
  "data": { }
}
```

On error:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errorCode": "VALIDATION_ERROR",
  "details": { }
}
```

---

## 🔐 Auth APIs (No Token Required)

### 1. Register User — Step 1: Send OTP

```
POST /api/v1/auth/register
```

Sends a 6-digit OTP to the provided email address. OTP is cached in Redis and expires in **5 minutes**. The user account is NOT created yet at this step.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MyPass@123",
  "phone": "01700000000"
}
```

**Field Rules:**
- `name` — required, string
- `email` — required, valid email format
- `password` — required, minimum 6 characters
- `phone` — optional

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent to john@example.com. Please verify within 5 minutes.",
  "data": null
}
```

---

### 2. Verify OTP & Create Account — Step 2

```
POST /api/v1/auth/verifyUser
```

Verifies the OTP from Redis. On success, the user account is created and a JWT token pair is returned.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Account created successfully.",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT"
    }
  }
}
```

> Tokens are also set as **httpOnly cookies**: `accessToken` and `refreshToken`.

---

### 3. Login

```
POST /api/v1/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "MyPass@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT",
      "status": "ACTIVE"
    }
  }
}
```

---

### 4. Refresh Access Token

```
POST /api/v1/refresh-token
```

Exchange a valid refresh token for a new access token. Useful when the access token has expired.

**Request Body:**
```json
{
  "refreshToken": "<your_refresh_token>"
}
```

> Can also pass the `refreshToken` cookie instead of body.

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGci..."
  }
}
```

---

### 5. Logout

```
POST /api/v1/logout
```

Clears the `accessToken` and `refreshToken` cookies. No request body needed.

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully."
}
```

---

### 6. Forgot Password — Send Reset OTP

```
POST /api/v1/forgot-password
```

Sends a password-reset OTP to the given email. OTP expires in **5 minutes**.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

---

### 7. Reset Password

```
POST /api/v1/reset-password
```

Resets the user's password after verifying the OTP from the forgot-password flow.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewPass@456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successful."
}
```

---

### 8. Get My Info

```
GET /api/v1/me/:id
```

> Replace `:id` with the actual user UUID.

Returns the authenticated user's account info (no token required for this route — ID is in path).

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User info fetched.",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "emailVerified": true,
    "lastLoginAt": "2026-09-30T10:00:00.000Z"
  }
}
```

---

## 🎓 Student APIs

> **Role Required:** `STUDENT`
> **Header:** `Authorization: Bearer <token>`

All `/api/v1/student/*` routes require a valid STUDENT access token. The student profile (studentId) is auto-resolved from the token.

---

### Profile

#### GET /api/v1/student/me — Get My Profile

Returns the logged-in student's full profile including user, department, and program info.

**Success Response (200):**
```json
{
  "data": {
    "isProfileComplete": true,
    "id": "uuid",
    "studentId": "STU20267027",
    "userId": "uuid",
    "admissionYear": 2026,
    "currentYear": 1,
    "currentSemester": 1,
    "gender": "Male",
    "address": "45 University Ave, Dhaka",
    "user": { "id": "uuid", "name": "John", "email": "...", "role": "STUDENT" },
    "department": { "id": "uuid", "name": "CSE", "code": "CSE" },
    "program": { "id": "uuid", "name": "B.Sc. in CS", "code": "BSC-CSE" }
  }
}
```

> If the student record hasn't been set up yet, `isProfileComplete` will be `false`.

---

#### POST /api/v1/student/me — Create Student Profile (One-time)

Creates the student's academic profile. Can only be done once per account.

**Request Body:**
```json
{
  "departmentId": "<department_uuid>",
  "programId": "<program_uuid>",
  "admissionYear": 2026,
  "currentYear": 1,
  "currentSemester": 1,
  "gender": "Male",
  "dateOfBirth": "2003-04-10",
  "address": "45 University Ave, Dhaka",
  "phone": "01711000000",
  "photoUrl": "https://example.com/photo.jpg"
}
```

> `studentId` is **auto-generated** (e.g. `STU20267027`) if not provided.
> The `userId` is automatically taken from the Bearer token — do not pass it in the body.

---

#### PATCH /api/v1/student/me — Update Profile

Updates only the allowed personal fields. Academic fields (department, program, year) cannot be changed here.

**Request Body (all fields optional):**
```json
{
  "phone": "01800000000",
  "photoUrl": "https://example.com/new-photo.jpg",
  "dateOfBirth": "2002-05-15",
  "gender": "Male",
  "address": "123 Campus Road, Dhaka"
}
```

---

### Courses & Enrollment

#### GET /api/v1/student/me/courses — Get Enrolled Courses

Returns all courses the student is enrolled in.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by enrollment status: `ENROLLED` | `DROPPED` | `COMPLETED` | `WITHDRAWN` |

**Examples:**
```
GET /api/v1/student/me/courses
GET /api/v1/student/me/courses?status=ENROLLED
GET /api/v1/student/me/courses?status=COMPLETED
```

---

#### POST /api/v1/student/me/enrollments — Enroll in a Course Section

Enrolls the student in a specific course section. Duplicate enrollments are rejected.

**Request Body:**
```json
{
  "sectionId": "<section_uuid>"
}
```

> Also available as: `POST /api/v1/student/me/courses` (same handler, alias route)

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Successfully enrolled in course section",
  "data": {
    "id": "uuid",
    "studentId": "uuid",
    "sectionId": "uuid",
    "status": "ENROLLED",
    "enrolledAt": "2026-09-23T08:00:00.000Z"
  }
}
```

---

#### DELETE /api/v1/student/me/enrollments/:id — Drop an Enrollment

Drops (removes) the student from a course section.

> Replace `:id` with the **enrollment UUID** (not sectionId).

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Enrollment successfully dropped",
  "data": { "id": "uuid", "status": "DROPPED" }
}
```

---

### Schedule & Attendance

#### GET /api/v1/student/me/schedule — Get Class & Exam Schedule

Returns the student's weekly class schedule and upcoming exams for all enrolled sections.

**Success Response (200):**
```json
{
  "data": {
    "classSchedules": [
      {
        "sectionName": "CSE301-A",
        "course": { "code": "CSE301", "title": "Data Structures" },
        "dayOfWeek": "MONDAY",
        "startTime": "09:00",
        "endTime": "10:30",
        "room": "Room 301",
        "building": "CSE Building"
      }
    ],
    "exams": [
      {
        "title": "Midterm Exam 2026",
        "type": "MIDTERM",
        "examDate": "2026-10-20T10:00:00.000Z",
        "totalMarks": 50
      }
    ]
  }
}
```

---

#### GET /api/v1/student/me/attendance — Get Attendance Records

Returns the student's attendance history across all enrolled sections.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter: `PRESENT` | `ABSENT` | `LATE` |
| `startDate` | string (ISO date) | Filter from date (e.g. `2026-01-01`) |
| `endDate` | string (ISO date) | Filter to date (e.g. `2026-06-30`) |

**Examples:**
```
GET /api/v1/student/me/attendance
GET /api/v1/student/me/attendance?status=ABSENT
GET /api/v1/student/me/attendance?startDate=2026-01-01&endDate=2026-06-30
GET /api/v1/student/me/attendance?status=PRESENT&startDate=2026-09-01
```

---

### Results & Transcript

#### GET /api/v1/student/me/results — Get Academic Results

Returns the student's exam results for all enrolled courses.

**Success Response (200):**
```json
{
  "data": [
    {
      "course": { "code": "CSE301", "title": "Data Structures" },
      "exam": { "title": "Midterm Exam 2026", "type": "MIDTERM" },
      "marks": 78,
      "grade": "A",
      "gradePoint": 4.0
    }
  ]
}
```

---

#### GET /api/v1/student/me/transcript — Get Full Transcript with CGPA

Returns the complete academic transcript including all semesters, courses, grades, and the calculated CGPA.

**Success Response (200):**
```json
{
  "data": {
    "studentId": "STU20267027",
    "name": "John Doe",
    "program": "B.Sc. in Computer Science",
    "cgpa": 3.75,
    "totalCreditsEarned": 45,
    "semesters": [
      {
        "semester": "Fall 2026",
        "gpa": 3.8,
        "courses": [
          { "code": "CSE301", "title": "Data Structures", "credit": 3, "grade": "A", "gradePoint": 4.0 }
        ]
      }
    ]
  }
}
```

---

### Assignments

#### GET /api/v1/student/me/assignments — Get All Assignments

Returns all assignments from sections the student is enrolled in.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `PENDING` (not submitted) | `SUBMITTED` |

**Examples:**
```
GET /api/v1/student/me/assignments
GET /api/v1/student/me/assignments?status=PENDING
GET /api/v1/student/me/assignments?status=SUBMITTED
```

---

#### POST /api/v1/student/me/assignments/:id/submit — Submit an Assignment

Submits an assignment by file URL.

> Replace `:id` with the **assignment UUID**.

**Request Body:**
```json
{
  "fileUrl": "https://drive.google.com/file/d/your-file-link"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Assignment submitted successfully",
  "data": {
    "id": "uuid",
    "assignmentId": "uuid",
    "studentId": "uuid",
    "fileUrl": "https://drive.google.com/file/d/...",
    "submittedAt": "2026-09-23T14:00:00.000Z"
  }
}
```

---

### 💳 Billing & Payments

#### GET /api/v1/student/me/invoices — Get All Invoices

Returns all fee invoices created for the student.

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceNo": "INV-2026-001",
      "amount": 15000,
      "dueDate": "2026-10-31",
      "status": "PENDING"
    }
  ]
}
```

---

#### GET /api/v1/student/me/payments — Get Payment History

Returns all completed, failed, or pending payment records for the student.

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceId": "uuid",
      "amount": 15000,
      "method": "ONLINE",
      "transactionId": "cs_test_abc123",
      "status": "SUCCESS",
      "createdAt": "2026-09-25T09:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/v1/student/me/payments/checkout — Create Stripe Checkout Session

Creates a Stripe hosted checkout session for paying an invoice.

**Request Body:**
```json
{
  "invoiceId": "<invoice_uuid>"
}
```

**Success Response (200):**
```json
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
    "sessionId": "cs_test_..."
  }
}
```

> Redirect the student to `checkoutUrl` to complete payment on Stripe's secure page.

---

#### POST /api/v1/student/me/invoices/:id/pay — Pay Directly from Invoice ID

Shortcut to create a Stripe checkout session directly from the invoice URL. No body needed.

> Replace `:id` with the **invoice UUID**.

```json
{}
```

Returns the same response as the checkout endpoint above.

---

#### POST /api/v1/student/me/payments/verify — Verify & Fulfill a Stripe Payment

Manually verify a Stripe payment after checkout. Used when the webhook doesn't reach localhost during development.

**Request Body:**
```json
{
  "sessionId": "cs_test_a143UZJwtgFz..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment verified and recorded successfully.",
  "data": {
    "payment": {
      "id": "uuid",
      "amount": 15000,
      "method": "ONLINE",
      "status": "SUCCESS"
    },
    "invoiceStatus": "PAID"
  }
}
```

---

### Notifications

#### GET /api/v1/student/me/notifications — Get Notifications

Returns all notifications for the logged-in user.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `unreadOnly` | boolean string | Pass `true` to return only unread notifications |

**Examples:**
```
GET /api/v1/student/me/notifications
GET /api/v1/student/me/notifications?unreadOnly=true
```

---

## 👨‍🏫 Faculty APIs

> **Role Required:** `FACULTY` (most routes) or `STUDENT` / `FACULTY` (profile creation)
> **Header:** `Authorization: Bearer <token>`

---

### Profile

#### GET /api/v1/faculty/me — Get My Faculty Profile

Returns the logged-in faculty's full profile including department info.

> Accessible by both `FACULTY` and `STUDENT` role tokens.

---

#### POST /api/v1/faculty/me — Create Faculty Profile (One-time)

Creates a faculty academic profile. **Automatically upgrades** the user's role from `STUDENT` → `FACULTY` and returns new tokens.

> Accessible by both `STUDENT` and `FACULTY` role tokens.

**Request Body:**
```json
{
  "departmentId": "<department_uuid>",
  "designation": "Assistant Professor",
  "specialization": "Artificial Intelligence & Data Science",
  "joiningDate": "2026-01-15",
  "phone": "01811000000",
  "photoUrl": "https://example.com/faculty.jpg"
}
```

> `employeeId` is **auto-generated** (e.g. `FAC20262596`) if not provided.

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Faculty profile created successfully and user role upgraded to FACULTY",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "faculty": { "id": "uuid", "employeeId": "FAC20262596", "designation": "..." }
  }
}
```

> New `accessToken` and `refreshToken` cookies are also set on the response.

---

#### PATCH /api/v1/faculty/me — Update Profile

Updates allowed personal/professional fields.

> Requires `FACULTY` role.

**Request Body (all fields optional):**
```json
{
  "phone": "01900000000",
  "photoUrl": "https://example.com/photo.jpg",
  "designation": "Associate Professor",
  "specialization": "Machine Learning"
}
```

---

### Sections & Students

#### GET /api/v1/faculty/me/sections — Get My Assigned Sections

Returns all course sections assigned to the logged-in faculty member.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `semesterId` | UUID | Filter sections by semester |
| `courseId` | UUID | Filter sections by course |

**Examples:**
```
GET /api/v1/faculty/me/sections
GET /api/v1/faculty/me/sections?semesterId=<uuid>
GET /api/v1/faculty/me/sections?courseId=<uuid>
```

---

#### GET /api/v1/faculty/me/students — Get All Students I Teach

Returns all students enrolled across all sections taught by the faculty.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `sectionId` | UUID | Filter students from a specific section |
| `search` | string | Search by student name or ID |

**Examples:**
```
GET /api/v1/faculty/me/students
GET /api/v1/faculty/me/students?sectionId=<uuid>
GET /api/v1/faculty/me/students?search=John
```

---

#### GET /api/v1/faculty/sections/:id — Get Section Detail

Returns the full details of a specific section: roster, schedule, assignments, and exams.

> Replace `:id` with the **section UUID**. Faculty must be assigned to this section.

---

### Attendance

#### POST /api/v1/faculty/sections/:id/attendance — Record Attendance

Records attendance for all students in a section on a given date.

> Replace `:id` with the **section UUID**.

**Request Body:**
```json
{
  "date": "2026-09-23",
  "records": [
    { "studentId": "<student_uuid>", "status": "PRESENT" },
    { "studentId": "<student_uuid>", "status": "ABSENT" },
    { "studentId": "<student_uuid>", "status": "LATE" }
  ]
}
```

> `status` options: `PRESENT` | `ABSENT` | `LATE`

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Attendance recorded successfully",
  "data": {
    "recorded": 3,
    "date": "2026-09-23"
  }
}
```

---

#### PATCH /api/v1/faculty/attendance/:id — Correct an Attendance Record

Corrects a previously recorded attendance entry.

> Replace `:id` with the **attendance record UUID**.

**Request Body:**
```json
{
  "status": "PRESENT"
}
```

---

### Assignments

#### POST /api/v1/faculty/assignments — Create Assignment

Creates a new assignment for a course section.

**Request Body:**
```json
{
  "sectionId": "<section_uuid>",
  "title": "Lab Report 1",
  "description": "Write a detailed report on data structures",
  "deadline": "2026-10-15T23:59:00.000Z",
  "totalMarks": 100
}
```

> Faculty must be assigned to the specified section.

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Assignment created successfully",
  "data": {
    "id": "uuid",
    "title": "Lab Report 1",
    "deadline": "2026-10-15T23:59:00.000Z",
    "totalMarks": 100
  }
}
```

---

#### PATCH /api/v1/faculty/assignments/:id — Update Assignment

Updates an existing assignment's details.

> Replace `:id` with the **assignment UUID**.

**Request Body (all fields optional):**
```json
{
  "title": "Updated Lab Report",
  "description": "Updated description",
  "deadline": "2026-10-20T23:59:00.000Z",
  "totalMarks": 80
}
```

---

#### GET /api/v1/faculty/assignments/:id/submissions — View Assignment Submissions

Returns all student submissions for a specific assignment.

> Replace `:id` with the **assignment UUID**.

**Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `SUBMITTED` | `PENDING` — filter by submission status |

**Success Response (200):**
```json
{
  "data": [
    {
      "student": { "studentId": "STU20267027", "name": "John Doe" },
      "fileUrl": "https://drive.google.com/...",
      "submittedAt": "2026-10-14T20:00:00.000Z",
      "marks": null,
      "feedback": null
    }
  ]
}
```

---

### Academic Results

#### POST /api/v1/faculty/results — Post Result for a Student

Posts an exam result for a student enrolled in a section.

**Request Body:**
```json
{
  "enrollmentId": "<enrollment_uuid>",
  "examId": "<exam_uuid>",
  "marks": 78
}
```

> Grade and grade point are **auto-calculated** from marks.

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Result posted successfully",
  "data": {
    "id": "uuid",
    "marks": 78,
    "grade": "A",
    "gradePoint": 4.0
  }
}
```

---

#### PATCH /api/v1/faculty/results/:id — Correct a Result

Updates a previously posted result (e.g. after re-evaluation).

> Replace `:id` with the **result UUID**.

**Request Body:**
```json
{
  "marks": 85
}
```

---

### Exams

#### POST /api/v1/faculty/exams — Create Exam

Schedules an exam for a course section.

**Request Body:**
```json
{
  "sectionId": "<section_uuid>",
  "title": "Midterm Exam 2026",
  "type": "MIDTERM",
  "examDate": "2026-10-20T10:00:00.000Z",
  "totalMarks": 50
}
```

> `type` options: `MIDTERM` | `FINAL` | `QUIZ` | `PRACTICAL`

**Success Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Exam scheduled successfully",
  "data": {
    "id": "uuid",
    "title": "Midterm Exam 2026",
    "type": "MIDTERM",
    "examDate": "2026-10-20T10:00:00.000Z",
    "totalMarks": 50
  }
}
```

---

## 🛡️ Admin APIs

> **Role Required:** `ADMIN` or `SUPER_ADMIN`
> **Header:** `Authorization: Bearer <token>`

---

### Dashboard

#### GET /api/v1/admin/dashboard

Returns system-wide statistics: total students, faculty, departments, courses, active enrollments, total revenue, etc.

---

### Student Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/students` | List all students (supports query filters) |
| `POST` | `/api/v1/admin/students` | Create a student account + profile |
| `PATCH` | `/api/v1/admin/students/:id` | Update a student record |
| `DELETE` | `/api/v1/admin/students/:id` | Deactivate or hard-delete a student |

**GET Query Parameters (optional):**
| Param | Description |
|-------|-------------|
| `departmentId` | Filter by department |
| `programId` | Filter by program |
| `search` | Search by name, email, or studentId |

**POST create student body:**
```json
{
  "name": "Ali Rahman",
  "email": "ali@student.edu",
  "password": "Pass@1234",
  "phone": "01711000000",
  "departmentId": "<dept_uuid>",
  "programId": "<program_uuid>",
  "admissionYear": 2026,
  "currentYear": 1,
  "currentSemester": 1,
  "gender": "Male",
  "dateOfBirth": "2003-04-10",
  "address": "45 University Ave"
}
```

**DELETE Query Parameters (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `hard` | boolean string | Pass `?hard=true` to permanently delete. Default is soft deactivation. |

---

### Faculty Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/faculty` | List all faculty members |
| `POST` | `/api/v1/admin/faculty` | Create a faculty account + profile |

**POST create faculty body:**
```json
{
  "name": "Dr. Rahim",
  "email": "rahim@university.edu",
  "password": "FacPass@123",
  "phone": "01811000000",
  "departmentId": "<dept_uuid>",
  "designation": "Associate Professor",
  "specialization": "Artificial Intelligence",
  "joiningDate": "2026-01-15"
}
```

---

### Departments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/departments` | Create a new department |
| `PATCH` | `/api/v1/admin/departments/:id` | Update a department |

**POST create department body:**
```json
{
  "name": "Computer Science & Engineering",
  "code": "CSE",
  "facultyName": "Faculty of Science & Technology"
}
```

---

### Programs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/programs` | Create a new degree program |

**POST create program body:**
```json
{
  "name": "B.Sc. in Computer Science",
  "code": "BSC-CSE",
  "departmentId": "<dept_uuid>",
  "durationYears": 4,
  "totalCredits": 140
}
```

---

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/courses` | Create a new course |

**POST create course body:**
```json
{
  "code": "CSE301",
  "title": "Data Structures",
  "description": "Fundamental data structures and algorithms",
  "credit": 3.0,
  "departmentId": "<dept_uuid>",
  "programId": "<program_uuid>"
}
```

---

### Semesters

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/semesters` | Create a new semester |

**POST create semester body:**
```json
{
  "name": "Fall 2026",
  "year": 2026,
  "status": "UPCOMING",
  "startDate": "2026-09-01",
  "endDate": "2026-12-31"
}
```

> `status` options: `UPCOMING` | `ACTIVE` | `COMPLETED`

---

### Sections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/sections` | Create a course section |

**POST create section body:**
```json
{
  "courseId": "<course_uuid>",
  "semesterId": "<semester_uuid>",
  "facultyId": "<faculty_uuid>",
  "capacity": 40,
  "schedules": [
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "10:30",
      "room": "Room 301",
      "building": "CSE Building"
    }
  ]
}
```

> `dayOfWeek` options: `MONDAY` | `TUESDAY` | `WEDNESDAY` | `THURSDAY` | `FRIDAY` | `SATURDAY` | `SUNDAY`

---

### Enrollments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/enrollments` | List all enrollments system-wide |
| `POST` | `/api/v1/admin/enrollments` | Force enroll a student into a section |

**POST force enroll body:**
```json
{
  "studentId": "<student_uuid>",
  "sectionId": "<section_uuid>"
}
```

---

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/payments` | List all payments system-wide |

---

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/reports` | Generate system-wide academic/financial reports |

---

## 👑 Super Admin APIs

> **Role Required:** `SUPER_ADMIN` (strictly — ADMIN cannot access these)
> **Header:** `Authorization: Bearer <token>`

---

### Dashboard

#### GET /api/v1/super-admin/dashboard

Returns a high-level system overview: total users by role, revenue, active semesters, system uptime indicators.

---

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/super-admin/users` | List all users in the system |
| `PATCH` | `/api/v1/super-admin/users/:id/status` | Change a user's account status |

**PATCH update user status body:**
```json
{
  "status": "BLOCKED"
}
```

> `status` options: `ACTIVE` | `INACTIVE` | `SUSPENDED` | `BLOCKED`

---

### Admin Account Management

#### POST /api/v1/super-admin/admins — Create Admin Account

Creates a new ADMIN user account.

**Request Body:**
```json
{
  "name": "Admin User",
  "email": "admin@university.edu",
  "password": "AdminPass@123"
}
```

---

### Roles & Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/super-admin/roles` | List all defined roles |
| `POST` | `/api/v1/super-admin/roles` | Create a new role with permissions |
| `GET` | `/api/v1/super-admin/permissions` | List all available permissions |

**POST create role body:**
```json
{
  "name": "DEPARTMENT_MANAGER",
  "description": "Can manage departments and programs",
  "permissions": {
    "departments": ["read", "create", "update"],
    "programs": ["read", "create"]
  }
}
```

---

### Audit Trail

#### GET /api/v1/super-admin/audit-logs

Returns a full audit trail of all admin and super-admin actions in the system.

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "CREATE",
      "entity": "Student",
      "entityId": "uuid",
      "userId": "uuid",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-09-23T10:00:00.000Z"
    }
  ]
}
```

---

### System Health

#### GET /api/v1/super-admin/system-health

Returns live system health indicators: database connectivity, Redis status, memory usage, uptime.

**Success Response (200):**
```json
{
  "data": {
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "uptime": "2d 4h 30m",
    "memoryUsage": "128MB"
  }
}
```

---

### System Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/super-admin/settings` | Get all system settings |
| `PATCH` | `/api/v1/super-admin/settings` | Update system settings |

**PATCH update settings body:**
```json
{
  "key": "max_enrollment_per_section",
  "value": 50
}
```

---

## 🔔 Payment Webhooks & Redirects

### Stripe Webhook (Automatic — Do Not Call Manually)

```
POST /webhook
```

Called automatically by Stripe when a payment event occurs. Validates the Stripe signature using `STRIPE_WEBHOOK_SECRET`.

Handles:
- `checkout.session.completed` → Marks the related invoice as `PAID` and creates a payment record.

> To test locally, use the Stripe CLI: `stripe listen --forward-to localhost:5000/webhook`

---

### Payment Success Redirect

```
GET /payment/success?session_id=<stripe_session_id>
```

Stripe redirects here after a successful checkout. This route auto-verifies and records the payment. Useful as a fallback when the webhook cannot reach localhost.

**Query Parameters:**
| Param | Description |
|-------|-------------|
| `session_id` | The Stripe checkout session ID (format: `cs_test_...`) |

---

### Payment Cancel Redirect

```
GET /payment/cancel?invoice_id=<invoice_uuid>
```

Stripe redirects here if the user cancels the checkout. Returns a graceful message.

---

## ⚠️ Error Codes

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body failed Zod schema validation |
| 400 | `BAD_REQUEST` | Missing required fields or invalid values |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 401 | `AUTH_CONTEXT_MISSING` | Token present but user context is missing |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate resource (e.g. already enrolled) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
