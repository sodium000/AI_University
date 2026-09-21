import { Router } from "express";
import { superAdminController } from "./super-admin.controller";
import { auth } from "../../middleware/auth";

const router = Router();

// Protect all super admin endpoints with SUPER_ADMIN role
const superAdminAuth = auth("SUPER_ADMIN");

// 1. Dashboard Overview
router.get("/dashboard", superAdminAuth, superAdminController.getDashboard);

// 2. User Management
router.get("/users", superAdminAuth, superAdminController.getAllUsers);
router.patch("/users/:id/status", superAdminAuth, superAdminController.updateUserStatus);

// 3. Admin Account Creation
router.post("/admins", superAdminAuth, superAdminController.createAdmin);

// 4. Role & Permissions Management
router.get("/roles", superAdminAuth, superAdminController.getAllRoles);
router.post("/roles", superAdminAuth, superAdminController.createRole);
router.get("/permissions", superAdminAuth, superAdminController.getAllPermissions);

// 5. Global Audit Trail
router.get("/audit-logs", superAdminAuth, superAdminController.getAuditLogs);

// 6. Live System Health Check
router.get("/system-health", superAdminAuth, superAdminController.getSystemHealth);

// 7. Global System Settings
router.get("/settings", superAdminAuth, superAdminController.getSettings);
router.patch("/settings", superAdminAuth, superAdminController.updateSettings);

export const superAdminRoutes = router;
