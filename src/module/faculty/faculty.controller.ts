import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { facultyService } from "./faculty.service";

const resolveStatusCode = (error: any, defaultCode: number = 500) => {
  const msg = error?.message || "";
  if (msg.includes("Forbidden")) return 403;
  if (msg.includes("not found") || msg.includes("Not found")) return 404;
  if (
    msg.includes("required") ||
    msg.includes("already been posted") ||
    msg.includes("Invalid") ||
    msg.includes("Cannot record attendance") ||
    msg.includes("Please provide")
  ) {
    return 400;
  }
  return defaultCode;
};

const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const profile = await facultyService.getProfile(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Faculty profile fetched successfully",
      data: profile,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to fetch faculty profile",
      data: null,
    });
  }
};

const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const facultyId = req.faculty?.id;
    const payload = req.body;

    const updated = await facultyService.updateProfile(
      userId,
      facultyId,
      payload,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Faculty profile updated successfully",
      data: updated,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to update faculty profile",
      data: null,
    });
  }
};

const getMySections = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const { semesterId, courseId } = req.query;

    const sections = await facultyService.getMySections(facultyId, {
      semesterId: semesterId as string,
      courseId: courseId as string,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Taught sections retrieved successfully",
      data: sections,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to retrieve sections",
      data: null,
    });
  }
};

const getMyStudents = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const { sectionId, search } = req.query;

    const students = await facultyService.getMyStudents(facultyId, {
      sectionId: sectionId as string,
      search: search as string,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Students across faculty sections retrieved successfully",
      data: students,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to retrieve students",
      data: null,
    });
  }
};

const getSectionDetail = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const id = req.params.id as string;

    const section = await facultyService.getSectionDetail(facultyId, id);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Section details retrieved successfully",
      data: section,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to retrieve section details",
      data: null,
    });
  }
};

const recordAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const id = req.params.id as string;
    const body = req.body;

    const records = body.records || body.attendances || (Array.isArray(body) ? body : []);
    const date = body.date;

    const result = await facultyService.recordAttendance(facultyId, id, {
      date,
      records,
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Attendance recorded successfully",
      data: result,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to record attendance",
      data: null,
    });
  }
};

const correctAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const id = req.params.id as string;
    const payload = req.body;

    const updated = await facultyService.correctAttendance(
      facultyId,
      id,
      payload,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Attendance record corrected successfully",
      data: updated,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to correct attendance",
      data: null,
    });
  }
};

const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const payload = req.body;

    const assignment = await facultyService.createAssignment(
      facultyId,
      payload,
    );

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Assignment created successfully",
      data: assignment,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to create assignment",
      data: null,
    });
  }
};

const updateAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const id = req.params.id as string;
    const payload = req.body;

    const updated = await facultyService.updateAssignment(
      facultyId,
      id,
      payload,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Assignment updated successfully",
      data: updated,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to update assignment",
      data: null,
    });
  }
};

const getAssignmentSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const id = req.params.id as string;
    const { status } = req.query;

    const result = await facultyService.getAssignmentSubmissions(
      facultyId,
      id,
      status as string,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Assignment submissions retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to retrieve assignment submissions",
      data: null,
    });
  }
};

const postResult = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const payload = req.body;

    const result = await facultyService.postResult(facultyId, payload);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Result posted successfully",
      data: result,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to post result",
      data: null,
    });
  }
};

const correctResult = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const id = req.params.id as string;
    const payload = req.body;

    const updated = await facultyService.correctResult(facultyId, id, payload);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Result corrected successfully",
      data: updated,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to correct result",
      data: null,
    });
  }
};

const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const facultyId = req.faculty?.id;
    const payload = req.body;

    const exam = await facultyService.createExam(facultyId, payload);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Exam scheduled successfully",
      data: exam,
    });
  } catch (error: any) {
    const statusCode = resolveStatusCode(error);
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Failed to schedule exam",
      data: null,
    });
  }
};

export const facultyController = {
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
