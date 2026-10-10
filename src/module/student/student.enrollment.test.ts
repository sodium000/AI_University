import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";

import app from "../../app";
import { db } from "../../prisma/db";
import { jwtUtils } from "../../utils/createJwtToken";

const originalOrm = (db as any).orm;
const originalVerifyToken = jwtUtils.verifyToken;

const restoreMocks = () => {
  (db as any).orm = originalOrm;
  jwtUtils.verifyToken = originalVerifyToken;
};

const setMockOrm = (publicNamespace: Record<string, any>) => {
  (db as any).orm = { public: publicNamespace };
};

const stubStudentAuth = (role: "STUDENT" | "FACULTY" = "STUDENT") => {
  jwtUtils.verifyToken = () => ({
    success: true,
    data: { id: "user-1", role },
  }) as any;

  setMockOrm({
    User: {
      where: ({ id }: { id: string }) => ({
        first: async () => ({
          id,
          role,
          status: "ACTIVE",
          name: role === "STUDENT" ? "Student User" : "Faculty User",
          email: `${id}@example.com`,
        }),
      }),
    },
    Student: {
      where: ({ userId, id }: { userId?: string; id?: string }) => ({
        first: async () =>
          userId === "user-1" || id === "student-1"
            ? { id: "student-1", userId: "user-1", status: "ACTIVE" }
            : null,
      }),
    },
    Section: {
      where: ({ id }: { id: string }) => ({
        include: () => ({
          include: () => ({
            first: async () =>
              id === "section-1"
                ? {
                    id: "section-1",
                    courseId: "course-1",
                    semesterId: "semester-1",
                    capacity: 10,
                    course: { id: "course-1", code: "CS101", title: "Intro to CS", credit: 3 },
                    semester: {
                      id: "semester-1",
                      name: "Spring 2026",
                      year: 2026,
                      status: "ACTIVE",
                      startDate: "2026-01-01T00:00:00.000Z",
                      endDate: "2026-06-30T00:00:00.000Z",
                    },
                  }
                : null,
          }),
        }),
      }),
    },
    Enrollment: {
      where: (criteria: any) => {
        const hasSectionMatch = criteria.sectionId === "section-1";
        const isActiveEnrollment = criteria.status === "ENROLLED";

        if (criteria.id) {
          return {
            update: async () => ({ id: criteria.id, status: "ENROLLED" }),
          };
        }

        if (isActiveEnrollment && hasSectionMatch) {
          return {
            all: async () => [],
          };
        }

        if (criteria.studentId && criteria.sectionId) {
          return {
            first: async () => null,
            include: () => ({
              all: async () => [],
            }),
            all: async () => [],
          };
        }

        if (criteria.studentId && isActiveEnrollment) {
          return {
            include: () => ({
              all: async () => [],
            }),
            all: async () => [],
          };
        }

        return {
          first: async () => null,
          all: async () => [],
        };
      },
      create: async (payload: any) => ({
        id: "enrollment-1",
        studentId: payload.studentId,
        sectionId: payload.sectionId,
        status: payload.status,
        enrolledAt: new Date().toISOString(),
      }),
    },
    Invoice: {
      where: ({ invoiceNo }: { invoiceNo?: string }) => ({
        first: async () => (invoiceNo ? null : null),
      }),
      create: async (payload: any) => ({
        id: "invoice-1",
        ...payload,
      }),
    },
    Notification: {
      create: async () => ({ id: "notification-1" }),
    },
  });
};

test("POST /api/v1/student/me/enrollments enrolls a valid student in a section", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  const response = await request(app)
    .post("/api/v1/student/me/enrollments")
    .set("Authorization", "Bearer student-token")
    .send({ sectionId: "section-1" });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.statusCode, 201);
  assert.equal(response.body.message, "Successfully enrolled in course section");
  assert.equal(response.body.data.id, "enrollment-1");
  assert.equal(response.body.data.studentId, "student-1");
  assert.equal(response.body.data.sectionId, "section-1");
  assert.equal(response.body.data.status, "ENROLLED");
  assert.ok(typeof response.body.data.enrolledAt === "string");
});

test("POST /api/v1/student/me/courses is an enrollment alias", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  const response = await request(app)
    .post("/api/v1/student/me/courses")
    .set("Authorization", "Bearer student-token")
    .send({ sectionId: "section-1" });

  assert.equal(response.status, 201);
  assert.equal(response.body.message, "Successfully enrolled in course section");
  assert.equal(response.body.data.sectionId, "section-1");
});

test("POST /api/v1/student/me/enrollments rejects unauthenticated access", async (t) => {
  t.after(restoreMocks);

  const response = await request(app)
    .post("/api/v1/student/me/enrollments")
    .send({ sectionId: "section-1" });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("POST /api/v1/student/me/enrollments rejects non-student roles", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("FACULTY");

  const response = await request(app)
    .post("/api/v1/student/me/enrollments")
    .set("Authorization", "Bearer faculty-token")
    .send({ sectionId: "section-1" });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("POST /api/v1/student/me/enrollments rejects missing sectionId", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  const response = await request(app)
    .post("/api/v1/student/me/enrollments")
    .set("Authorization", "Bearer student-token")
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "BAD_REQUEST");
});

test("POST /api/v1/student/me/enrollments returns 404 for a missing section", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  setMockOrm({
    ...((db as any).orm?.public ?? {}),
    Section: {
      where: ({ id }: { id: string }) => ({
        include: () => ({
          include: () => ({
            first: async () => null,
          }),
        }),
      }),
    },
    User: {
      where: ({ id }: { id: string }) => ({
        first: async () => ({ id, role: "STUDENT", status: "ACTIVE" }),
      }),
    },
    Student: {
      where: ({ userId, id }: { userId?: string; id?: string }) => ({
        first: async () =>
          userId === "user-1" || id === "student-1"
            ? { id: "student-1", userId: "user-1", status: "ACTIVE" }
            : null,
      }),
    },
    Enrollment: {
      where: (_criteria: any) => ({
        first: async () => null,
        all: async () => [],
      }),
      create: async () => ({ id: "enrollment-1" }),
    },
    Invoice: {
      where: ({ invoiceNo }: { invoiceNo?: string }) => ({
        first: async () => (invoiceNo ? null : null),
      }),
      create: async () => ({ id: "invoice-1" }),
    },
    Notification: {
      create: async () => ({ id: "notification-1" }),
    },
  });

  const response = await request(app)
    .post("/api/v1/student/me/enrollments")
    .set("Authorization", "Bearer student-token")
    .send({ sectionId: "missing-section" });

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "NOT_FOUND");
});

test("POST /api/v1/student/me/enrollments rejects duplicate enrollment", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  setMockOrm({
    ...((db as any).orm?.public ?? {}),
    Section: {
      where: ({ id }: { id: string }) => ({
        include: () => ({
          include: () => ({
            first: async () => ({
              id: "section-1",
              courseId: "course-1",
              semesterId: "semester-1",
              capacity: 10,
              course: { id: "course-1", code: "CS101", title: "Intro to CS", credit: 3 },
              semester: { id: "semester-1", name: "Spring 2026", status: "ACTIVE" },
            }),
          }),
        }),
      }),
    },
    User: {
      where: ({ id }: { id: string }) => ({
        first: async () => ({ id, role: "STUDENT", status: "ACTIVE" }),
      }),
    },
    Student: {
      where: ({ userId, id }: { userId?: string; id?: string }) => ({
        first: async () =>
          userId === "user-1" || id === "student-1"
            ? { id: "student-1", userId: "user-1", status: "ACTIVE" }
            : null,
      }),
    },
    Enrollment: {
      where: (criteria: any) => {
        if (criteria.studentId && criteria.sectionId) {
          return {
            first: async () => ({
              id: "existing-enrollment",
              studentId: "student-1",
              sectionId: "section-1",
              status: "ENROLLED",
            }),
          };
        }

        if (criteria.status === "ENROLLED" && criteria.sectionId) {
          return { all: async () => [] };
        }

        return { all: async () => [], first: async () => null };
      },
      create: async () => ({ id: "enrollment-1" }),
    },
    Invoice: {
      where: ({ invoiceNo }: { invoiceNo?: string }) => ({
        first: async () => (invoiceNo ? null : null),
      }),
      create: async () => ({ id: "invoice-1" }),
    },
    Notification: { create: async () => ({ id: "notification-1" }) },
  });

  const response = await request(app)
    .post("/api/v1/student/me/enrollments")
    .set("Authorization", "Bearer student-token")
    .send({ sectionId: "section-1" });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "CONFLICT");
});

test("GET /api/v1/student/me/sections returns an empty catalog when no semester is active", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  const publicNamespace = (db as any).orm.public;
  setMockOrm({
    ...publicNamespace,
    Semester: {
      where: () => ({ all: async () => [] }),
    },
    Section: {
      where: () => {
        throw new Error("Sections must not be queried without an active semester");
      },
    },
  });

  const response = await request(app)
    .get("/api/v1/student/me/sections")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data, []);
});

test("GET /api/v1/student/me/sections returns active sections with live enrollment counts", async (t) => {
  t.after(restoreMocks);
  stubStudentAuth("STUDENT");

  const section = {
    id: "section-1",
    name: "Section A",
    courseId: "course-1",
    semesterId: "semester-active",
    facultyId: "faculty-1",
    capacity: 30,
    course: {
      id: "course-1",
      code: "CS101",
      title: "Intro to CS",
      credit: 3,
      department: { code: "CSE" },
    },
    semester: { id: "semester-active", name: "Fall 2026", year: 2026, status: "ACTIVE" },
    faculty: { id: "faculty-1", user: { id: "user-faculty", name: "Faculty" } },
    schedules: [
      { dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00", room: "R1", building: "Main" },
    ],
    enrollments: [{ status: "ENROLLED" }, { status: "DROPPED" }],
  };
  const query = {
    include: () => query,
    all: async () => [section],
  };
  const publicNamespace = (db as any).orm.public;
  setMockOrm({
    ...publicNamespace,
    Semester: {
      where: () => ({ all: async () => [{ id: "semester-active" }] }),
    },
    Section: {
      where: () => query,
    },
  });

  const response = await request(app)
    .get("/api/v1/student/me/sections")
    .set("Authorization", "Bearer test-token");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].course.department, "CSE");
  assert.equal(response.body.data[0].enrolledCount, 1);
  assert.equal(response.body.data[0].schedule, "Monday 09:00 - 10:00");
  assert.equal(response.body.data[0].room, "R1, Main");
});
