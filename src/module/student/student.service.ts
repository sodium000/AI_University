import { db } from "../../prisma/db";
import { Temporal } from "@js-temporal/polyfill";

const toInstant = (d?: Date | string | null) => {
  if (!d) return Temporal.Now.instant();
  return Temporal.Instant.from(new Date(d).toISOString());
};

interface UpdateProfilePayload {
  phone?: string;
  photoUrl?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  address?: string;
}

const getProfile = async (userId: string) => {
  const student = await db.orm.public.Student.where({ userId })
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
    .include("program", (p) =>
      p.select("id", "name", "code", "durationYears", "totalCredits"),
    )
    .first();

  if (!student) {
    const user = await db.orm.public.User.where({ id: userId })
      .select("id", "name", "email", "phone", "photoUrl", "role", "status")
      .first();

    return {
      isProfileComplete: false,
      message: "Student record has not been configured by administration yet.",
      user,
    };
  }

  return {
    isProfileComplete: true,
    ...student,
  };
};

const updateProfile = async (
  userId: string,
  studentId: string,
  payload: UpdateProfilePayload,
) => {
  const { phone, photoUrl, dateOfBirth, gender, address } = payload;

  if (phone !== undefined || photoUrl !== undefined) {
    const userUpdate: Record<string, any> = {};
    if (phone !== undefined) userUpdate.phone = phone;
    if (photoUrl !== undefined) userUpdate.photoUrl = photoUrl;

    await db.orm.public.User.where({ id: userId }).update(userUpdate);
  }

  if (studentId) {
    const studentUpdate: Record<string, any> = {};
    if (dateOfBirth !== undefined)
      studentUpdate.dateOfBirth = toInstant(dateOfBirth);
    if (gender !== undefined) studentUpdate.gender = gender;
    if (address !== undefined) studentUpdate.address = address;

    if (Object.keys(studentUpdate).length > 0) {
      await db.orm.public.Student.where({ id: studentId }).update(
        studentUpdate,
      );
    }
  }

  return getProfile(userId);
};

const getEnrolledCourses = async (studentId: string, status?: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  let query = db.orm.public.Enrollment.where((e) => e.studentId.eq(studentId));

  if (status) {
    query = query.where((e) => e.status.eq(status as any));
  }

  const enrollments = await query
    .include("section", (s) =>
      s
        .include("course", (c) =>
          c.select("id", "code", "title", "description", "credit"),
        )
        .include("semester", (sem) =>
          sem.select("id", "name", "year", "status", "startDate", "endDate"),
        )
        .include("faculty", (f) =>
          f.include("user", (u) => u.select("id", "name", "email")),
        ),
    )
    .orderBy((e) => e.enrolledAt.desc())
    .all();

  return enrollments;
};

const getSchedule = async (studentId: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  const activeEnrollments = await db.orm.public.Enrollment.where({
    studentId,
    status: "ENROLLED" as any,
  }).all();

  const sectionIds = activeEnrollments.map((e) => e.sectionId);

  if (sectionIds.length === 0) {
    return {
      classSchedules: [],
      examSchedules: [],
    };
  }

  const classSchedules = await db.orm.public.ClassSchedule.where((cs) =>
    cs.sectionId.in(sectionIds),
  )
    .include("section", (s) =>
      s
        .include("course", (c) => c.select("id", "code", "title"))
        .include("semester", (sem) => sem.select("id", "name")),
    )
    .all();

  const examSchedules = await db.orm.public.Exam.where((ex) =>
    ex.sectionId.in(sectionIds),
  )
    .include("section", (s) =>
      s.include("course", (c) => c.select("id", "code", "title")),
    )
    .orderBy((ex) => ex.examDate.asc())
    .all();

  return {
    classSchedules,
    examSchedules,
  };
};

const enrollCourse = async (studentId: string, sectionId: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }
  if (!sectionId) {
    throw new Error("sectionId is required.");
  }

  const section = await db.orm.public.Section.where({ id: sectionId })
    .include("course")
    .include("semester")
    .first();

  if (!section) {
    throw new Error("Section not found.");
  }

  // Check section capacity
  const currentEnrollments = await db.orm.public.Enrollment.where({
    sectionId,
    status: "ENROLLED" as any,
  }).all();

  if (currentEnrollments.length >= section.capacity) {
    throw new Error(
      `Section capacity reached (${section.capacity}/${section.capacity}).`,
    );
  }

  // Check existing enrollment in this section
  const existing = await db.orm.public.Enrollment.where({
    studentId,
    sectionId,
  }).first();

  if (existing) {
    if (existing.status === "ENROLLED") {
      throw new Error("You are already enrolled in this section.");
    }
    // Re-enroll if previously dropped
    const updated = await db.orm.public.Enrollment.where({
      id: existing.id,
    }).update({
      status: "ENROLLED" as any,
      enrolledAt: toInstant(),
    });
    return updated;
  }

  // Check if enrolled in another section of the same course in the same semester
  const activeStudentEnrollments = await db.orm.public.Enrollment.where({
    studentId,
    status: "ENROLLED" as any,
  })
    .include("section", (s) => s.select("id", "courseId", "semesterId"))
    .all();

  const isSameCourseEnrolled = activeStudentEnrollments.some(
    (e: any) =>
      e.section?.courseId === section.courseId &&
      e.section?.semesterId === section.semesterId,
  );

  if (isSameCourseEnrolled) {
    throw new Error(
      "You are already enrolled in another section of this course for this semester.",
    );
  }

  // Create new enrollment
  const enrollment = await db.orm.public.Enrollment.create({
    studentId,
    sectionId,
    status: "ENROLLED" as any,
    enrolledAt: toInstant(),
  });

  return enrollment;
};

const dropEnrollment = async (
  studentId: string,
  enrollmentOrSectionId: string,
) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  let enrollment = await db.orm.public.Enrollment.where({
    id: enrollmentOrSectionId,
    studentId,
  }).first();

  if (!enrollment) {
    enrollment = await db.orm.public.Enrollment.where({
      sectionId: enrollmentOrSectionId,
      studentId,
    }).first();
  }

  if (!enrollment) {
    throw new Error("Enrollment record not found.");
  }

  if (enrollment.status === "DROPPED") {
    throw new Error("This enrollment has already been dropped.");
  }

  const updated = await db.orm.public.Enrollment.where({
    id: enrollment.id,
  }).update({
    status: "DROPPED" as any,
  });

  return updated;
};

const getAttendance = async (
  studentId: string,
  filters?: { status?: string; startDate?: string; endDate?: string },
) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  let query = db.orm.public.Attendance.where((a) => a.studentId.eq(studentId));

  if (filters?.status) {
    query = query.where((a) => a.status.eq(filters.status!));
  }

  if (filters?.startDate) {
    query = query.where((a) => a.date.gte(toInstant(filters.startDate!)));
  }

  if (filters?.endDate) {
    query = query.where((a) => a.date.lte(toInstant(filters.endDate!)));
  }

  const records = await query.orderBy((a) => a.date.desc()).all();

  const total = records.length;
  const present = records.filter(
    (r) => r.status.toUpperCase() === "PRESENT",
  ).length;
  const absent = records.filter(
    (r) => r.status.toUpperCase() === "ABSENT",
  ).length;
  const late = records.filter(
    (r) => r.status.toUpperCase() === "LATE",
  ).length;

  const percentage =
    total > 0 ? ((present / total) * 100).toFixed(2) + "%" : "N/A";

  return {
    summary: {
      total,
      present,
      absent,
      late,
      percentage,
    },
    records,
  };
};

const getResults = async (studentId: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  const results = await db.orm.public.Result.where({ studentId })
    .include("enrollment", (e) =>
      e.include("section", (s) =>
        s
          .include("course", (c) =>
            c.select("id", "code", "title", "credit"),
          )
          .include("semester", (sem) =>
            sem.select("id", "name", "year", "status"),
          ),
      ),
    )
    .include("exam", (ex) => ex.select("id", "title", "type", "totalMarks"))
    .all();

  return results;
};

const getTranscript = async (studentId: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  const student = await db.orm.public.Student.where({ id: studentId })
    .include("user", (u) => u.select("id", "name", "email"))
    .include("department", (d) => d.select("name", "code"))
    .include("program", (p) =>
      p.select("name", "code", "totalCredits", "durationYears"),
    )
    .first();

  const results = await db.orm.public.Result.where({ studentId })
    .include("enrollment", (e) =>
      e.include("section", (s) =>
        s
          .include("course", (c) =>
            c.select("id", "code", "title", "credit"),
          )
          .include("semester", (sem) =>
            sem.select("id", "name", "year", "status"),
          ),
      ),
    )
    .all();

  // Group by semester
  const semesterMap = new Map<
    string,
    {
      semesterName: string;
      semesterYear: number;
      courses: any[];
      semesterCreditsAttempted: number;
      semesterCreditsEarned: number;
      totalWeightedGradePoints: number;
    }
  >();

  let totalCreditsAttempted = 0;
  let totalCreditsEarned = 0;
  let totalWeightedPoints = 0;

  for (const r of results as any[]) {
    const course = r.enrollment?.section?.course;
    const semester = r.enrollment?.section?.semester;

    const semKey = semester ? semester.id : "unknown";
    const semName = semester ? semester.name : "Other";
    const semYear = semester ? semester.year : 0;
    const credit = course ? Number(course.credit) : 0;
    const gradePoint = Number(r.gradePoint);

    if (!semesterMap.has(semKey)) {
      semesterMap.set(semKey, {
        semesterName: semName,
        semesterYear: semYear,
        courses: [],
        semesterCreditsAttempted: 0,
        semesterCreditsEarned: 0,
        totalWeightedGradePoints: 0,
      });
    }

    const semGroup = semesterMap.get(semKey)!;
    semGroup.courses.push({
      courseCode: course?.code,
      courseTitle: course?.title,
      credit,
      marks: r.marks,
      grade: r.grade,
      gradePoint,
    });

    semGroup.semesterCreditsAttempted += credit;
    if (gradePoint > 0) {
      semGroup.semesterCreditsEarned += credit;
    }
    semGroup.totalWeightedGradePoints += credit * gradePoint;

    totalCreditsAttempted += credit;
    if (gradePoint > 0) {
      totalCreditsEarned += credit;
    }
    totalWeightedPoints += credit * gradePoint;
  }

  const semesters = Array.from(semesterMap.values()).map((sem) => {
    const sgpa =
      sem.semesterCreditsAttempted > 0
        ? Number(
            (
              sem.totalWeightedGradePoints / sem.semesterCreditsAttempted
            ).toFixed(2),
          )
        : 0;

    return {
      semesterName: sem.semesterName,
      semesterYear: sem.semesterYear,
      creditsAttempted: sem.semesterCreditsAttempted,
      creditsEarned: sem.semesterCreditsEarned,
      sgpa,
      courses: sem.courses,
    };
  });

  const cgpa =
    totalCreditsAttempted > 0
      ? Number((totalWeightedPoints / totalCreditsAttempted).toFixed(2))
      : 0;

  return {
    student: {
      id: student?.id,
      studentId: student?.studentId,
      name: (student as any)?.user?.name,
      email: (student as any)?.user?.email,
      department: (student as any)?.department,
      program: (student as any)?.program,
      admissionYear: student?.admissionYear,
      currentYear: student?.currentYear,
      currentSemester: student?.currentSemester,
    },
    academicSummary: {
      totalCreditsAttempted,
      totalCreditsEarned,
      cgpa,
      completedSemesters: semesters.length,
    },
    semesters,
  };
};

const getAssignments = async (studentId: string, status?: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  const activeEnrollments = await db.orm.public.Enrollment.where({
    studentId,
    status: "ENROLLED" as any,
  }).all();

  const sectionIds = activeEnrollments.map((e) => e.sectionId);

  if (sectionIds.length === 0) {
    return [];
  }

  const assignments = await db.orm.public.Assignment.where((a) =>
    a.sectionId.in(sectionIds),
  )
    .include("section", (s) =>
      s.include("course", (c) => c.select("id", "code", "title")),
    )
    .include("faculty", (f) =>
      f.include("user", (u) => u.select("id", "name")),
    )
    .orderBy((a) => a.deadline.asc())
    .all();

  const assignmentIds = assignments.map((a) => a.id);

  const submissions = await db.orm.public.AssignmentSubmission.where((sub) =>
    sub.studentId.eq(studentId),
  ).all();

  const submissionMap = new Map<string, any>();
  for (const s of submissions) {
    submissionMap.set(s.assignmentId, s);
  }

  const result = assignments.map((a: any) => {
    const submission = submissionMap.get(a.id);
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      deadline: a.deadline,
      totalMarks: a.totalMarks,
      course: a.section?.course,
      facultyName: a.faculty?.user?.name,
      submissionStatus: submission ? "SUBMITTED" : "PENDING",
      submission: submission
        ? {
            id: submission.id,
            fileUrl: submission.fileUrl,
            submittedAt: submission.submittedAt,
            marks: submission.marks,
            feedback: submission.feedback,
          }
        : null,
    };
  });

  if (status) {
    return result.filter(
      (item) =>
        item.submissionStatus.toUpperCase() === status.toUpperCase(),
    );
  }

  return result;
};

const submitAssignment = async (
  studentId: string,
  assignmentId: string,
  payload: { fileUrl: string },
) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }
  if (!payload.fileUrl) {
    throw new Error("fileUrl is required.");
  }

  const assignment = await db.orm.public.Assignment.where({
    id: assignmentId,
  }).first();

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  // Verify student is enrolled in the section for this assignment
  const enrollment = await db.orm.public.Enrollment.where({
    studentId,
    sectionId: assignment.sectionId,
    status: "ENROLLED" as any,
  }).first();

  if (!enrollment) {
    throw new Error(
      "You are not enrolled in the course section for this assignment.",
    );
  }

  const existingSubmission =
    await db.orm.public.AssignmentSubmission.where({
      assignmentId,
      studentId,
    }).first();

  if (existingSubmission) {
    const updated = await db.orm.public.AssignmentSubmission.where({
      id: existingSubmission.id,
    }).update({
      fileUrl: payload.fileUrl,
      submittedAt: toInstant(),
    });
    return updated;
  }

  const newSubmission = await db.orm.public.AssignmentSubmission.create({
    assignmentId,
    studentId,
    fileUrl: payload.fileUrl,
    submittedAt: toInstant(),
  });

  return newSubmission;
};

const getInvoices = async (studentId: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  const invoices = await db.orm.public.Invoice.where({ studentId })
    .include("payments", (p) => p.orderBy((pay) => pay.createdAt.desc()))
    .orderBy((i) => i.createdAt.desc())
    .all();

  return invoices;
};

const getPayments = async (studentId: string) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }

  const invoices = await db.orm.public.Invoice.where({ studentId }).all();
  const invoiceIds = invoices.map((i) => i.id);

  if (invoiceIds.length === 0) {
    return [];
  }

  const payments = await db.orm.public.Payment.where((p) =>
    p.invoiceId.in(invoiceIds),
  )
    .include("invoice", (i) =>
      i.select("id", "invoiceNo", "amount", "dueDate", "status"),
    )
    .orderBy((p) => p.createdAt.desc())
    .all();

  return payments;
};

const getNotifications = async (userId: string, unreadOnly?: boolean) => {
  let query = db.orm.public.Notification.where((n) => n.userId.eq(userId));

  if (unreadOnly) {
    query = query.where((n) => n.isRead.eq(false));
  }

  const notifications = await query
    .orderBy((n) => n.createdAt.desc())
    .all();

  const allNotifications = await db.orm.public.Notification.where((n) =>
    n.userId.eq(userId),
  ).all();

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  return {
    unreadCount,
    notifications,
  };
};

export const studentService = {
  getProfile,
  updateProfile,
  getEnrolledCourses,
  getSchedule,
  enrollCourse,
  dropEnrollment,
  getAttendance,
  getResults,
  getTranscript,
  getAssignments,
  submitAssignment,
  getInvoices,
  getPayments,
  getNotifications,
};
