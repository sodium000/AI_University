import { Router } from "express";
import { adminController } from "./admin.controller";
import { auth } from "../../middleware/auth";

const router = Router();

// Guard all admin routes with ADMIN and SUPER_ADMIN roles
const adminAuth = auth("ADMIN", "SUPER_ADMIN");

// 1. Dashboard
router.get("/dashboard", adminAuth, adminController.getDashboardStats);

// 2. Student Management
router.get("/students", adminAuth, adminController.getAllStudents);
router.post("/students", adminAuth, adminController.createStudent);
router.patch("/students/:id", adminAuth, adminController.updateStudent);
router.delete("/students/:id", adminAuth, adminController.deleteStudent);

// 3. Faculty Management
router.get("/faculty", adminAuth, adminController.getAllFaculty);
router.post("/faculty", adminAuth, adminController.createFaculty);

// 4. Academic Structure: Departments
router.post("/departments", adminAuth, adminController.createDepartment);
router.patch("/departments/:id", adminAuth, adminController.updateDepartment);

// 5. Academic Structure: Programs
router.post("/programs", adminAuth, adminController.createProgram);

// 6. Academic Structure: Courses
router.post("/courses", adminAuth, adminController.createCourse);

// 7. Academic Structure: Semesters
router.post("/semesters", adminAuth, adminController.createSemester);

// 8. Academic Structure: Course Sections
router.post("/sections", adminAuth, adminController.createSection);

// 9. Enrollments & Overrides
router.get("/enrollments", adminAuth, adminController.getAllEnrollments);
router.post("/enrollments", adminAuth, adminController.forceEnrollStudent);

// 10. Financial Payments
router.get("/payments", adminAuth, adminController.getAllPayments);

// 11. System Reports
router.get("/reports", adminAuth, adminController.generateReports);

export const adminRoutes = router;
