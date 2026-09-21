export interface SystemPermission {
  code: string;
  name: string;
  category: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: SystemPermission[] = [
  // User Management
  {
    code: "users:read",
    name: "Read Users",
    category: "User Management",
    description: "View user lists and account profiles across all roles",
  },
  {
    code: "users:write",
    name: "Modify Users",
    category: "User Management",
    description: "Update user profiles and details",
  },
  {
    code: "users:status",
    name: "Manage User Status",
    category: "User Management",
    description: "Activate, suspend, or block user accounts",
  },
  {
    code: "users:delete",
    name: "Delete Users",
    category: "User Management",
    description: "Deactivate or remove user records",
  },

  // Admin Management
  {
    code: "admins:read",
    name: "Read Admins",
    category: "Admin Management",
    description: "View administrator accounts",
  },
  {
    code: "admins:create",
    name: "Create Admin",
    category: "Admin Management",
    description: "Provision new administrative accounts",
  },
  {
    code: "admins:manage",
    name: "Manage Admins",
    category: "Admin Management",
    description: "Update or revoke administrator privileges",
  },

  // Role & Permission Management
  {
    code: "roles:read",
    name: "Read Roles",
    category: "Access Control",
    description: "List all built-in and custom roles with permissions",
  },
  {
    code: "roles:create",
    name: "Create Role",
    category: "Access Control",
    description: "Create custom roles with custom permission sets",
  },
  {
    code: "roles:update",
    name: "Update Role",
    category: "Access Control",
    description: "Modify role permissions and metadata",
  },
  {
    code: "roles:delete",
    name: "Delete Role",
    category: "Access Control",
    description: "Delete non-system custom roles",
  },
  {
    code: "permissions:read",
    name: "Read Permissions",
    category: "Access Control",
    description: "List all system-recognized permissions",
  },

  // Student Management
  {
    code: "students:read",
    name: "Read Students",
    category: "Student Management",
    description: "View student academic profiles and records",
  },
  {
    code: "students:create",
    name: "Create Student",
    category: "Student Management",
    description: "Enroll and create new student profiles",
  },
  {
    code: "students:update",
    name: "Update Student",
    category: "Student Management",
    description: "Modify student bio, program, or academic info",
  },
  {
    code: "students:delete",
    name: "Delete Student",
    category: "Student Management",
    description: "Deactivate student records",
  },

  // Faculty Management
  {
    code: "faculty:read",
    name: "Read Faculty",
    category: "Faculty Management",
    description: "View faculty profiles and assignments",
  },
  {
    code: "faculty:create",
    name: "Create Faculty",
    category: "Faculty Management",
    description: "Onboard new faculty members",
  },
  {
    code: "faculty:update",
    name: "Update Faculty",
    category: "Faculty Management",
    description: "Update faculty designations and departments",
  },
  {
    code: "faculty:delete",
    name: "Delete Faculty",
    category: "Faculty Management",
    description: "Deactivate faculty records",
  },

  // Academic Structure
  {
    code: "academics:read",
    name: "Read Academics",
    category: "Academic Structure",
    description: "View departments, programs, courses, and semesters",
  },
  {
    code: "departments:manage",
    name: "Manage Departments",
    category: "Academic Structure",
    description: "Create and update academic departments",
  },
  {
    code: "programs:manage",
    name: "Manage Programs",
    category: "Academic Structure",
    description: "Create and update degree programs",
  },
  {
    code: "courses:manage",
    name: "Manage Courses",
    category: "Academic Structure",
    description: "Create and update course catalog",
  },
  {
    code: "semesters:manage",
    name: "Manage Semesters",
    category: "Academic Structure",
    description: "Create and manage semester terms and schedules",
  },
  {
    code: "sections:manage",
    name: "Manage Course Sections",
    category: "Academic Structure",
    description: "Create and schedule class sections",
  },

  // Enrollment Management
  {
    code: "enrollments:read",
    name: "Read Enrollments",
    category: "Enrollment Management",
    description: "View student course enrollments",
  },
  {
    code: "enrollments:manage",
    name: "Manage Enrollments",
    category: "Enrollment Management",
    description: "Enroll or drop students from sections",
  },
  {
    code: "enrollments:override",
    name: "Override Enrollments",
    category: "Enrollment Management",
    description: "Force enroll students overriding section capacity limits",
  },

  // Financial Management
  {
    code: "invoices:read",
    name: "Read Invoices",
    category: "Financial Management",
    description: "View student tuition fees and invoices",
  },
  {
    code: "invoices:manage",
    name: "Manage Invoices",
    category: "Financial Management",
    description: "Issue or update student fee invoices",
  },
  {
    code: "payments:read",
    name: "Read Payments",
    category: "Financial Management",
    description: "View student payment records and transactions",
  },
  {
    code: "payments:manage",
    name: "Manage Payments",
    category: "Financial Management",
    description: "Record or verify fee payments",
  },

  // Reports & System
  {
    code: "reports:read",
    name: "View Reports",
    category: "Reports & Analytics",
    description: "Generate and view institutional analytics and reports",
  },
  {
    code: "audit_logs:read",
    name: "View Audit Logs",
    category: "System & Governance",
    description: "Inspect the system-wide audit trail",
  },
  {
    code: "system_health:read",
    name: "Read System Health",
    category: "System & Governance",
    description: "Access live server and infrastructure health checks",
  },
  {
    code: "settings:read",
    name: "Read Settings",
    category: "System & Governance",
    description: "View global system configuration",
  },
  {
    code: "settings:manage",
    name: "Manage Settings",
    category: "System & Governance",
    description: "Update global system parameters and policies",
  },
];

export const BUILT_IN_ROLES: Record<
  string,
  { description: string; permissions: string[] }
> = {
  SUPER_ADMIN: {
    description: "Full institutional super-administrator with unrestricted access to all modules and configurations",
    permissions: ["*"],
  },
  ADMIN: {
    description: "Institutional administrator managing students, faculty, academics, finance, and operational reports",
    permissions: [
      "users:read",
      "users:write",
      "students:read",
      "students:create",
      "students:update",
      "students:delete",
      "faculty:read",
      "faculty:create",
      "faculty:update",
      "academics:read",
      "departments:manage",
      "programs:manage",
      "courses:manage",
      "semesters:manage",
      "sections:manage",
      "enrollments:read",
      "enrollments:manage",
      "enrollments:override",
      "invoices:read",
      "invoices:manage",
      "payments:read",
      "payments:manage",
      "reports:read",
      "audit_logs:read",
    ],
  },
  FACULTY: {
    description: "Academic faculty member managing course materials, assignments, exams, attendance, and grades",
    permissions: [
      "academics:read",
      "sections:manage",
      "students:read",
      "enrollments:read",
    ],
  },
  STUDENT: {
    description: "Enrolled student accessing enrolled courses, assignments, attendance, results, and fee payments",
    permissions: [
      "academics:read",
      "enrollments:read",
      "invoices:read",
      "payments:read",
    ],
  },
};

export const DEFAULT_SYSTEM_SETTINGS: Record<string, any> = {
  general: {
    universityName: "AI Agentic University",
    contactEmail: "admin@university.edu",
    contactPhone: "+1-800-555-0199",
    academicYear: "2026-2027",
    address: "100 Innovation Way, Tech District",
  },
  academic: {
    currentSemester: "Fall 2026",
    allowRegistration: true,
    allowCourseDrop: true,
    maxCreditsPerSemester: 18,
    minCreditsPerSemester: 9,
    defaultStudentFee: 5000,
    lateDropPenaltyPercent: 10,
  },
  security: {
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    requireTwoFactor: false,
    passwordMinLength: 8,
    passwordRequiresSpecialChar: true,
    jwtAccessTokenExpiration: "1d",
  },
  notifications: {
    emailNotificationsEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: "System is undergoing scheduled maintenance. Please check back later.",
    systemAnnouncement: "Welcome to the AI Agentic University portal! Fall 2026 registration is currently open.",
  },
};
