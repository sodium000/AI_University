import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { adminService } from "./admin.service";
import { sendFailure } from "../../utils/apiResponse";

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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to fetch dashboard statistics");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve students list");
  }
};

export const getPendingStudentRegistrations = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await adminService.getPendingStudentRegistrations();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student registrations awaiting approval retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve pending student registrations");
  }
};

export const approveStudentRegistration = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await adminService.approveStudentRegistration(
      req.params.id as string,
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student registration approved and profile created successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to approve student registration");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create student account");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to update student profile");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to deactivate or delete student");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve faculty list");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create faculty account");
  }
};

// 4. Departments
export const getAllDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllDepartments();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Departments fetched successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to fetch departments");
  }
};

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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create department");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to update department");
  }
};

// 5. Programs
export const getAllPrograms = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllPrograms();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Programs fetched successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to fetch programs");
  }
};

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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create program");
  }
};

// 6. Courses
export const getAllCourses = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllCourses();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Courses fetched successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to fetch courses");
  }
};

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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create course");
  }
};

// 7. Semesters
export const getAllSemesters = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllSemesters();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Semesters fetched successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to fetch semesters");
  }
};

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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create semester");
  }
};

// 8. Sections
export const getAllSections = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getAllSections();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Sections fetched successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to fetch sections");
  }
};

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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create course section");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve enrollments");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to force enroll student");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve payments");
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
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to generate system reports");
  }
};

export const adminController = {
  getDashboardStats,
  getAllStudents,
  getPendingStudentRegistrations,
  approveStudentRegistration,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllFaculty,
  createFaculty,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  getAllPrograms,
  createProgram,
  getAllCourses,
  createCourse,
  getAllSemesters,
  createSemester,
  getAllSections,
  createSection,
  getAllEnrollments,
  forceEnrollStudent,
  getAllPayments,
  generateReports,
};
