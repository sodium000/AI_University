import { db } from "../../prisma/db";
import { Temporal } from "@js-temporal/polyfill";
import bcrypt from "bcryptjs";
import config from "../../config";

const toInstant = (d?: Date | string | null) => {
  if (!d) return Temporal.Now.instant();
  return Temporal.Instant.from(new Date(d).toISOString());
};

// ==========================================
// Audit Logger Helper
// ==========================================
export const recordAuditLog = async (
  action: string,
  entity: string,
  entityId?: string | null,
  newData?: any,
  oldData?: any,
  userId?: string | null,
  ipAddress?: string | null,
  userAgent?: string | null,
) => {
  try {
    await db.orm.public.AuditLog.create({
      action,
      entity,
      entityId: entityId || null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      userId: userId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: Temporal.Now.instant(),
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
};

// ==========================================
// 1. Dashboard Statistics
// ==========================================
export const getDashboardStats = async () => {
  const [
    studentCountRes,
    activeStudentCountRes,
    facultyCountRes,
    departmentCountRes,
    programCountRes,
    courseCountRes,
    sectionCountRes,
    enrollmentCountRes,
  ] = await Promise.all([
    db.orm.public.Student.aggregate((a) => ({ count: a.count() })),
    db.orm.public.User.where({ role: "STUDENT" as const, status: "ACTIVE" as const }).aggregate((a) => ({ count: a.count() })),
    db.orm.public.Faculty.aggregate((a) => ({ count: a.count() })),
    db.orm.public.Department.aggregate((a) => ({ count: a.count() })),
    db.orm.public.Program.aggregate((a) => ({ count: a.count() })),
    db.orm.public.Course.aggregate((a) => ({ count: a.count() })),
    db.orm.public.Section.aggregate((a) => ({ count: a.count() })),
    db.orm.public.Enrollment.aggregate((a) => ({ count: a.count() })),
  ]);

  // Financial overview
  const totalRevenueRes = await db.orm.public.Payment.where({ status: "SUCCESS" as const })
    .aggregate((a) => ({ total: a.sum("amount") }));

  const pendingInvoicesRes = await db.orm.public.Invoice.where({ status: "PENDING" as const })
    .aggregate((a) => ({ total: a.sum("amount"), count: a.count() }));

  // Active semester
  const activeSemester = await db.orm.public.Semester.where({ status: "ACTIVE" as const }).first();

  // Recent Enrollments (last 5)
  const recentEnrollments = await db.orm.public.Enrollment
    .include("student", (st) =>
      st.include("user", (u) => u.select("id", "name", "email"))
        .include("department", (d) => d.select("id", "name", "code"))
    )
    .include("section", (s) =>
      s.include("course", (c) => c.select("id", "code", "title"))
    )
    .orderBy((e) => e.enrolledAt.desc())
    .limit(5)
    .all();

  // Recent Payments (last 5)
  const recentPayments = await db.orm.public.Payment
    .include("invoice", (inv) =>
      inv.include("student", (st) =>
        st.include("user", (u) => u.select("id", "name", "email"))
      )
    )
    .orderBy((p) => p.createdAt.desc())
    .limit(5)
    .all();

  // Recent Audit Logs (last 5)
  const recentActivity = await db.orm.public.AuditLog
    .include("user", (u) => u.select("id", "name", "email", "role"))
    .orderBy((l) => l.createdAt.desc())
    .limit(5)
    .all();

  return {
    counts: {
      students: studentCountRes?.count ?? 0,
      activeStudents: activeStudentCountRes?.count ?? 0,
      faculty: facultyCountRes?.count ?? 0,
      departments: departmentCountRes?.count ?? 0,
      programs: programCountRes?.count ?? 0,
      courses: courseCountRes?.count ?? 0,
      sections: sectionCountRes?.count ?? 0,
      enrollments: enrollmentCountRes?.count ?? 0,
    },
    financial: {
      totalRevenue: totalRevenueRes?.total ?? 0,
      pendingInvoiceAmount: pendingInvoicesRes?.total ?? 0,
      pendingInvoiceCount: pendingInvoicesRes?.count ?? 0,
    },
    activeSemester,
    recentEnrollments,
    recentPayments,
    recentActivity,
  };
};

// ==========================================
// 2. Student Management
// ==========================================
export interface StudentQueryFilters {
  searchTerm?: string;
  departmentId?: string;
  programId?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  currentYear?: number;
  currentSemester?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getAllStudents = async (filters: StudentQueryFilters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const skip = (page - 1) * limit;

  let query = db.orm.public.Student;

  if (filters.departmentId) {
    query = query.where({ departmentId: filters.departmentId });
  }
  if (filters.programId) {
    query = query.where({ programId: filters.programId });
  }
  if (filters.currentYear) {
    query = query.where({ currentYear: Number(filters.currentYear) });
  }
  if (filters.currentSemester) {
    query = query.where({ currentSemester: Number(filters.currentSemester) });
  }

  // Fetch all or filtered
  const [totalRes, students] = await Promise.all([
    query.aggregate((a) => ({ count: a.count() })),
    query
      .include("user", (u) =>
        u.select("id", "name", "email", "phone", "photoUrl", "role", "status", "emailVerified", "createdAt")
      )
      .include("department", (d) => d.select("id", "name", "code", "facultyName"))
      .include("program", (p) => p.select("id", "name", "code", "durationYears", "totalCredits"))
      .orderBy((s) => s.createdAt.desc())
      .offset(skip)
      .limit(limit)
      .all(),
  ]);

  let filteredStudents = students;
  if (filters.status) {
    filteredStudents = filteredStudents.filter((s) => s.user?.status === filters.status);
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filteredStudents = filteredStudents.filter((s) =>
      s.studentId.toLowerCase().includes(term) ||
      s.user?.name?.toLowerCase().includes(term) ||
      s.user?.email?.toLowerCase().includes(term)
    );
  }

  return {
    meta: {
      page,
      limit,
      total: totalRes?.count ?? 0,
      totalPages: Math.ceil((totalRes?.count ?? 0) / limit),
    },
    students: filteredStudents,
  };
};

export interface CreateStudentPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  photoUrl?: string;
  studentId?: string;
  departmentId: string;
  programId: string;
  admissionYear: number;
  currentYear?: number;
  currentSemester?: number;
  dateOfBirth?: string | Date;
  gender?: string;
  address?: string;
}

export const createStudent = async (
  payload: CreateStudentPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const existingUser = await db.orm.public.User.where({ email: payload.email }).first();
  if (existingUser) {
    throw new Error(`User with email '${payload.email}' already exists.`);
  }

  // Department & Program verification
  const [dept, prog] = await Promise.all([
    db.orm.public.Department.where({ id: payload.departmentId }).first(),
    db.orm.public.Program.where({ id: payload.programId }).first(),
  ]);
  if (!dept) throw new Error("Department not found with provided departmentId.");
  if (!prog) throw new Error("Program not found with provided programId.");

  // Generate or verify studentId
  let studentId = payload.studentId;
  if (!studentId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    studentId = `STU${payload.admissionYear || new Date().getFullYear()}${randomSuffix}`;
  } else {
    const existingStudent = await db.orm.public.Student.where({ studentId }).first();
    if (existingStudent) {
      throw new Error(`Student with studentId '${studentId}' already exists.`);
    }
  }

  const rawPassword = payload.password || `Univ@${studentId}`;
  const hashedPassword = await bcrypt.hash(
    rawPassword,
    Number(config.bcrypt_salt_rounds) || 10,
  );

  const result = await db.transaction(async (tx) => {
    const user = await tx.orm.public.User.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone || null,
      photoUrl: payload.photoUrl || null,
      role: "STUDENT" as const,
      status: "ACTIVE" as const,
      emailVerified: true,
      credential: "EMAIL" as const,
      createdAt: Temporal.Now.instant(),
      updatedAt: Temporal.Now.instant(),
    });

    const student = await tx.orm.public.Student.create({
      userId: user.id,
      studentId: studentId!,
      departmentId: payload.departmentId,
      programId: payload.programId,
      admissionYear: Number(payload.admissionYear) || new Date().getFullYear(),
      currentYear: Number(payload.currentYear) || 1,
      currentSemester: Number(payload.currentSemester) || 1,
      dateOfBirth: payload.dateOfBirth ? toInstant(payload.dateOfBirth) : null,
      gender: payload.gender || null,
      address: payload.address || null,
      createdAt: Temporal.Now.instant(),
      updatedAt: Temporal.Now.instant(),
    });

    return { user, student };
  });

  await recordAuditLog(
    "CREATE_STUDENT",
    "Student",
    result.student.id,
    { studentId: result.student.studentId, email: result.user.email, name: result.user.name },
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return {
    ...result.student,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      phone: result.user.phone,
      photoUrl: result.user.photoUrl,
      role: result.user.role,
      status: result.user.status,
    },
    department: dept,
    program: prog,
  };
};

export interface UpdateStudentPayload {
  name?: string;
  phone?: string;
  photoUrl?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  password?: string;
  departmentId?: string;
  programId?: string;
  currentYear?: number;
  currentSemester?: number;
  dateOfBirth?: string | Date;
  gender?: string;
  address?: string;
}

export const updateStudent = async (
  idOrStudentId: string,
  payload: UpdateStudentPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  // Can identify by student id, student primary id, or user id
  let student = await db.orm.public.Student.where({ id: idOrStudentId }).first();
  if (!student) {
    student = await db.orm.public.Student.where({ studentId: idOrStudentId }).first();
  }
  if (!student) {
    student = await db.orm.public.Student.where({ userId: idOrStudentId }).first();
  }

  if (!student) {
    throw new Error(`Student record not found for '${idOrStudentId}'.`);
  }

  const user = await db.orm.public.User.where({ id: student.userId }).first();
  const oldData = { student, user };

  // User updates
  const userUpdates: Record<string, any> = { updatedAt: Temporal.Now.instant() };
  if (payload.name !== undefined) userUpdates.name = payload.name;
  if (payload.phone !== undefined) userUpdates.phone = payload.phone;
  if (payload.photoUrl !== undefined) userUpdates.photoUrl = payload.photoUrl;
  if (payload.status !== undefined) userUpdates.status = payload.status;
  if (payload.password) {
    userUpdates.password = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds) || 10,
    );
  }

  // Student updates
  const studentUpdates: Record<string, any> = { updatedAt: Temporal.Now.instant() };
  if (payload.departmentId !== undefined) studentUpdates.departmentId = payload.departmentId;
  if (payload.programId !== undefined) studentUpdates.programId = payload.programId;
  if (payload.currentYear !== undefined) studentUpdates.currentYear = Number(payload.currentYear);
  if (payload.currentSemester !== undefined) studentUpdates.currentSemester = Number(payload.currentSemester);
  if (payload.dateOfBirth !== undefined) studentUpdates.dateOfBirth = toInstant(payload.dateOfBirth);
  if (payload.gender !== undefined) studentUpdates.gender = payload.gender;
  if (payload.address !== undefined) studentUpdates.address = payload.address;

  await db.transaction(async (tx) => {
    if (Object.keys(userUpdates).length > 1) {
      await tx.orm.public.User.where({ id: student!.userId }).update(userUpdates);
    }
    if (Object.keys(studentUpdates).length > 1) {
      await tx.orm.public.Student.where({ id: student!.id }).update(studentUpdates);
    }
  });

  await recordAuditLog(
    "UPDATE_STUDENT",
    "Student",
    student.id,
    payload,
    oldData,
    adminUserId,
    clientIp,
    userAgent,
  );

  const updatedStudent = await db.orm.public.Student.where({ id: student.id })
    .include("user", (u) => u.select("id", "name", "email", "phone", "photoUrl", "role", "status"))
    .include("department", (d) => d.select("id", "name", "code"))
    .include("program", (p) => p.select("id", "name", "code"))
    .first();

  return updatedStudent;
};

export const deleteStudent = async (
  idOrStudentId: string,
  hardDelete: boolean = false,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  let student = await db.orm.public.Student.where({ id: idOrStudentId }).first();
  if (!student) {
    student = await db.orm.public.Student.where({ studentId: idOrStudentId }).first();
  }
  if (!student) {
    student = await db.orm.public.Student.where({ userId: idOrStudentId }).first();
  }

  if (!student) {
    throw new Error(`Student record not found for '${idOrStudentId}'.`);
  }

  if (hardDelete) {
    // Check if there are enrollments or invoices that block hard deletion
    const enrollmentsCount = await db.orm.public.Enrollment.where({ studentId: student.id })
      .aggregate((a) => ({ count: a.count() }));
    if ((enrollmentsCount?.count ?? 0) > 0) {
      throw new Error(
        "Cannot permanently delete student: academic records (enrollments) exist. Please deactivate instead."
      );
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.Student.where({ id: student!.id }).delete();
      await tx.orm.public.User.where({ id: student!.userId }).delete();
    });

    await recordAuditLog(
      "HARD_DELETE_STUDENT",
      "Student",
      student.id,
      null,
      student,
      adminUserId,
      clientIp,
      userAgent,
    );

    return { message: "Student and user account permanently deleted.", id: student.id };
  } else {
    // Soft deactivation (preferred for university records)
    await db.orm.public.User.where({ id: student.userId }).update({
      status: "INACTIVE" as const,
      updatedAt: Temporal.Now.instant(),
    });

    await recordAuditLog(
      "DEACTIVATE_STUDENT",
      "Student",
      student.id,
      { status: "INACTIVE" },
      student,
      adminUserId,
      clientIp,
      userAgent,
    );

    return {
      message: "Student account successfully deactivated.",
      studentId: student.studentId,
      status: "INACTIVE",
    };
  }
};

// ==========================================
// 3. Faculty Management
// ==========================================
export interface FacultyQueryFilters {
  searchTerm?: string;
  departmentId?: string;
  designation?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  page?: number;
  limit?: number;
}

export const getAllFaculty = async (filters: FacultyQueryFilters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const skip = (page - 1) * limit;

  let query = db.orm.public.Faculty;

  if (filters.departmentId) {
    query = query.where({ departmentId: filters.departmentId });
  }
  if (filters.designation) {
    query = query.where({ designation: filters.designation });
  }

  const [totalRes, facultyList] = await Promise.all([
    query.aggregate((a) => ({ count: a.count() })),
    query
      .include("user", (u) =>
        u.select("id", "name", "email", "phone", "photoUrl", "role", "status", "createdAt")
      )
      .include("department", (d) => d.select("id", "name", "code", "facultyName"))
      .orderBy((f) => f.createdAt.desc())
      .offset(skip)
      .limit(limit)
      .all(),
  ]);

  let filtered = facultyList;
  if (filters.status) {
    filtered = filtered.filter((f) => f.user?.status === filters.status);
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter((f) =>
      f.employeeId.toLowerCase().includes(term) ||
      f.designation.toLowerCase().includes(term) ||
      f.user?.name?.toLowerCase().includes(term) ||
      f.user?.email?.toLowerCase().includes(term)
    );
  }

  return {
    meta: {
      page,
      limit,
      total: totalRes?.count ?? 0,
      totalPages: Math.ceil((totalRes?.count ?? 0) / limit),
    },
    faculty: filtered,
  };
};

export interface CreateFacultyPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  photoUrl?: string;
  employeeId?: string;
  departmentId: string;
  designation: string;
  specialization?: string;
  joiningDate?: string | Date;
}

export const createFaculty = async (
  payload: CreateFacultyPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const existingUser = await db.orm.public.User.where({ email: payload.email }).first();
  if (existingUser) {
    throw new Error(`User with email '${payload.email}' already exists.`);
  }

  const dept = await db.orm.public.Department.where({ id: payload.departmentId }).first();
  if (!dept) throw new Error("Department not found with provided departmentId.");

  let employeeId = payload.employeeId;
  if (!employeeId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    employeeId = `FAC${new Date().getFullYear()}${randomSuffix}`;
  } else {
    const existingFaculty = await db.orm.public.Faculty.where({ employeeId }).first();
    if (existingFaculty) {
      throw new Error(`Faculty with employeeId '${employeeId}' already exists.`);
    }
  }

  const rawPassword = payload.password || `UnivFac@${employeeId}`;
  const hashedPassword = await bcrypt.hash(
    rawPassword,
    Number(config.bcrypt_salt_rounds) || 10,
  );

  const result = await db.transaction(async (tx) => {
    const user = await tx.orm.public.User.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone || null,
      photoUrl: payload.photoUrl || null,
      role: "FACULTY" as const,
      status: "ACTIVE" as const,
      emailVerified: true,
      credential: "EMAIL" as const,
      createdAt: Temporal.Now.instant(),
      updatedAt: Temporal.Now.instant(),
    });

    const faculty = await tx.orm.public.Faculty.create({
      userId: user.id,
      employeeId: employeeId!,
      departmentId: payload.departmentId,
      designation: payload.designation,
      specialization: payload.specialization || null,
      joiningDate: payload.joiningDate ? toInstant(payload.joiningDate) : Temporal.Now.instant(),
      createdAt: Temporal.Now.instant(),
      updatedAt: Temporal.Now.instant(),
    });

    return { user, faculty };
  });

  await recordAuditLog(
    "CREATE_FACULTY",
    "Faculty",
    result.faculty.id,
    { employeeId: result.faculty.employeeId, email: result.user.email, designation: result.faculty.designation },
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return {
    ...result.faculty,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      phone: result.user.phone,
      photoUrl: result.user.photoUrl,
      role: result.user.role,
      status: result.user.status,
    },
    department: dept,
  };
};

// ==========================================
// 4. Academic Structure: Departments
// ==========================================
export interface CreateDepartmentPayload {
  name: string;
  code: string;
  facultyName?: string;
}

export const createDepartment = async (
  payload: CreateDepartmentPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const existing = await db.orm.public.Department.where({ code: payload.code.toUpperCase() }).first();
  if (existing) {
    throw new Error(`Department code '${payload.code}' is already in use.`);
  }

  const department = await db.orm.public.Department.create({
    name: payload.name,
    code: payload.code.toUpperCase(),
    facultyName: payload.facultyName || null,
    createdAt: Temporal.Now.instant(),
    updatedAt: Temporal.Now.instant(),
  });

  await recordAuditLog(
    "CREATE_DEPARTMENT",
    "Department",
    department.id,
    department,
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return department;
};

export interface UpdateDepartmentPayload {
  name?: string;
  code?: string;
  facultyName?: string;
}

export const updateDepartment = async (
  id: string,
  payload: UpdateDepartmentPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const department = await db.orm.public.Department.where({ id }).first();
  if (!department) {
    throw new Error(`Department not found for id '${id}'.`);
  }

  if (payload.code && payload.code.toUpperCase() !== department.code) {
    const existing = await db.orm.public.Department.where({ code: payload.code.toUpperCase() }).first();
    if (existing && existing.id !== id) {
      throw new Error(`Department code '${payload.code}' is already taken.`);
    }
  }

  const updates: Record<string, any> = { updatedAt: Temporal.Now.instant() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.code !== undefined) updates.code = payload.code.toUpperCase();
  if (payload.facultyName !== undefined) updates.facultyName = payload.facultyName;

  await db.orm.public.Department.where({ id }).update(updates);

  await recordAuditLog(
    "UPDATE_DEPARTMENT",
    "Department",
    id,
    updates,
    department,
    adminUserId,
    clientIp,
    userAgent,
  );

  return db.orm.public.Department.where({ id }).first();
};

// ==========================================
// 5. Academic Structure: Programs
// ==========================================
export interface CreateProgramPayload {
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  totalCredits: number;
}

export const createProgram = async (
  payload: CreateProgramPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const dept = await db.orm.public.Department.where({ id: payload.departmentId }).first();
  if (!dept) throw new Error("Department not found for provided departmentId.");

  const existing = await db.orm.public.Program.where({ code: payload.code.toUpperCase() }).first();
  if (existing) {
    throw new Error(`Program code '${payload.code}' is already in use.`);
  }

  const program = await db.orm.public.Program.create({
    name: payload.name,
    code: payload.code.toUpperCase(),
    departmentId: payload.departmentId,
    durationYears: Number(payload.durationYears),
    totalCredits: Number(payload.totalCredits),
    createdAt: Temporal.Now.instant(),
    updatedAt: Temporal.Now.instant(),
  });

  await recordAuditLog(
    "CREATE_PROGRAM",
    "Program",
    program.id,
    program,
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return {
    ...program,
    department: dept,
  };
};

// ==========================================
// 6. Academic Structure: Courses
// ==========================================
export interface CreateCoursePayload {
  code: string;
  title: string;
  description?: string;
  credit: number;
  departmentId: string;
  programId?: string;
}

export const createCourse = async (
  payload: CreateCoursePayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const dept = await db.orm.public.Department.where({ id: payload.departmentId }).first();
  if (!dept) throw new Error("Department not found for provided departmentId.");

  if (payload.programId) {
    const prog = await db.orm.public.Program.where({ id: payload.programId }).first();
    if (!prog) throw new Error("Program not found for provided programId.");
  }

  const existing = await db.orm.public.Course.where({ code: payload.code.toUpperCase() }).first();
  if (existing) {
    throw new Error(`Course code '${payload.code}' is already in use.`);
  }

  const course = await db.orm.public.Course.create({
    code: payload.code.toUpperCase(),
    title: payload.title,
    description: payload.description || null,
    credit: Number(payload.credit),
    departmentId: payload.departmentId,
    programId: payload.programId || null,
    createdAt: Temporal.Now.instant(),
    updatedAt: Temporal.Now.instant(),
  });

  await recordAuditLog(
    "CREATE_COURSE",
    "Course",
    course.id,
    course,
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return {
    ...course,
    department: dept,
  };
};

// ==========================================
// 7. Academic Structure: Semesters
// ==========================================
export interface CreateSemesterPayload {
  name: string;
  year: number;
  startDate: string | Date;
  endDate: string | Date;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
}

export const createSemester = async (
  payload: CreateSemesterPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const semester = await db.orm.public.Semester.create({
    name: payload.name,
    year: Number(payload.year),
    startDate: toInstant(payload.startDate),
    endDate: toInstant(payload.endDate),
    status: payload.status,
  });

  await recordAuditLog(
    "CREATE_SEMESTER",
    "Semester",
    semester.id,
    semester,
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return semester;
};

// ==========================================
// 8. Academic Structure: Course Sections
// ==========================================
export interface ClassScheduleInput {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  room?: string;
  building?: string;
}

export interface CreateSectionPayload {
  name: string;
  courseId: string;
  semesterId: string;
  facultyId: string;
  capacity: number;
  schedules?: ClassScheduleInput[];
}

export const createSection = async (
  payload: CreateSectionPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  const [course, semester, faculty] = await Promise.all([
    db.orm.public.Course.where({ id: payload.courseId }).first(),
    db.orm.public.Semester.where({ id: payload.semesterId }).first(),
    db.orm.public.Faculty.where({ id: payload.facultyId }).first(),
  ]);

  if (!course) throw new Error("Course not found with provided courseId.");
  if (!semester) throw new Error("Semester not found with provided semesterId.");
  if (!faculty) throw new Error("Faculty member not found with provided facultyId.");

  // Check section name uniqueness for that course + semester
  const existingSection = await db.orm.public.Section.where({
    courseId: payload.courseId,
    semesterId: payload.semesterId,
    name: payload.name,
  }).first();

  if (existingSection) {
    throw new Error(
      `Section '${payload.name}' already exists for this course and semester.`
    );
  }

  const result = await db.transaction(async (tx) => {
    const section = await tx.orm.public.Section.create({
      name: payload.name,
      courseId: payload.courseId,
      semesterId: payload.semesterId,
      facultyId: payload.facultyId,
      capacity: Number(payload.capacity),
      createdAt: Temporal.Now.instant(),
    });

    const createdSchedules = [];
    if (payload.schedules && payload.schedules.length > 0) {
      for (const item of payload.schedules) {
        const schedule = await tx.orm.public.ClassSchedule.create({
          sectionId: section.id,
          dayOfWeek: Number(item.dayOfWeek),
          startTime: item.startTime,
          endTime: item.endTime,
          room: item.room || null,
          building: item.building || null,
        });
        createdSchedules.push(schedule);
      }
    }

    return { section, schedules: createdSchedules };
  });

  await recordAuditLog(
    "CREATE_SECTION",
    "Section",
    result.section.id,
    { section: result.section, schedulesCount: result.schedules.length },
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return {
    ...result.section,
    course,
    semester,
    faculty,
    schedules: result.schedules,
  };
};

// ==========================================
// 9. Enrollments & Admin Force-Enrollment
// ==========================================
export interface EnrollmentQueryFilters {
  studentId?: string;
  sectionId?: string;
  courseId?: string;
  semesterId?: string;
  status?: "ENROLLED" | "DROPPED" | "COMPLETED" | "WITHDRAWN";
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export const getAllEnrollments = async (filters: EnrollmentQueryFilters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const skip = (page - 1) * limit;

  let query = db.orm.public.Enrollment;

  if (filters.studentId) {
    query = query.where({ studentId: filters.studentId });
  }
  if (filters.sectionId) {
    query = query.where({ sectionId: filters.sectionId });
  }
  if (filters.status) {
    query = query.where({ status: filters.status });
  }

  const [totalRes, enrollments] = await Promise.all([
    query.aggregate((a) => ({ count: a.count() })),
    query
      .include("student", (st) =>
        st.include("user", (u) => u.select("id", "name", "email", "phone"))
          .include("department", (d) => d.select("id", "name", "code"))
          .include("program", (p) => p.select("id", "name", "code"))
      )
      .include("section", (sec) =>
        sec.include("course", (c) => c.select("id", "code", "title", "credit"))
          .include("semester", (sem) => sem.select("id", "name", "year", "status"))
          .include("faculty", (f) =>
            f.include("user", (u) => u.select("id", "name", "email"))
          )
      )
      .orderBy((e) => e.enrolledAt.desc())
      .offset(skip)
      .limit(limit)
      .all(),
  ]);

  let filtered = enrollments;
  if (filters.semesterId) {
    filtered = filtered.filter((e) => e.section?.semesterId === filters.semesterId);
  }
  if (filters.courseId) {
    filtered = filtered.filter((e) => e.section?.courseId === filters.courseId);
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter((e) =>
      e.student?.studentId?.toLowerCase().includes(term) ||
      e.student?.user?.name?.toLowerCase().includes(term) ||
      e.section?.course?.code?.toLowerCase().includes(term) ||
      e.section?.course?.title?.toLowerCase().includes(term)
    );
  }

  return {
    meta: {
      page,
      limit,
      total: totalRes?.count ?? 0,
      totalPages: Math.ceil((totalRes?.count ?? 0) / limit),
    },
    enrollments: filtered,
  };
};

export interface ForceEnrollPayload {
  studentId: string; // can be Student.id or Student.studentId
  sectionId: string;
  overrideCapacity?: boolean;
}

export const forceEnrollStudent = async (
  payload: ForceEnrollPayload,
  adminUserId?: string,
  clientIp?: string,
  userAgent?: string,
) => {
  let student = await db.orm.public.Student.where({ id: payload.studentId }).first();
  if (!student) {
    student = await db.orm.public.Student.where({ studentId: payload.studentId }).first();
  }
  if (!student) {
    throw new Error(`Student not found for '${payload.studentId}'.`);
  }

  const section = await db.orm.public.Section.where({ id: payload.sectionId })
    .include("course", (c) => c.select("id", "code", "title"))
    .include("semester", (s) => s.select("id", "name", "status"))
    .first();

  if (!section) {
    throw new Error(`Section not found for '${payload.sectionId}'.`);
  }

  // Check if student is already enrolled in this section
  const existingEnrollment = await db.orm.public.Enrollment.where({
    studentId: student.id,
    sectionId: section.id,
  }).first();

  if (existingEnrollment) {
    if (existingEnrollment.status === "ENROLLED") {
      throw new Error("Student is already active and enrolled in this section.");
    }
    // Re-enroll if previously dropped or withdrawn
    await db.orm.public.Enrollment.where({ id: existingEnrollment.id }).update({
      status: "ENROLLED" as const,
      enrolledAt: Temporal.Now.instant(),
    });

    await recordAuditLog(
      "FORCE_RE_ENROLL_STUDENT",
      "Enrollment",
      existingEnrollment.id,
      { studentId: student.id, sectionId: section.id, previousStatus: existingEnrollment.status },
      existingEnrollment,
      adminUserId,
      clientIp,
      userAgent,
    );

    return {
      message: "Student successfully re-enrolled (admin override).",
      enrollmentId: existingEnrollment.id,
      student,
      section,
    };
  }

  // Admin capacity check & override
  const currentEnrolledCountRes = await db.orm.public.Enrollment.where({
    sectionId: section.id,
    status: "ENROLLED" as const,
  }).aggregate((a) => ({ count: a.count() }));

  const currentCount = currentEnrolledCountRes?.count ?? 0;
  const isOverCapacity = currentCount >= section.capacity;

  const enrollment = await db.orm.public.Enrollment.create({
    studentId: student.id,
    sectionId: section.id,
    status: "ENROLLED" as const,
    enrolledAt: Temporal.Now.instant(),
  });

  await recordAuditLog(
    "FORCE_ENROLL_STUDENT",
    "Enrollment",
    enrollment.id,
    {
      studentId: student.id,
      sectionId: section.id,
      capacity: section.capacity,
      currentEnrolled: currentCount,
      overrideCapacity: isOverCapacity,
    },
    null,
    adminUserId,
    clientIp,
    userAgent,
  );

  return {
    message: isOverCapacity
      ? "Student successfully force-enrolled with capacity override."
      : "Student successfully enrolled into section.",
    enrollment,
    student,
    section,
    capacityInfo: {
      capacity: section.capacity,
      enrolledBefore: currentCount,
      enrolledAfter: currentCount + 1,
      overCapacity: isOverCapacity,
    },
  };
};

// ==========================================
// 10. Financial: All Payments
// ==========================================
export interface PaymentQueryFilters {
  status?: "SUCCESS" | "FAILED" | "PENDING";
  method?: "CASH" | "CARD" | "ONLINE" | "BANK_TRANSFER";
  studentId?: string;
  page?: number;
  limit?: number;
}

export const getAllPayments = async (filters: PaymentQueryFilters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const skip = (page - 1) * limit;

  let query = db.orm.public.Payment;

  if (filters.status) {
    query = query.where({ status: filters.status });
  }
  if (filters.method) {
    query = query.where({ method: filters.method });
  }

  const [totalRes, totalAmountRes, payments] = await Promise.all([
    query.aggregate((a) => ({ count: a.count() })),
    query.where({ status: "SUCCESS" as const }).aggregate((a) => ({ total: a.sum("amount") })),
    query
      .include("invoice", (inv) =>
        inv.include("student", (st) =>
          st.include("user", (u) => u.select("id", "name", "email", "phone"))
            .include("department", (d) => d.select("id", "name", "code"))
        )
      )
      .orderBy((p) => p.createdAt.desc())
      .offset(skip)
      .limit(limit)
      .all(),
  ]);

  let filtered = payments;
  if (filters.studentId) {
    filtered = filtered.filter((p) =>
      p.invoice?.studentId === filters.studentId ||
      p.invoice?.student?.studentId === filters.studentId
    );
  }

  return {
    meta: {
      page,
      limit,
      total: totalRes?.count ?? 0,
      totalPages: Math.ceil((totalRes?.count ?? 0) / limit),
      totalSuccessfulRevenue: totalAmountRes?.total ?? 0,
    },
    payments: filtered,
  };
};

// ==========================================
// 11. Reports: Enrollment, Financial, Academic
// ==========================================
export interface ReportQueryFilters {
  type?: "enrollment" | "financial" | "academic" | "all";
  semesterId?: string;
  departmentId?: string;
  year?: number;
}

export const generateReports = async (filters: ReportQueryFilters) => {
  const reportType = filters.type || "all";
  const result: Record<string, any> = {
    generatedAt: new Date().toISOString(),
    filter: filters,
  };

  // ---------------- Enrollment Report ----------------
  if (reportType === "enrollment" || reportType === "all") {
    const [allEnrollments, allSections] = await Promise.all([
      db.orm.public.Enrollment
        .include("section", (s) =>
          s.include("course", (c) => c.select("id", "code", "title", "departmentId"))
            .include("semester", (sem) => sem.select("id", "name", "year", "status"))
        )
        .all(),
      db.orm.public.Section
        .include("course", (c) => c.select("id", "code", "title", "departmentId"))
        .include("semester", (sem) => sem.select("id", "name", "year", "status"))
        .all(),
    ]);

    const statusBreakdown = {
      ENROLLED: allEnrollments.filter((e) => e.status === "ENROLLED").length,
      DROPPED: allEnrollments.filter((e) => e.status === "DROPPED").length,
      COMPLETED: allEnrollments.filter((e) => e.status === "COMPLETED").length,
      WITHDRAWN: allEnrollments.filter((e) => e.status === "WITHDRAWN").length,
    };

    // Capacity utilization per section
    const sectionUtilization = allSections.map((sec) => {
      const enrolledCount = allEnrollments.filter(
        (e) => e.sectionId === sec.id && e.status === "ENROLLED"
      ).length;
      return {
        sectionId: sec.id,
        sectionName: sec.name,
        courseCode: sec.course?.code,
        courseTitle: sec.course?.title,
        semester: sec.semester?.name,
        capacity: sec.capacity,
        enrolled: enrolledCount,
        utilizationRate: sec.capacity > 0 ? Math.round((enrolledCount / sec.capacity) * 100) : 0,
      };
    });

    result.enrollmentReport = {
      totalEnrollments: allEnrollments.length,
      statusBreakdown,
      retentionRate: allEnrollments.length > 0
        ? Math.round(((statusBreakdown.ENROLLED + statusBreakdown.COMPLETED) / allEnrollments.length) * 100)
        : 0,
      sectionsCount: allSections.length,
      sectionUtilization,
    };
  }

  // ---------------- Financial Report ----------------
  if (reportType === "financial" || reportType === "all") {
    const [payments, invoices] = await Promise.all([
      db.orm.public.Payment.all(),
      db.orm.public.Invoice.all(),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidInvoices = invoices.filter((i) => i.status === "PAID");
    const pendingInvoices = invoices.filter((i) => i.status === "PENDING");
    const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const successfulPayments = payments.filter((p) => p.status === "SUCCESS");
    const totalCollected = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentsByMethod: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      const entry = paymentsByMethod[p.method] ?? { count: 0, total: 0 };
      entry.count += 1;
      if (p.status === "SUCCESS") {
        entry.total += p.amount || 0;
      }
      paymentsByMethod[p.method] = entry;
    }

    result.financialReport = {
      totalInvoiced,
      totalCollected,
      totalPending,
      collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
      invoicesSummary: {
        total: invoices.length,
        paid: paidInvoices.length,
        pending: pendingInvoices.length,
        cancelled: invoices.filter((i) => i.status === "CANCELLED").length,
      },
      paymentsByMethod,
    };
  }

  // ---------------- Academic Report ----------------
  if (reportType === "academic" || reportType === "all") {
    const results = await db.orm.public.Result
      .include("student", (st) =>
        st.include("user", (u) => u.select("id", "name"))
          .include("department", (d) => d.select("id", "name", "code"))
      )
      .all();

    const gradeDistribution: Record<string, number> = {};
    let totalGradePoints = 0;

    for (const r of results) {
      gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
      totalGradePoints += r.gradePoint || 0;
    }

    const averageGPA = results.length > 0
      ? Number((totalGradePoints / results.length).toFixed(2))
      : 0;

    // High performers (gradePoint >= 3.75) and at-risk (gradePoint < 2.0)
    const highPerformers = results.filter((r) => (r.gradePoint || 0) >= 3.75).length;
    const atRiskStudents = results.filter((r) => (r.gradePoint || 0) < 2.0).length;

    result.academicReport = {
      totalResultsRecorded: results.length,
      averageGPA,
      gradeDistribution,
      highPerformersCount: highPerformers,
      atRiskStudentsCount: atRiskStudents,
    };
  }

  return result;
};

export const adminService = {
  getDashboardStats,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllFaculty,
  createFaculty,
  createDepartment,
  updateDepartment,
  createProgram,
  createCourse,
  createSemester,
  createSection,
  getAllEnrollments,
  forceEnrollStudent,
  getAllPayments,
  generateReports,
};
