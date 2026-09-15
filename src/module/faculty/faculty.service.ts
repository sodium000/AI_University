import { db } from "../../prisma/db";
import { Temporal } from "@js-temporal/polyfill";

const toInstant = (d?: Date | string | null) => {
  if (!d) return Temporal.Now.instant();
  return Temporal.Instant.from(new Date(d).toISOString());
};

const calculateGrade = (
  marks: number,
): { grade: string; gradePoint: number } => {
  if (marks >= 80) return { grade: "A+", gradePoint: 4.0 };
  if (marks >= 75) return { grade: "A", gradePoint: 3.75 };
  if (marks >= 70) return { grade: "A-", gradePoint: 3.5 };
  if (marks >= 65) return { grade: "B+", gradePoint: 3.25 };
  if (marks >= 60) return { grade: "B", gradePoint: 3.0 };
  if (marks >= 55) return { grade: "B-", gradePoint: 2.75 };
  if (marks >= 50) return { grade: "C+", gradePoint: 2.5 };
  if (marks >= 45) return { grade: "C", gradePoint: 2.25 };
  if (marks >= 40) return { grade: "D", gradePoint: 2.0 };
  return { grade: "F", gradePoint: 0.0 };
};

export interface UpdateFacultyProfilePayload {
  phone?: string;
  photoUrl?: string;
  designation?: string;
  specialization?: string;
}

export interface CreateAssignmentPayload {
  sectionId: string;
  title: string;
  description?: string;
  deadline: string | Date;
  totalMarks: number;
}

export interface UpdateAssignmentPayload {
  title?: string;
  description?: string;
  deadline?: string | Date;
  totalMarks?: number;
}

export interface RecordAttendancePayload {
  date?: string | Date;
  records: Array<{
    studentId: string;
    status: string;
  }>;
}

export interface PostResultPayload {
  studentId?: string;
  enrollmentId?: string;
  sectionId?: string;
  examId?: string;
  marks: number;
  grade?: string;
  gradePoint?: number;
}

export interface UpdateResultPayload {
  marks?: number;
  grade?: string;
  gradePoint?: number;
}

export interface CreateExamPayload {
  sectionId: string;
  title: string;
  type: "MIDTERM" | "FINAL" | "QUIZ" | "PRACTICAL";
  examDate: string | Date;
  totalMarks: number;
}

const getProfile = async (userId: string) => {
  const faculty = await db.orm.public.Faculty.where({ userId })
    .include("user", (u) =>
      u.select(
        "id",
        "name",
        "email",
        "phone",
        "photoUrl",
        "role",
        "status",
        "emailVerified",
        "createdAt",
      ),
    )
    .include("department", (d) => d.select("id", "name", "code", "facultyName"))
    .first();

  if (!faculty) {
    const user = await db.orm.public.User.where({ id: userId })
      .select("id", "name", "email", "phone", "photoUrl", "role", "status")
      .first();

    return {
      isProfileComplete: false,
      message: "Faculty record has not been configured by administration yet.",
      user,
    };
  }

  return {
    isProfileComplete: true,
    ...faculty,
  };
};

const updateProfile = async (
  userId: string,
  facultyId: string | undefined,
  payload: UpdateFacultyProfilePayload,
) => {
  const { phone, photoUrl, designation, specialization } = payload;

  if (phone !== undefined || photoUrl !== undefined) {
    const userUpdate: Record<string, any> = {};
    if (phone !== undefined) userUpdate.phone = phone;
    if (photoUrl !== undefined) userUpdate.photoUrl = photoUrl;

    await db.orm.public.User.where({ id: userId }).update(userUpdate);
  }

  if (facultyId && (designation !== undefined || specialization !== undefined)) {
    const facultyUpdate: Record<string, any> = {};
    if (designation !== undefined) facultyUpdate.designation = designation;
    if (specialization !== undefined) facultyUpdate.specialization = specialization;

    await db.orm.public.Faculty.where({ id: facultyId }).update(facultyUpdate);
  }

  return getProfile(userId);
};

const getMySections = async (
  facultyId: string,
  filters?: { semesterId?: string; courseId?: string },
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  let query = db.orm.public.Section.where((s) => s.facultyId.eq(facultyId));

  if (filters?.semesterId) {
    query = query.where((s) => s.semesterId.eq(filters.semesterId!));
  }

  if (filters?.courseId) {
    query = query.where((s) => s.courseId.eq(filters.courseId!));
  }

  const sections = await query
    .include("course", (c) =>
      c.select("id", "code", "title", "description", "credit"),
    )
    .include("semester", (s) =>
      s.select("id", "name", "year", "status", "startDate", "endDate"),
    )
    .include("schedules", (sch) =>
      sch.select("id", "dayOfWeek", "startTime", "endTime", "room", "building"),
    )
    .include("enrollments", (e) => e.select("id", "studentId", "status"))
    .include("assignments", (a) =>
      a.select("id", "title", "deadline", "totalMarks", "createdAt"),
    )
    .include("exams", (ex) =>
      ex.select("id", "title", "type", "examDate", "totalMarks"),
    )
    .orderBy((s) => s.createdAt.desc())
    .all();

  return sections.map((section: any) => {
    const activeEnrollments = (section.enrollments || []).filter(
      (e: any) => e.status === "ENROLLED",
    );
    return {
      ...section,
      enrolledCount: activeEnrollments.length,
      availableCapacity: Math.max(0, section.capacity - activeEnrollments.length),
    };
  });
};

const getMyStudents = async (
  facultyId: string,
  filters?: { sectionId?: string; search?: string },
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const sections = await db.orm.public.Section.where({ facultyId }).all();
  let sectionIds = sections.map((s) => s.id);

  if (filters?.sectionId) {
    if (!sectionIds.includes(filters.sectionId)) {
      throw new Error("Forbidden: You do not teach the specified section.");
    }
    sectionIds = [filters.sectionId];
  }

  if (sectionIds.length === 0) {
    return [];
  }

  const enrollments = await db.orm.public.Enrollment.where((e) =>
    e.sectionId.in(sectionIds),
  )
    .where({ status: "ENROLLED" as any })
    .include("student", (st) =>
      st
        .select(
          "id",
          "studentId",
          "admissionYear",
          "currentYear",
          "currentSemester",
          "userId",
          "departmentId",
          "programId",
        )
        .include("user", (u) =>
          u.select("id", "name", "email", "phone", "photoUrl", "status"),
        )
        .include("department", (d) => d.select("id", "name", "code"))
        .include("program", (p) => p.select("id", "name", "code")),
    )
    .include("section", (s) =>
      s
        .select("id", "name", "courseId")
        .include("course", (c) => c.select("id", "code", "title")),
    )
    .all();

  let results = enrollments.map((e: any) => ({
    enrollmentId: e.id,
    enrolledAt: e.enrolledAt,
    status: e.status,
    section: e.section,
    student: e.student,
  }));

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(
      (r: any) =>
        r.student?.studentId?.toLowerCase().includes(term) ||
        r.student?.user?.name?.toLowerCase().includes(term) ||
        r.student?.user?.email?.toLowerCase().includes(term),
    );
  }

  return results;
};

const getSectionDetail = async (facultyId: string, sectionId: string) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const section = await db.orm.public.Section.where({ id: sectionId })
    .include("course", (c) =>
      c.select("id", "code", "title", "description", "credit"),
    )
    .include("semester", (s) =>
      s.select("id", "name", "year", "status", "startDate", "endDate"),
    )
    .include("faculty", (f) =>
      f
        .select("id", "employeeId", "designation")
        .include("user", (u) => u.select("id", "name", "email")),
    )
    .include("schedules", (sch) =>
      sch.select("id", "dayOfWeek", "startTime", "endTime", "room", "building"),
    )
    .include("enrollments", (e) =>
      e.include("student", (st) =>
        st
          .select(
            "id",
            "studentId",
            "currentYear",
            "currentSemester",
            "userId",
            "departmentId",
            "programId",
          )
          .include("user", (u) =>
            u.select("id", "name", "email", "phone", "photoUrl", "status"),
          )
          .include("department", (d) => d.select("id", "name", "code"))
          .include("program", (p) => p.select("id", "name", "code")),
      ),
    )
    .include("assignments", (a) =>
      a.select("id", "title", "description", "deadline", "totalMarks", "createdAt"),
    )
    .include("exams", (ex) =>
      ex.select("id", "title", "type", "examDate", "totalMarks"),
    )
    .first();

  if (!section) {
    throw new Error("Section not found.");
  }

  if (section.facultyId !== facultyId) {
    throw new Error("Forbidden: You do not teach this section.");
  }

  const activeEnrollments = (section.enrollments || []).filter(
    (e: any) => e.status === "ENROLLED",
  );

  const roster = activeEnrollments.map((e: any) => ({
    enrollmentId: e.id,
    enrolledAt: e.enrolledAt,
    status: e.status,
    student: e.student,
  }));

  return {
    meta: {
      id: section.id,
      name: section.name,
      capacity: section.capacity,
      enrolledCount: activeEnrollments.length,
      availableCapacity: Math.max(0, section.capacity - activeEnrollments.length),
      createdAt: section.createdAt,
      course: section.course,
      semester: section.semester,
      faculty: section.faculty,
    },
    schedules: section.schedules,
    roster,
    assignments: section.assignments,
    exams: section.exams,
  };
};

const recordAttendance = async (
  facultyId: string,
  sectionId: string,
  payload: RecordAttendancePayload,
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const section = await db.orm.public.Section.where({ id: sectionId }).first();
  if (!section) {
    throw new Error("Section not found.");
  }

  if (section.facultyId !== facultyId) {
    throw new Error("Forbidden: You do not teach this section.");
  }

  if (!payload.records || !Array.isArray(payload.records) || payload.records.length === 0) {
    throw new Error("Please provide an array of attendance records with studentId and status.");
  }

  // Validate that all students in records are enrolled in this section
  const enrollments = await db.orm.public.Enrollment.where({
    sectionId,
    status: "ENROLLED" as any,
  }).all();

  const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));
  const invalidStudents = payload.records.filter(
    (r) => !enrolledStudentIds.has(r.studentId),
  );

  if (invalidStudents.length > 0) {
    throw new Error(
      `Cannot record attendance. The following student IDs are not enrolled in this section: ${invalidStudents
        .map((s) => s.studentId)
        .join(", ")}`,
    );
  }

  const attendanceDate = toInstant(payload.date || new Date());

  const createdRecords = await Promise.all(
    payload.records.map((rec) =>
      db.orm.public.Attendance.create({
        studentId: rec.studentId,
        date: attendanceDate,
        status: rec.status.toUpperCase(),
      }),
    ),
  );

  return {
    sectionId,
    date: attendanceDate,
    totalRecorded: createdRecords.length,
    records: createdRecords,
  };
};

const correctAttendance = async (
  facultyId: string,
  attendanceId: string,
  payload: { status?: string; date?: string | Date },
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const attendance = await db.orm.public.Attendance.where({
    id: attendanceId,
  }).first();

  if (!attendance) {
    throw new Error("Attendance record not found.");
  }

  // Check if faculty teaches any section that this student is enrolled in
  const taughtSections = await db.orm.public.Section.where({ facultyId }).all();
  const sectionIds = taughtSections.map((s) => s.id);

  const enrollment = await db.orm.public.Enrollment.where((e) =>
    e.studentId.eq(attendance.studentId),
  )
    .where((e) => e.sectionId.in(sectionIds))
    .first();

  if (!enrollment) {
    throw new Error(
      "Forbidden: You are not authorized to correct attendance for this student.",
    );
  }

  const updateData: Record<string, any> = {};
  if (payload.status !== undefined) {
    updateData.status = payload.status.toUpperCase();
  }
  if (payload.date !== undefined) {
    updateData.date = toInstant(payload.date);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No update fields provided.");
  }

  const updated = await db.orm.public.Attendance.where({
    id: attendanceId,
  }).update(updateData);

  return updated;
};

const createAssignment = async (
  facultyId: string,
  payload: CreateAssignmentPayload,
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const { sectionId, title, description, deadline, totalMarks } = payload;

  if (!sectionId || !title || !deadline || totalMarks === undefined) {
    throw new Error("sectionId, title, deadline, and totalMarks are required.");
  }

  const section = await db.orm.public.Section.where({ id: sectionId }).first();
  if (!section) {
    throw new Error("Section not found.");
  }

  if (section.facultyId !== facultyId) {
    throw new Error("Forbidden: You do not teach this section.");
  }

  const assignment = await db.orm.public.Assignment.create({
    sectionId,
    facultyId,
    title,
    description: description || null,
    deadline: toInstant(deadline),
    totalMarks: Number(totalMarks),
  });

  return assignment;
};

const updateAssignment = async (
  facultyId: string,
  assignmentId: string,
  payload: UpdateAssignmentPayload,
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const assignment = await db.orm.public.Assignment.where({
    id: assignmentId,
  }).first();

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  if (assignment.facultyId !== facultyId) {
    throw new Error("Forbidden: You do not own this assignment.");
  }

  const updateData: Record<string, any> = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.deadline !== undefined)
    updateData.deadline = toInstant(payload.deadline);
  if (payload.totalMarks !== undefined)
    updateData.totalMarks = Number(payload.totalMarks);

  if (Object.keys(updateData).length === 0) {
    throw new Error("No update fields provided.");
  }

  const updated = await db.orm.public.Assignment.where({
    id: assignmentId,
  }).update(updateData);

  return updated;
};

const getAssignmentSubmissions = async (
  facultyId: string,
  assignmentId: string,
  filterStatus?: string,
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const assignment = await db.orm.public.Assignment.where({ id: assignmentId })
    .include("section", (s) =>
      s
        .select("id", "name", "courseId")
        .include("course", (c) => c.select("id", "code", "title")),
    )
    .first();

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  if (assignment.facultyId !== facultyId) {
    throw new Error("Forbidden: You do not own this assignment.");
  }

  const submissions = await db.orm.public.AssignmentSubmission.where({
    assignmentId,
  })
    .include("student", (st) =>
      st
        .select("id", "studentId", "userId")
        .include("user", (u) =>
          u.select("id", "name", "email", "photoUrl", "phone"),
        )
        .include("department", (d) => d.select("id", "name", "code")),
    )
    .all();

  let formatted = submissions.map((sub: any) => {
    const isGraded = sub.marks !== null && sub.marks !== undefined;
    return {
      ...sub,
      gradingStatus: isGraded ? "GRADED" : "PENDING",
    };
  });

  if (filterStatus) {
    formatted = formatted.filter(
      (s: any) => s.gradingStatus === filterStatus.toUpperCase(),
    );
  }

  const gradedCount = formatted.filter((s) => s.gradingStatus === "GRADED").length;
  const pendingCount = formatted.length - gradedCount;
  const totalMarks = formatted.reduce((acc, s) => acc + (s.marks || 0), 0);
  const averageMarks =
    gradedCount > 0 ? (totalMarks / gradedCount).toFixed(2) : "0.00";

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      totalMarks: assignment.totalMarks,
      section: assignment.section,
    },
    summary: {
      totalSubmissions: formatted.length,
      gradedCount,
      pendingCount,
      averageMarks,
    },
    submissions: formatted,
  };
};

const postResult = async (facultyId: string, payload: PostResultPayload) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const { studentId, enrollmentId, sectionId, examId, marks } = payload;

  if (marks === undefined || marks === null || isNaN(Number(marks))) {
    throw new Error("A valid numeric mark is required.");
  }

  let enrollment: any;

  if (enrollmentId) {
    enrollment = await db.orm.public.Enrollment.where({ id: enrollmentId })
      .include("section", (s) => s.select("id", "facultyId", "courseId"))
      .first();
  } else if (sectionId && studentId) {
    enrollment = await db.orm.public.Enrollment.where({
      sectionId,
      studentId,
    })
      .include("section", (s) => s.select("id", "facultyId", "courseId"))
      .first();
  } else {
    throw new Error(
      "Either enrollmentId or both sectionId and studentId must be provided.",
    );
  }

  if (!enrollment) {
    throw new Error("Student enrollment record not found.");
  }

  if (enrollment.section?.facultyId !== facultyId) {
    throw new Error(
      "Forbidden: You can only post results for students enrolled in sections you teach.",
    );
  }

  if (examId) {
    const exam = await db.orm.public.Exam.where({ id: examId }).first();
    if (!exam || exam.sectionId !== enrollment.sectionId) {
      throw new Error("Exam not found in this section.");
    }
  }

  // Calculate grade and gradePoint if not explicitly given
  let grade = payload.grade;
  let gradePoint = payload.gradePoint;
  if (!grade || gradePoint === undefined) {
    const calculated = calculateGrade(Number(marks));
    if (!grade) grade = calculated.grade;
    if (gradePoint === undefined) gradePoint = calculated.gradePoint;
  }

  // Check if result already exists for this enrollment
  const existingResult = await db.orm.public.Result.where({
    enrollmentId: enrollment.id,
  }).first();

  if (existingResult) {
    throw new Error(
      `A result has already been posted for this enrollment (Result ID: ${existingResult.id}). Use PATCH /faculty/results/:id to correct it.`,
    );
  }

  const result = await db.orm.public.Result.create({
    studentId: enrollment.studentId,
    enrollmentId: enrollment.id,
    examId: examId || null,
    marks: Number(marks),
    grade,
    gradePoint: Number(gradePoint),
  });

  return result;
};

const correctResult = async (
  facultyId: string,
  resultId: string,
  payload: UpdateResultPayload,
) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const result = await db.orm.public.Result.where({ id: resultId })
    .include("enrollment", (e) =>
      e.include("section", (s) => s.select("id", "facultyId")),
    )
    .first();

  if (!result) {
    throw new Error("Result record not found.");
  }

  if (result.enrollment?.section?.facultyId !== facultyId) {
    throw new Error(
      "Forbidden: You cannot modify results for a section you do not teach.",
    );
  }

  const updateData: Record<string, any> = {};

  if (payload.marks !== undefined) {
    const numericMarks = Number(payload.marks);
    updateData.marks = numericMarks;

    if (payload.grade === undefined || payload.gradePoint === undefined) {
      const calculated = calculateGrade(numericMarks);
      if (payload.grade === undefined) updateData.grade = calculated.grade;
      if (payload.gradePoint === undefined)
        updateData.gradePoint = calculated.gradePoint;
    }
  }

  if (payload.grade !== undefined) updateData.grade = payload.grade;
  if (payload.gradePoint !== undefined)
    updateData.gradePoint = Number(payload.gradePoint);

  if (Object.keys(updateData).length === 0) {
    throw new Error("No update fields provided.");
  }

  const updated = await db.orm.public.Result.where({ id: resultId }).update(
    updateData,
  );

  return updated;
};

const createExam = async (facultyId: string, payload: CreateExamPayload) => {
  if (!facultyId) {
    throw new Error("Faculty profile record not found.");
  }

  const { sectionId, title, type, examDate, totalMarks } = payload;

  if (!sectionId || !title || !type || !examDate || totalMarks === undefined) {
    throw new Error(
      "sectionId, title, type (MIDTERM, FINAL, QUIZ, PRACTICAL), examDate, and totalMarks are required.",
    );
  }

  const allowedTypes = ["MIDTERM", "FINAL", "QUIZ", "PRACTICAL"];
  if (!allowedTypes.includes(type.toUpperCase())) {
    throw new Error(
      `Invalid exam type. Allowed types are: ${allowedTypes.join(", ")}`,
    );
  }

  const section = await db.orm.public.Section.where({ id: sectionId }).first();
  if (!section) {
    throw new Error("Section not found.");
  }

  if (section.facultyId !== facultyId) {
    throw new Error("Forbidden: You do not teach this section.");
  }

  const exam = await db.orm.public.Exam.create({
    sectionId,
    facultyId,
    title,
    type: type.toUpperCase() as any,
    examDate: toInstant(examDate),
    totalMarks: Number(totalMarks),
  });

  return exam;
};

export const facultyService = {
  getProfile,
  updateProfile,
  getMySections,
  getMyStudents,
  getSectionDetail,
  recordAttendance,
  correctAttendance,
  createAssignment,
  updateAssignment,
  getAssignmentSubmissions,
  postResult,
  correctResult,
  createExam,
};
