import { Response } from "express";
import { AppError } from "../../errors/AppError";
import { ErrorCode } from "../../errors/errorCodes";
import { AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { facultyService } from "./faculty.service";

const requireUserId = (req: AuthRequest) => {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized(
      "Unauthorized: authenticated user context is missing.",
      ErrorCode.AUTH_CONTEXT_MISSING,
      {
        hint: "Ensure the Authorization header or accessToken cookie is sent with a valid FACULTY token.",
      },
    );
  }
  return userId;
};

const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await facultyService.getProfile(req.user?.id);
  sendSuccess(res, 200, "Faculty profile fetched successfully", profile);
});

const createProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req);
  const result = await facultyService.createProfile(userId, req.body);

  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  sendSuccess(
    res,
    201,
    "Faculty profile created successfully and user role upgraded to FACULTY",
    result,
  );
});

const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await facultyService.updateProfile(
    req.user?.id,
    req.faculty?.id,
    req.body,
  );
  sendSuccess(res, 200, "Faculty profile updated successfully", updated);
});

const getMySections = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sections = await facultyService.getMySections(req.faculty?.id, {
    semesterId: req.query.semesterId as string,
    courseId: req.query.courseId as string,
  });
  sendSuccess(res, 200, "Taught sections retrieved successfully", sections);
});

const getMyStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const students = await facultyService.getMyStudents(req.faculty?.id, {
    sectionId: req.query.sectionId as string,
    search: req.query.search as string,
  });
  sendSuccess(
    res,
    200,
    "Students across faculty sections retrieved successfully",
    students,
  );
});

const getSectionDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const section = await facultyService.getSectionDetail(
    req.faculty?.id,
    req.params.id as string,
  );
  sendSuccess(res, 200, "Section details retrieved successfully", section);
});

const recordAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body;
  const records =
    body.records || body.attendances || (Array.isArray(body) ? body : []);

  const result = await facultyService.recordAttendance(
    req.faculty?.id,
    req.params.id as string,
    { date: body.date, records },
  );
  sendSuccess(res, 201, "Attendance recorded successfully", result);
});

const correctAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await facultyService.correctAttendance(
    req.faculty?.id,
    req.params.id as string,
    req.body,
  );
  sendSuccess(res, 200, "Attendance record corrected successfully", updated);
});

const createAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const assignment = await facultyService.createAssignment(
    req.faculty?.id,
    req.body,
  );
  sendSuccess(res, 201, "Assignment created successfully", assignment);
});

const updateAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await facultyService.updateAssignment(
    req.faculty?.id,
    req.params.id as string,
    req.body,
  );
  sendSuccess(res, 200, "Assignment updated successfully", updated);
});

const getAssignmentSubmissions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await facultyService.getAssignmentSubmissions(
      req.faculty?.id,
      req.params.id as string,
      req.query.status as string,
    );
    sendSuccess(
      res,
      200,
      "Assignment submissions retrieved successfully",
      result,
    );
  },
);

const postResult = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await facultyService.postResult(req.faculty?.id, req.body);
  sendSuccess(res, 201, "Result posted successfully", result);
});

const correctResult = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updated = await facultyService.correctResult(
    req.faculty?.id,
    req.params.id as string,
    req.body,
  );
  sendSuccess(res, 200, "Result corrected successfully", updated);
});

const createExam = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exam = await facultyService.createExam(req.faculty?.id, req.body);
  sendSuccess(res, 201, "Exam scheduled successfully", exam);
});

export const facultyController = {
  getProfile,
  createProfile,
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
