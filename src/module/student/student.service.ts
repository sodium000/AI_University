import { db } from "../../prisma/db";
import { Temporal } from "@js-temporal/polyfill";
import config from "../../config";
import { stripe } from "../../config/stripe";
import { AppError } from "../../errors/AppError";
import { ErrorCode } from "../../errors/errorCodes";

const toInstant = (d?: Date | string | Temporal.Instant | null) => {
  if (!d) return Temporal.Now.instant();
  if (d instanceof Date) {
    return Temporal.Instant.from(d.toISOString());
  }
  return Temporal.Instant.from(String(d));
};

interface UpdateProfilePayload {
  phone?: string;
  photoUrl?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  address?: string;
}

export interface CreateStudentProfilePayload {
  departmentId: string;
  programId: string;
  studentId?: string;
  admissionYear?: number;
  currentYear?: number;
  currentSemester?: number;
  dateOfBirth?: string | Date;
  gender?: string;
  address?: string;
  phone?: string;
  photoUrl?: string;
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

const createProfile = async (
  userId: string,
  payload: CreateStudentProfilePayload,
) => {
  const existingStudent = await db.orm.public.Student.where({ userId }).first();
  if (existingStudent) {
    throw new Error("Student profile already exists for this user account.");
  }

  if (!payload.departmentId || !payload.programId) {
    throw new Error("Both departmentId and programId are required.");
  }

  const [dept, prog] = await Promise.all([
    db.orm.public.Department.where({ id: payload.departmentId }).first(),
    db.orm.public.Program.where({ id: payload.programId }).first(),
  ]);

  if (!dept)
    throw new Error("Department not found with provided departmentId.");
  if (!prog) throw new Error("Program not found with provided programId.");

  let studentId = payload.studentId;
  if (!studentId) {
    const admissionYear =
      Number(payload.admissionYear) || new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    studentId = `STU${admissionYear}${randomSuffix}`;
  } else {
    const duplicate = await db.orm.public.Student.where({ studentId }).first();
    if (duplicate) {
      throw new Error(`Student with studentId '${studentId}' already exists.`);
    }
  }

  if (payload.phone !== undefined || payload.photoUrl !== undefined) {
    const userUpdate: Record<string, any> = {};
    if (payload.phone !== undefined) userUpdate.phone = payload.phone;
    if (payload.photoUrl !== undefined) userUpdate.photoUrl = payload.photoUrl;
    if (Object.keys(userUpdate).length > 0) {
      await db.orm.public.User.where({ id: userId }).update(userUpdate);
    }
  }

  await db.orm.public.Student.create({
    userId,
    studentId,
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

  return getProfile(userId);
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

const getAvailableSections = async () => {
  const activeSemesters = await db.orm.public.Semester.where({
    status: "ACTIVE",
  }).all();
  const activeSemesterIds = activeSemesters.map((semester) => semester.id);

  if (activeSemesterIds.length === 0) return [];

  const sections = await db.orm.public.Section.where((section) =>
    section.semesterId.in(activeSemesterIds),
  )
    .include("course", (course) =>
      course
        .select("id", "code", "title", "description", "credit")
        .include("department", (department) => department.select("code")),
    )
    .include("semester", (semester) =>
      semester.select("id", "name", "year", "status", "startDate", "endDate"),
    )
    .include("faculty", (faculty) =>
      faculty.include("user", (user) => user.select("id", "name", "email")),
    )
    .include("schedules", (schedule) =>
      schedule.select("dayOfWeek", "startTime", "endTime", "room", "building"),
    )
    .include("enrollments", (enrollment) => enrollment.select("id", "status"))
    .all();

  return sections.map((section: any) => {
    const schedules = section.schedules ?? [];
    const enrolledCount = (section.enrollments ?? []).filter(
      (enrollment: any) => enrollment.status === "ENROLLED",
    ).length;
    const schedule = schedules
      .map((item: any) => item.dayOfWeek + " " + item.startTime + " - " + item.endTime)
      .join(", ");
    const firstSchedule = schedules[0];

    return {
      id: section.id,
      name: section.name,
      courseId: section.courseId,
      semesterId: section.semesterId,
      facultyId: section.facultyId,
      capacity: section.capacity,
      enrolledCount,
      schedule,
      room: firstSchedule
        ? [firstSchedule.room, firstSchedule.building].filter(Boolean).join(", ")
        : "",
      course: {
        ...section.course,
        department: section.course?.department?.code ?? "",
      },
      semester: section.semester,
      faculty: section.faculty,
    };
  });
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

const invoiceNoForEnrollment = (
  enrollmentId: string,
  enrolledAt: Date | string | Temporal.Instant,
) => {
  const instant = toInstant(enrolledAt);
  const year = instant.toZonedDateTimeISO("UTC").year;
  return `INV-${year}-${enrollmentId}-${instant.epochMilliseconds}`;
};

const invoiceDataForEnrollment = (
  studentId: string,
  section: any,
  enrollmentId: string,
  enrolledAt: Date | string | Temporal.Instant,
) => {
  const credit = Number(section?.course?.credit || 3);
  const amount = credit > 0 ? credit * 500 : 1500;

  // 30 days due date or semester end date, whichever comes first (if in the future)
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let dueDateInstant = toInstant(defaultDueDate);

  if (section?.semester?.endDate) {
    const semesterEnd = toInstant(section.semester.endDate);
    if (
      Temporal.Instant.compare(semesterEnd, Temporal.Now.instant()) > 0 &&
      Temporal.Instant.compare(semesterEnd, dueDateInstant) < 0
    ) {
      dueDateInstant = semesterEnd;
    }
  }

  return {
    studentId,
    invoiceNo: invoiceNoForEnrollment(enrollmentId, enrolledAt),
    amount,
    dueDate: dueDateInstant,
    status: "PENDING" as any,
    createdAt: toInstant(),
  };
};

const notifyInvoiceCreated = async (
  studentId: string,
  section: any,
  invoice: { invoiceNo: string; amount: number },
) => {
  // Also send a notification to the student about the new invoice
  try {
    const student = await db.orm.public.Student.where({
      id: studentId,
    }).first();
    if (student?.userId) {
      const courseTitle =
        section?.course?.title || section?.name || "course section";
      const courseCode = section?.course?.code
        ? ` (${section.course.code})`
        : "";
      await db.orm.public.Notification.create({
        userId: student.userId,
        title: "New Tuition Fee Invoice Issued",
        message: `An invoice #${invoice.invoiceNo} of BDT ${invoice.amount} has been issued for enrolling in ${courseTitle}${courseCode}. Please settle the payment by the due date.`,
        type: "INFO" as any,
        isRead: false,
        createdAt: toInstant(),
      });
    }
  } catch (err) {
    console.error("Failed to create notification for invoice:", err);
  }
};

const createInvoiceForEnrollment = async (
  studentId: string,
  section: any,
  enrollmentId: string,
  enrolledAt: Date | string | Temporal.Instant,
) => {
  const invoiceNo = invoiceNoForEnrollment(enrollmentId, enrolledAt);
  const existingInvoice = await db.orm.public.Invoice.where({
    invoiceNo,
  }).first();
  if (existingInvoice) {
    return existingInvoice;
  }

  let invoice;
  try {
    invoice = await db.orm.public.Invoice.create(
      invoiceDataForEnrollment(studentId, section, enrollmentId, enrolledAt),
    );
  } catch (error) {
    const invoiceAfterConflict = await db.orm.public.Invoice.where({
      invoiceNo,
    }).first();
    if (!invoiceAfterConflict) {
      throw error;
    }
    return invoiceAfterConflict;
  }
  await notifyInvoiceCreated(studentId, section, invoice);

  return invoice;
};

const serializeEnrollment = (enrollment: {
  id: string;
  studentId: string;
  sectionId: string;
  status: string;
  enrolledAt?: Date | string | Temporal.Instant | null;
}) => ({
  id: enrollment.id,
  studentId: enrollment.studentId,
  sectionId: enrollment.sectionId,
  status: enrollment.status,
  enrolledAt: enrollment.enrolledAt
    ? toInstant(enrollment.enrolledAt).toString()
    : new Date().toISOString(),
});

const enrollCourse = async (studentId: string, sectionId: string) => {
  if (!studentId) {
    throw AppError.unauthorized(
      "Student profile record not found.",
      ErrorCode.AUTH_CONTEXT_MISSING,
    );
  }

  const normalizedSectionId = typeof sectionId === "string" ? sectionId.trim() : "";
  if (!normalizedSectionId) {
    throw AppError.badRequest("sectionId is required.", ErrorCode.BAD_REQUEST, {
      details: { field: "sectionId" },
      hint: "Send a valid sectionId in the request body.",
    });
  }

  const section = await db.orm.public.Section.where({ id: normalizedSectionId })
    .include("course")
    .include("semester")
    .first();

  if (!section) {
    throw AppError.notFound("Section not found.", ErrorCode.NOT_FOUND, {
      details: { field: "sectionId", value: normalizedSectionId },
      hint: "Use a valid section UUID that exists in the system.",
    });
  }

  const existing = await db.orm.public.Enrollment.where({
    studentId,
    sectionId: normalizedSectionId,
  }).first();

  if (existing) {
    if (existing.status === "ENROLLED") {
      await createInvoiceForEnrollment(
        studentId,
        section,
        existing.id,
        existing.enrolledAt,
      );

      return serializeEnrollment(existing);
    }

    const enrolledAt = toInstant();
    const { enrollment, invoice } = await db.transaction(async (tx) => {
      await tx.orm.public.Enrollment.where({ id: existing.id }).update({
        status: "ENROLLED" as any,
        enrolledAt,
      });
      const invoiceNo = invoiceNoForEnrollment(existing.id, enrolledAt.toString());
      const previousInvoice = await tx.orm.public.Invoice.where({
        invoiceNo,
      }).first();
      const invoice =
        previousInvoice ??
        (await tx.orm.public.Invoice.create(
          invoiceDataForEnrollment(
            studentId,
            section,
            existing.id,
            enrolledAt.toString(),
          ),
        ));
      return {
        enrollment: {
          id: existing.id,
          studentId,
          sectionId: normalizedSectionId,
          status: "ENROLLED",
          enrolledAt: enrolledAt.toString(),
        },
        invoice,
      };
    });
    await notifyInvoiceCreated(studentId, section, invoice);
    return serializeEnrollment(enrollment);
  }

  const currentEnrollments = await db.orm.public.Enrollment.where({
    sectionId: normalizedSectionId,
    status: "ENROLLED" as any,
  }).all();

  if (currentEnrollments.length >= section.capacity) {
    throw AppError.badRequest(
      `Section is full. Capacity reached for section ${normalizedSectionId}.`,
      ErrorCode.BAD_REQUEST,
      {
        details: {
          field: "sectionId",
          sectionId: normalizedSectionId,
          capacity: section.capacity,
        },
        hint: "Choose another section or wait for a seat to open up.",
      },
    );
  }

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
    throw AppError.conflict(
      "You are already enrolled in another section of this course for this semester.",
      ErrorCode.CONFLICT,
      {
        details: {
          studentId,
          courseId: section.courseId,
          semesterId: section.semesterId,
        },
      },
    );
  }

  const enrolledAt = toInstant();
  const { enrollment, invoice } = await db.transaction(async (tx) => {
    const enrollment = await tx.orm.public.Enrollment.create({
      studentId,
      sectionId: normalizedSectionId,
      status: "ENROLLED" as any,
      enrolledAt,
    });
    const invoice = await tx.orm.public.Invoice.create(
      invoiceDataForEnrollment(
        studentId,
        section,
        enrollment.id,
        enrolledAt.toString(),
      ),
    );
    return { enrollment, invoice };
  });
  await notifyInvoiceCreated(studentId, section, invoice);

  return serializeEnrollment(enrollment);
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
  const late = records.filter((r) => r.status.toUpperCase() === "LATE").length;

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
          .include("course", (c) => c.select("id", "code", "title", "credit"))
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
          .include("course", (c) => c.select("id", "code", "title", "credit"))
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
    .include("faculty", (f) => f.include("user", (u) => u.select("id", "name")))
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
      (item) => item.submissionStatus.toUpperCase() === status.toUpperCase(),
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

  const existingSubmission = await db.orm.public.AssignmentSubmission.where({
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

  return db.orm.public.Invoice.where({ studentId })
    .orderBy((i) => i.createdAt.desc())
    .all();
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

  const notifications = await query.orderBy((n) => n.createdAt.desc()).all();

  const allNotifications = await db.orm.public.Notification.where((n) =>
    n.userId.eq(userId),
  ).all();

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  return {
    unreadCount,
    notifications,
  };
};

const createPaymentCheckoutSession = async (
  studentId: string,
  invoiceId: string,
) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }
  if (!invoiceId) {
    throw new Error("invoiceId is required.");
  }

  // 1. Fetch the invoice
  const invoice = await db.orm.public.Invoice.where({
    id: invoiceId,
    studentId,
  }).first();

  if (!invoice) {
    throw new Error("Invoice not found or unauthorized.");
  }
  if (invoice.status === "PAID") {
    throw new Error("This invoice is already paid.");
  }
  if (invoice.status === "CANCELLED") {
    throw new Error("Cannot pay a cancelled invoice.");
  }
  const invoiceAmount = Number(invoice.amount);
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
    throw AppError.badRequest(
      "This invoice has an invalid amount and cannot be paid.",
      ErrorCode.BAD_REQUEST,
      { details: { invoiceId: invoice.id, amount: invoice.amount } },
    );
  }

  const student = await db.orm.public.Student.where({
    id: studentId,
  })
    .include("user", (u) => u.select("email"))
    .first();
  const customerEmail = student?.user?.email;

  const frontendUrl = (process.env.FRONTEND_URL || "https://frontenduniversity.vercel.app")
    .replace(/\/+$/, "");

  // Dynamic line item based on invoice amount
  const line_items = [
    {
      price_data: {
        currency: "bdt",
        product_data: {
          name: `Tuition / Fee - Invoice #${invoice.invoiceNo}`,
          description: `University fee payment for invoice #${invoice.invoiceNo}`,
        },
        unit_amount: Math.round(invoiceAmount * 100),
      },
      quantity: 1,
    },
  ];

  // 2. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customerEmail,
    line_items,
    metadata: {
      invoiceId: invoice.id,
      studentId,
    },
    success_url: `${frontendUrl}/student/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/student/payments/cancel?invoice_id=${invoice.id}`,
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
};

const verifyAndFulfillPayment = async (
  sessionId: string,
  expectedStudentId?: string,
) => {
  if (!sessionId) {
    throw new Error("sessionId is required.");
  }

  // 1. Retrieve session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new Error("Payment has not been completed on Stripe.");
  }

  const invoiceId = session.metadata?.invoiceId;
  const studentId = session.metadata?.studentId;

  if (!invoiceId || !studentId) {
    throw AppError.badRequest(
      "Stripe session is missing invoice or student metadata.",
      ErrorCode.BAD_REQUEST,
    );
  }
  if (expectedStudentId && studentId !== expectedStudentId) {
    throw AppError.forbidden(
      "This checkout session belongs to a different student.",
      ErrorCode.FORBIDDEN,
    );
  }

  const invoice = await db.orm.public.Invoice.where({
    id: invoiceId,
    studentId,
  }).first();
  if (!invoice) {
    throw AppError.notFound(
      "The invoice associated with this checkout session was not found.",
      ErrorCode.NOT_FOUND,
    );
  }

  const transactionId = (session.payment_intent as string) || session.id;

  // 2. Check if payment was already recorded
  const existingPayment = await db.orm.public.Payment.where({
    transactionId,
  }).first();

  if (existingPayment) {
    if (invoice.status !== "PAID") {
      await db.orm.public.Invoice.where({ id: invoice.id }).update({
        status: "PAID" as any,
      });
    }
    return {
      message: "Payment was already processed.",
      payment: existingPayment,
      invoiceStatus: "PAID",
    };
  }

  const paidAmount = Number(session.amount_total) / 100;

  // 3. Create Payment record in DB
  const payment = await db.orm.public.Payment.create({
    invoiceId: invoice.id,
    amount: paidAmount,
    method: "ONLINE" as any,
    transactionId,
    status: "SUCCESS" as any,
    createdAt: Temporal.Now.instant(),
  });

  // 4. Update Invoice status to PAID
  await db.orm.public.Invoice.where({ id: invoice.id }).update({
    status: "PAID" as any,
  });

  // 5. Send Notification to Student
  const student = await db.orm.public.Student.where({ id: studentId }).first();
  if (student?.userId) {
    await db.orm.public.Notification.create({
      userId: student.userId,
      title: "Invoice Paid Successfully",
      message: `Your payment of BDT ${paidAmount} for invoice #${invoice.invoiceNo} was successful. Transaction ID: ${transactionId}`,
      type: "INFO" as any,
      isRead: false,
      createdAt: Temporal.Now.instant(),
    });
  }

  return {
    message: "Payment successfully recorded.",
    payment,
    invoiceStatus: "PAID",
  };
};

export const studentService = {
  getProfile,
  createProfile,
  updateProfile,
  getEnrolledCourses,
  getAvailableSections,
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
  createPaymentCheckoutSession,
  verifyAndFulfillPayment,
  getNotifications,
};
