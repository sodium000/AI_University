import { Response } from "express";
import { AppError } from "../../errors/AppError";
import { ErrorCode } from "../../errors/errorCodes";
import { AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { studentService } from "./student.service";

const requireUserId = (req: AuthRequest) => {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized(
      "Unauthorized: authenticated user context is missing.",
      ErrorCode.AUTH_CONTEXT_MISSING,
      {
        hint: "Ensure the Authorization header or accessToken cookie is sent with a valid STUDENT token.",
      },
    );
  }
  return userId;
};

const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await studentService.getProfile(req.user?.id);
  sendSuccess(res, 200, "Student profile fetched successfully", profile);
});

const createProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req);
  const profile = await studentService.createProfile(userId, req.body);
  sendSuccess(res, 201, "Student profile created successfully", profile);
});

const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await studentService.updateProfile(
    req.user?.id,
    req.student?.id,
    req.body,
  );
  sendSuccess(res, 200, "Student profile updated successfully", updated);
});

const getEnrolledCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const courses = await studentService.getEnrolledCourses(
    req.student?.id,
    req.query.status as string,
  );
  sendSuccess(res, 200, "Enrolled courses retrieved successfully", courses);
});

const getSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const schedule = await studentService.getSchedule(req.student?.id);
  sendSuccess(res, 200, "Schedule retrieved successfully", schedule);
});

const enrollCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const enrollment = await studentService.enrollCourse(
    req.student?.id,
    req.body.sectionId,
  );
  sendSuccess(res, 201, "Successfully enrolled in course section", enrollment);
});

const dropEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const dropped = await studentService.dropEnrollment(
    req.student?.id,
    id as string,
  );
  sendSuccess(res, 200, "Enrollment successfully dropped", dropped);
});

const getAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const attendance = await studentService.getAttendance(req.student?.id, {
    status: req.query.status as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });
  sendSuccess(res, 200, "Attendance records retrieved successfully", attendance);
});

const getResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const results = await studentService.getResults(req.student?.id);
  sendSuccess(res, 200, "Results retrieved successfully", results);
});

const getTranscript = asyncHandler(async (req: AuthRequest, res: Response) => {
  const transcript = await studentService.getTranscript(req.student?.id);
  sendSuccess(res, 200, "Academic transcript retrieved successfully", transcript);
});

const getAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const assignments = await studentService.getAssignments(
    req.student?.id,
    req.query.status as string,
  );
  sendSuccess(res, 200, "Assignments retrieved successfully", assignments);
});

const submitAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const submission = await studentService.submitAssignment(
    req.student?.id,
    id as string,
    req.body,
  );
  sendSuccess(res, 200, "Assignment submitted successfully", submission);
});

const getInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoices = await studentService.getInvoices(req.student?.id);
  sendSuccess(res, 200, "Invoices retrieved successfully", invoices);
});

const getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payments = await studentService.getPayments(req.student?.id);
  sendSuccess(res, 200, "Payments retrieved successfully", payments);
});

const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await studentService.getNotifications(
    req.user?.id,
    req.query.unreadOnly === "true",
  );
  sendSuccess(res, 200, "Notifications retrieved successfully", notifications);
});

const createPaymentCheckoutSession = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const invoiceId = req.body?.invoiceId || req.params?.id;
    if (!invoiceId) {
      throw AppError.badRequest("invoiceId is required in the request body.", undefined, {
        hint: "Pass { \"invoiceId\": \"<uuid>\" } when creating a Stripe checkout session.",
      });
    }

    const data = await studentService.createPaymentCheckoutSession(
      req.student?.id,
      invoiceId,
    );
    sendSuccess(res, 200, "Stripe checkout session created successfully", data);
  },
);

const verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessionId = req.body?.sessionId || (req.query?.sessionId as string);
  if (!sessionId) {
    throw AppError.badRequest("sessionId is required.", undefined, {
      hint: "Pass sessionId from the Stripe checkout redirect or webhook payload.",
    });
  }

  const data = await studentService.verifyAndFulfillPayment(sessionId);
  sendSuccess(
    res,
    200,
    data.message || "Payment processed successfully",
    data,
  );
});

export const studentController = {
  getProfile,
  createProfile,
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
  createPaymentCheckoutSession,
  verifyPayment,
  getNotifications,
};
