import { Router } from "express";
import { facultyController } from "./faculty.controller";
import { auth } from "../../middleware/auth";

const router = Router();

// Profile
router.get("/me", auth("FACULTY"), facultyController.getProfile);
router.patch("/me", auth("FACULTY"), facultyController.updateProfile);

// Sections & Students taught by faculty
router.get("/me/sections", auth("FACULTY"), facultyController.getMySections);
router.get("/me/students", auth("FACULTY"), facultyController.getMyStudents);

// Section detail (roster, schedule, meta) — must teach it
router.get("/sections/:id", auth("FACULTY"), facultyController.getSectionDetail);

// Attendance
router.post(
  "/sections/:id/attendance",
  auth("FACULTY"),
  facultyController.recordAttendance,
);
router.patch(
  "/attendance/:id",
  auth("FACULTY"),
  facultyController.correctAttendance,
);

// Assignments
router.post(
  "/assignments",
  auth("FACULTY"),
  facultyController.createAssignment,
);
router.patch(
  "/assignments/:id",
  auth("FACULTY"),
  facultyController.updateAssignment,
);
router.get(
  "/assignments/:id/submissions",
  auth("FACULTY"),
  facultyController.getAssignmentSubmissions,
);

// Academic Results
router.post("/results", auth("FACULTY"), facultyController.postResult);
router.patch("/results/:id", auth("FACULTY"), facultyController.correctResult);

// Exams
router.post("/exams", auth("FACULTY"), facultyController.createExam);

export const facultyRoutes = router;
