import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { superAdminService } from "./super-admin.service";
import { sendFailure } from "../../utils/apiResponse";
import { AppError } from "../../errors/AppError";

// 1. GET /super-admin/dashboard
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.getDashboardOverview();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Super admin system dashboard overview retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve dashboard overview");
  }
};

// 2. GET /super-admin/users
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.getAllUsers(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "System users list retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve users list");
  }
};

// 3. PATCH /super-admin/users/:id/status
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return sendFailure(
        res,
        AppError.badRequest(
          "Field 'status' is required (ACTIVE, INACTIVE, SUSPENDED, BLOCKED).",
          undefined,
          {
            hint: "Send JSON body: { \"status\": \"ACTIVE\", \"reason\": \"optional note\" }.",
          },
        ),
        "Missing status field",
      );
    }

    const data = await superAdminService.updateUserStatus(
      id as string,
      status,
      reason,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `User status successfully updated to ${status}`,
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to update user status");
  }
};

// 4. POST /super-admin/admins
export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.createAdmin(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Administrator account created successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create administrator account");
  }
};

// 5. GET /super-admin/roles
export const getAllRoles = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.getAllRoles();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Roles and assigned permissions retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve roles");
  }
};

// 6. POST /super-admin/roles
export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.createCustomRole(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Custom role created successfully with assigned permission set",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to create custom role");
  }
};

// 7. GET /super-admin/permissions
export const getAllPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const data = superAdminService.getAllPermissions();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "System recognized permissions catalog retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve permissions");
  }
};

// 8. GET /super-admin/audit-logs
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.getAuditLogs(req.query as any);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Global system audit logs retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve audit trail");
  }
};

// 9. GET /super-admin/system-health
export const getSystemHealth = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.getLiveSystemHealth();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Live system health status retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve system health status");
  }
};

// 10. GET /super-admin/settings
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.getSystemSettings();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Global system settings retrieved successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to retrieve system settings");
  }
};

// 11. PATCH /super-admin/settings
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = await superAdminService.updateSystemSettings(
      req.body,
      req.user?.id,
      req.ip,
      req.headers["user-agent"],
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Global system settings updated successfully",
      data,
    });
  } catch (error: unknown) {
    return sendFailure(res, error, "Failed to update system settings");
  }
};

export const superAdminController = {
  getDashboard,
  getAllUsers,
  updateUserStatus,
  createAdmin,
  getAllRoles,
  createRole,
  getAllPermissions,
  getAuditLogs,
  getSystemHealth,
  getSettings,
  updateSettings,
};
