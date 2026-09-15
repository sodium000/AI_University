import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { studentService } from "./student.service";

const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const profile = await studentService.getProfile(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student profile fetched successfully",
      data: profile,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to fetch student profile",
      data: null,
    });
  }
};

const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const studentId = req.student?.id;
    const payload = req.body;

    const updated = await studentService.updateProfile(
      userId,
      studentId,
      payload,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student profile updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to update profile",
      data: null,
    });
  }
};

const getEnrolledCourses = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const { status } = req.query;

    const courses = await studentService.getEnrolledCourses(
      studentId,
      status as string,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Enrolled courses retrieved successfully",
      data: courses,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve enrolled courses",
      data: null,
    });
  }
};

const getSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const schedule = await studentService.getSchedule(studentId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Schedule retrieved successfully",
      data: schedule,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve schedule",
      data: null,
    });
  }
};

const enrollCourse = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const { sectionId } = req.body;

    const enrollment = await studentService.enrollCourse(studentId, sectionId);

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Successfully enrolled in course section",
      data: enrollment,
    });
  } catch (error: any) {
    const isBadRequest =
      error.message.includes("capacity") ||
      error.message.includes("already") ||
      error.message.includes("required");

    return res.status(isBadRequest ? 400 : 500).json({
      success: false,
      statusCode: isBadRequest ? 400 : 500,
      message: error.message || "Enrollment failed",
      data: null,
    });
  }
};

const dropEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const dropped = await studentService.dropEnrollment(studentId, id as string);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Enrollment successfully dropped",
      data: dropped,
    });
  } catch (error: any) {
    const isNotFound = error.message.includes("not found");
    const isBadRequest = error.message.includes("already");

    const status = isNotFound ? 404 : isBadRequest ? 400 : 500;

    return res.status(status).json({
      success: false,
      statusCode: status,
      message: error.message || "Failed to drop enrollment",
      data: null,
    });
  }
};

const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const { status, startDate, endDate } = req.query;

    const attendance = await studentService.getAttendance(studentId, {
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Attendance records retrieved successfully",
      data: attendance,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve attendance",
      data: null,
    });
  }
};

const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const results = await studentService.getResults(studentId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Results retrieved successfully",
      data: results,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve results",
      data: null,
    });
  }
};

const getTranscript = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const transcript = await studentService.getTranscript(studentId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Academic transcript retrieved successfully",
      data: transcript,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve transcript",
      data: null,
    });
  }
};

const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const { status } = req.query;

    const assignments = await studentService.getAssignments(
      studentId,
      status as string,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Assignments retrieved successfully",
      data: assignments,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve assignments",
      data: null,
    });
  }
};

const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payload = req.body;

    const submission = await studentService.submitAssignment(
      studentId,
      id as string,
      payload,
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Assignment submitted successfully",
      data: submission,
    });
  } catch (error: any) {
    const isNotFound = error.message.includes("not found");
    const isForbidden = error.message.includes("not enrolled");
    const isBadRequest = error.message.includes("required");

    const status = isNotFound ? 404 : isForbidden ? 403 : isBadRequest ? 400 : 500;

    return res.status(status).json({
      success: false,
      statusCode: status,
      message: error.message || "Failed to submit assignment",
      data: null,
    });
  }
};

const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const invoices = await studentService.getInvoices(studentId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Invoices retrieved successfully",
      data: invoices,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve invoices",
      data: null,
    });
  }
};

const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const payments = await studentService.getPayments(studentId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payments retrieved successfully",
      data: payments,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 500).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 500,
      message: error.message || "Failed to retrieve payments",
      data: null,
    });
  }
};

const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { unreadOnly } = req.query;

    const notifications = await studentService.getNotifications(
      userId,
      unreadOnly === "true",
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to retrieve notifications",
      data: null,
    });
  }
};

export const studentController = {
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
