# 📮 Full Postman API Reference

> **Base URL:** `http://localhost:5000`
>
> **Auth Header (for all protected routes):**
> ```
> Authorization: Bearer <your_access_token>
> ```

---

## 🔐 Auth APIs (No Token Required)

### 1. Register User (Step 1 — Send OTP)
```
POST /api/v1/auth/register
```
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MyPass@123",
  "phone": "01700000000"
}
```

---

### 2. Verify OTP & Create Account (Step 2)
```
POST /api/v1/auth/verifyUser
```
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```
✅ Returns: `accessToken`, `refreshToken`

---

### 3. Login
```
POST /api/v1/login
```
```json
{
  "email": "john@example.com",
  "password": "MyPass@123"
}
```
✅ Returns: `accessToken`, `refreshToken`

---

### 4. Refresh Token
```
POST /api/v1/refresh-token
```
```json
{
  "refreshToken": "<your_refresh_token>"
}
```

---

### 5. Logout
```
POST /api/v1/logout
```
> No body needed. Clears cookie.

---

### 6. Forgot Password
```
POST /api/v1/forgot-password
```
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
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewPass@456"
}
```

---

### 8. Get My Info
```
GET /api/v1/me/:userId
```
> Replace `:userId` with your actual user ID. No body needed.

---

## 🎓 Student APIs
> **Role Required:** `STUDENT` | **Header:** `Authorization: Bearer <token>`

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me` | Get my student profile |
| `POST` | `/api/v1/student/me` | Create my student profile (one-time after registration) |
| `PATCH` | `/api/v1/student/me` | Update my profile |

**POST `/api/v1/student/me` body:**
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
> **Note:** `studentId` is auto-generated (e.g. `STU20267027`) if omitted. The `userId` is automatically taken from the `Bearer` token.

**PATCH `/api/v1/student/me` body:**
```json
{
  "phone": "01800000000",
  "photoUrl": "https://example.com/photo.jpg",
  "dateOfBirth": "2002-05-15",
  "gender": "Male",
  "address": "123 Campus Road, Dhaka"
}
```

---

### Courses & Enrollment

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me/courses` | Get enrolled courses |
| `GET` | `/api/v1/student/me/courses?status=ENROLLED` | Filter by status |
| `POST` | `/api/v1/student/me/enrollments` | Enroll in a course section |
| `DELETE` | `/api/v1/student/me/enrollments/:enrollmentId` | Drop an enrollment |

**POST `/api/v1/student/me/enrollments` body:**
```json
{
  "sectionId": "<section_uuid>"
}
```

---

### Schedule & Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me/schedule` | Get class & exam schedule |
| `GET` | `/api/v1/student/me/attendance` | Get attendance records |
| `GET` | `/api/v1/student/me/attendance?status=ABSENT` | Filter by status |
| `GET` | `/api/v1/student/me/attendance?startDate=2026-01-01&endDate=2026-06-30` | Filter by date |

---

### Results & Transcript

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me/results` | Get academic results |
| `GET` | `/api/v1/student/me/transcript` | Get full transcript with CGPA |

---

### Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me/assignments` | Get all assignments |
| `GET` | `/api/v1/student/me/assignments?status=PENDING` | Filter pending only |
| `POST` | `/api/v1/student/me/assignments/:assignmentId/submit` | Submit an assignment |

**POST submit body:**
```json
{
  "fileUrl": "https://drive.google.com/file/d/your-file-link"
}
```

---

### 💳 Billing & Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me/invoices` | Get all invoices |
| `GET` | `/api/v1/student/me/payments` | Get payment history |
| `POST` | `/api/v1/student/me/payments/checkout` | Create Stripe checkout session |
| `POST` | `/api/v1/student/me/invoices/:invoiceId/pay` | Create checkout directly from invoice ID |
| `POST` | `/api/v1/student/me/payments/verify` | Verify & fulfill a Stripe payment |

**POST `/api/v1/student/me/payments/checkout` body:**
```json
{
  "invoiceId": "<invoice_uuid>"
}
```

**POST `/api/v1/student/me/invoices/:invoiceId/pay` body:**
```json
{}
```
> (invoiceId is taken from the URL — no body needed)

**POST `/api/v1/student/me/payments/verify` body:**
```json
{
  "sessionId": "cs_test_a143UZJwtgFz..."
}
```
✅ Returns: `payment`, `invoiceStatus: "PAID"`, notification sent to student

---

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/student/me/notifications` | Get all notifications |
| `GET` | `/api/v1/student/me/notifications?unreadOnly=true` | Unread only |

---

## 👨‍🏫 Faculty APIs
> **Role Required:** `FACULTY` (Registration via `POST /me` allows both `STUDENT` and `FACULTY`)

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/faculty/me` | Get my faculty profile |
| `POST` | `/api/v1/faculty/me` | Create my faculty profile (automatically upgrades role to `FACULTY`) |
| `PATCH` | `/api/v1/faculty/me` | Update my profile |

**POST `/api/v1/faculty/me` body:**
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
> **Note:** Upgrades your user role from `STUDENT` to `FACULTY` and returns new `accessToken` and `refreshToken` with the updated role. `employeeId` is auto-generated (e.g. `FAC20262596`) if omitted.

**PATCH body:**
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

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/faculty/me/sections` | Get my assigned sections |
| `GET` | `/api/v1/faculty/me/students` | Get all students I teach |
| `GET` | `/api/v1/faculty/sections/:sectionId` | Get section detail |

---

### Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/faculty/sections/:sectionId/attendance` | Record attendance |
| `PATCH` | `/api/v1/faculty/attendance/:attendanceId` | Correct attendance |

**POST record attendance body:**
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

**PATCH correct attendance body:**
```json
{
  "status": "PRESENT"
}
```

---

### Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/faculty/assignments` | Create assignment |
| `PATCH` | `/api/v1/faculty/assignments/:assignmentId` | Update assignment |
| `GET` | `/api/v1/faculty/assignments/:assignmentId/submissions` | View submissions |

**POST create assignment body:**
```json
{
  "sectionId": "<section_uuid>",
  "title": "Lab Report 1",
  "description": "Write a report on data structures",
  "deadline": "2026-10-15T23:59:00.000Z",
  "totalMarks": 100
}
```

**PATCH update assignment body:**
```json
{
  "title": "Updated Lab Report",
  "deadline": "2026-10-20T23:59:00.000Z",
  "totalMarks": 80
}
```

---

### Academic Results

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/faculty/results` | Post result for a student |
| `PATCH` | `/api/v1/faculty/results/:resultId` | Correct a result |

**POST result body:**
```json
{
  "enrollmentId": "<enrollment_uuid>",
  "examId": "<exam_uuid>",
  "marks": 78
}
```

---

### Exams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/faculty/exams` | Create exam |

**POST create exam body:**
```json
{
  "sectionId": "<section_uuid>",
  "title": "Midterm Exam 2026",
  "type": "MIDTERM",
  "examDate": "2026-10-20T10:00:00.000Z",
  "totalMarks": 50
}
```
> `type` options: `MIDTERM`, `FINAL`, `QUIZ`, `PRACTICAL`

---

## 🛡️ Admin APIs
> **Role Required:** `ADMIN` or `SUPER_ADMIN`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/dashboard` | Dashboard stats |
| `GET` | `/api/v1/admin/students` | List all students |
| `POST` | `/api/v1/admin/students` | Create student |
| `PATCH` | `/api/v1/admin/students/:id` | Update student |
| `DELETE` | `/api/v1/admin/students/:id` | Delete student |
| `GET` | `/api/v1/admin/faculty` | List all faculty |
| `POST` | `/api/v1/admin/faculty` | Create faculty |
| `POST` | `/api/v1/admin/departments` | Create department |
| `PATCH` | `/api/v1/admin/departments/:id` | Update department |
| `POST` | `/api/v1/admin/programs` | Create program |
| `POST` | `/api/v1/admin/courses` | Create course |
| `POST` | `/api/v1/admin/semesters` | Create semester |
| `POST` | `/api/v1/admin/sections` | Create section |
| `GET` | `/api/v1/admin/enrollments` | List all enrollments |
| `POST` | `/api/v1/admin/enrollments` | Force enroll a student |
| `GET` | `/api/v1/admin/payments` | List all payments |
| `GET` | `/api/v1/admin/reports` | Generate reports |

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

**POST create department body:**
```json
{
  "name": "Computer Science & Engineering",
  "code": "CSE",
  "facultyName": "Faculty of Science & Technology"
}
```

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

**POST force enroll body:**
```json
{
  "studentId": "<student_uuid>",
  "sectionId": "<section_uuid>"
}
```

---

## 👑 Super Admin APIs
> **Role Required:** `SUPER_ADMIN`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/super-admin/dashboard` | System dashboard |
| `GET` | `/api/v1/super-admin/users` | All users |
| `PATCH` | `/api/v1/super-admin/users/:id/status` | Change user status |
| `POST` | `/api/v1/super-admin/admins` | Create admin |
| `GET` | `/api/v1/super-admin/audit-logs` | View audit trail |
| `GET` | `/api/v1/super-admin/system-health` | System health check |
| `GET` | `/api/v1/super-admin/settings` | Get settings |
| `PATCH` | `/api/v1/super-admin/settings` | Update settings |

**PATCH update user status body:**
```json
{
  "status": "BLOCKED"
}
```
> `status` options: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `BLOCKED`

**POST create admin body:**
```json
{
  "name": "Admin User",
  "email": "admin@university.edu",
  "password": "AdminPass@123"
}
```

---

## 🔔 Stripe Webhook (Automatic — Do Not Call Manually)
```
POST /webhook
```
> Called automatically by Stripe when payment completes. Handles `checkout.session.completed` event and marks invoice as `PAID`.
