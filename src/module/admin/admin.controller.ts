import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { adminService } from "./admin.service";

// 1. Dashboard Stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getDashboardStats();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Admin dashboard stats retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to fetch dashboard statistics",
      data: null,
    });
  }
};

// 2. Students
export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllStudents(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students list retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to retrieve students list",
      data: null,
    });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createStudent(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Student account created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create student account",
      data: null,
    });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = await adminService.updateStudent(
      id as string,
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student profile updated successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to update student profile",
      data: null,
    });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === "true";
    const data = await adminService.deleteStudent(
      id as string,
      hard,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: data.message || "Student processed successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to deactivate or delete student",
      data: null,
    });
  }
};

// 3. Faculty
export const getAllFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllFaculty(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Faculty list retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to retrieve faculty list",
      data: null,
    });
  }
};

export const createFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createFaculty(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Faculty account created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create faculty account",
      data: null,
    });
  }
};

// 4. Departments
export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createDepartment(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Department created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create department",
      data: null,
    });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = await adminService.updateDepartment(
      id as string,
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Department updated successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to update department",
      data: null,
    });
  }
};

// 5. Programs
export const createProgram = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createProgram(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Degree program created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create program",
      data: null,
    });
  }
};

// 6. Courses
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createCourse(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Course created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create course",
      data: null,
    });
  }
};

// 7. Semesters
export const createSemester = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createSemester(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Semester created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create semester",
      data: null,
    });
  }
};

// 8. Sections
export const createSection = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.createSection(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Course section created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to create course section",
      data: null,
    });
  }
};

// 9. Enrollments
export const getAllEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllEnrollments(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Enrollments list retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to retrieve enrollments",
      data: null,
    });
  }
};

export const forceEnrollStudent = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.forceEnrollStudent(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: data.message || "Student enrolled successfully",
      data,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to force enroll student",
      data: null,
    });
  }
};

// 10. Payments
export const getAllPayments = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllPayments(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payments list retrieved successfully",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to retrieve payments",
      data: null,
    });
  }
};

// 11. Reports
export const generateReports = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.generateReports(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "System reports generated successfully",
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to generate system reports",
      data: null,
    });
  }
};

export const adminController = {
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
