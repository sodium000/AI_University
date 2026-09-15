import { Router } from "express";
import { studentController } from "./student.controller";
import { auth } from "../../middleware/auth";

const router = Router();

// Profile
router.get("/me", auth("STUDENT"), studentController.getProfile);
router.patch("/me", auth("STUDENT"), studentController.updateProfile);

// Courses & Enrollment
router.get("/me/courses", auth("STUDENT"), studentController.getEnrolledCourses);
router.post("/me/enrollments", auth("STUDENT"), studentController.enrollCourse);
router.delete(
  "/me/enrollments/:id",
  auth("STUDENT"),
  studentController.dropEnrollment,
);

// Schedule & Attendance
router.get("/me/schedule", auth("STUDENT"), studentController.getSchedule);
router.get("/me/attendance", auth("STUDENT"), studentController.getAttendance);

// Academic Results & Transcript
router.get("/me/results", auth("STUDENT"), studentController.getResults);
router.get("/me/transcript", auth("STUDENT"), studentController.getTranscript);

// Assignments
router.get(
  "/me/assignments",
  auth("STUDENT"),
  studentController.getAssignments,
);
router.post(
  "/me/assignments/:id/submit",
  auth("STUDENT"),
  studentController.submitAssignment,
);

// Billing & Payments
router.get("/me/invoices", auth("STUDENT"), studentController.getInvoices);
router.get("/me/payments", auth("STUDENT"), studentController.getPayments);

// Notifications
router.get(
  "/me/notifications",
  auth("STUDENT"),
  studentController.getNotifications,
);

export const studentRoutes = router;
