import { db } from "../../prisma/db";
import { Temporal } from "@js-temporal/polyfill";
import bcrypt from "bcryptjs";
import os from "node:os";
import config from "../../config";
import { client as redisClient } from "../../lib/redis/redis";
import { transporter } from "../../lib/nodmiller/nosmiller";
import {
  SYSTEM_PERMISSIONS,
  BUILT_IN_ROLES,
  DEFAULT_SYSTEM_SETTINGS,
} from "./super-admin.constant";

// ============================================================
// Helper: Record Audit Log
// ============================================================
export const recordSuperAdminAuditLog = async (
  action: string,
  entity: string,
  entityId?: string | null,
  newData?: any,
  oldData?: any,
  userId?: string | null,
  ipAddress?: string | null,
  userAgent?: string | null,
) => {
  try {
    await db.orm.public.AuditLog.create({
      action,
      entity,
      entityId: entityId || null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      userId: userId || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: Temporal.Now.instant(),
    });
  } catch (err) {
    console.error("Failed to record super admin audit log:", err);
  }
};

// ============================================================
// 1. Dashboard Overview
// ============================================================
export const getDashboardOverview = async () => {
  // Aggregate user counts by role
  const [
    studentCount,
    facultyCount,
    adminCount,
    superAdminCount,
    totalUsersCount,
  ] = await Promise.all([
    db.orm.public.User.where({ role: "STUDENT" as const }).aggregate((a) => ({
      count: a.count(),
    })),
    db.orm.public.User.where({ role: "FACULTY" as const }).aggregate((a) => ({
      count: a.count(),
    })),
    db.orm.public.User.where({ role: "ADMIN" as const }).aggregate((a) => ({
      count: a.count(),
    })),
    db.orm.public.User.where({ role: "SUPER_ADMIN" as const }).aggregate(
      (a) => ({ count: a.count() }),
    ),
    db.orm.public.User.aggregate((a) => ({ count: a.count() })),
  ]);

  // Aggregate user counts by status
  const [activeCount, inactiveCount, suspendedCount, blockedCount] =
    await Promise.all([
      db.orm.public.User.where({ status: "ACTIVE" as const }).aggregate(
        (a) => ({ count: a.count() }),
      ),
      db.orm.public.User.where({ status: "INACTIVE" as const }).aggregate(
        (a) => ({ count: a.count() }),
      ),
      db.orm.public.User.where({ status: "SUSPENDED" as const }).aggregate(
        (a) => ({ count: a.count() }),
      ),
      db.orm.public.User.where({ status: "BLOCKED" as const }).aggregate(
        (a) => ({ count: a.count() }),
      ),
    ]);

  // Health snapshot quick probe
  let dbStatus = "connected";
  try {
    await db.orm.public.User.limit(1).all();
  } catch {
    dbStatus = "disconnected";
  }

  let redisStatus = "connected";
  try {
    if (!redisClient.isOpen) {
      redisStatus = "disconnected";
    }
  } catch {
    redisStatus = "disconnected";
  }

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Recent audit activity (last 10 logs)
  const recentAuditActivity = await db.orm.public.AuditLog.include(
    "user",
    (u) => u.select("id", "name", "email", "role"),
  )
    .orderBy((a) => a.createdAt.desc())
    .limit(10)
    .all();

  return {
    users: {
      total: totalUsersCount?.count ?? 0,
      byRole: {
        STUDENT: studentCount?.count ?? 0,
        FACULTY: facultyCount?.count ?? 0,
        ADMIN: adminCount?.count ?? 0,
        SUPER_ADMIN: superAdminCount?.count ?? 0,
      },
      byStatus: {
        ACTIVE: activeCount?.count ?? 0,
        INACTIVE: inactiveCount?.count ?? 0,
        SUSPENDED: suspendedCount?.count ?? 0,
        BLOCKED: blockedCount?.count ?? 0,
      },
    },
    healthSnapshot: {
      status: dbStatus === "connected" ? "healthy" : "unhealthy",
      database: dbStatus,
      redis: redisStatus,
      uptimeSeconds,
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    },
    recentAuditActivity,
  };
};

// ============================================================
// 2. User Management (List/Search across all roles)
// ============================================================
export interface UsersQueryFilters {
  role?: "STUDENT" | "FACULTY" | "ADMIN" | "SUPER_ADMIN";
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getAllUsers = async (filters: UsersQueryFilters) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const skip = (page - 1) * limit;

  let query = db.orm.public.User;

  if (filters.role) {
    query = query.where({ role: filters.role });
  }

  if (filters.status) {
    query = query.where({ status: filters.status });
  }

  // Count total matching
  const totalRes = await query.aggregate((a) => ({ count: a.count() }));
  const total = totalRes?.count ?? 0;

  // Retrieve paginated records with relations
  const users = await query
    .include("student", (s) =>
      s.select(
        "id",
        "studentId",
        "departmentId",
        "programId",
        "currentYear",
        "currentSemester",
      ),
    )
    .include("faculty", (f) =>
      f.select(
        "id",
        "employeeId",
        "departmentId",
        "designation",
        "specialization",
      ),
    )
    .orderBy((u) => u.createdAt.desc())
    .offset(skip)
    .limit(limit)
    .all();

  // If search term is provided, filter in-memory for flexible substring matching
  let filteredUsers = users;
  if (filters.search) {
    const term = filters.search.toLowerCase().trim();
    filteredUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.phone && u.phone.toLowerCase().includes(term)),
    );
  }

  // Sanitize password from result
  const sanitizedUsers = filteredUsers.map((u) => {
    const { password, ...safeUser } = u as any;
    return safeUser;
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    users: sanitizedUsers,
  };
};

// ============================================================
// 3. Update User Status (Activate/Suspend/Disable)
// ============================================================
export const updateUserStatus = async (
  targetUserId: string,
  newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED",
  reason?: string,
  actorId?: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  const allowedStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(
      `Invalid status "${newStatus}". Must be one of: ${allowedStatuses.join(", ")}`,
    );
  }

  const user = await db.orm.public.User.where({ id: targetUserId }).first();
  if (!user) {
    throw new Error(`User not found with ID "${targetUserId}"`);
  }

  // Prevent super-admin from deactivating/suspending their own account
  if (
    user.id === actorId &&
    (newStatus === "SUSPENDED" ||
      newStatus === "BLOCKED" ||
      newStatus === "INACTIVE")
  ) {
    throw new Error(
      "Super Admin cannot suspend, block, or deactivate their own active account",
    );
  }

  const oldStatus = user.status;

  // Update status in database
  const updatedUser = await db.orm.public.User.where({
    id: targetUserId,
  }).update({
    status: newStatus as any,
    updatedAt: Temporal.Now.instant(),
  });

  // Record audit log entry
  await recordSuperAdminAuditLog(
    "UPDATE_USER_STATUS",
    "User",
    targetUserId,
    { status: newStatus, reason: reason || null },
    { status: oldStatus },
    actorId,
    ipAddress,
    userAgent,
  );

  const { password, ...safeUpdatedUser } = updatedUser as any;
  return safeUpdatedUser;
};

// ============================================================
// 4. Create Admin Account
// ============================================================
export interface CreateAdminData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  photoUrl?: string;
}

export const createAdmin = async (
  data: CreateAdminData,
  actorId?: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  if (!data.name || !data.name.trim()) {
    throw new Error("Admin full name is required");
  }
  if (!data.email || !data.email.trim()) {
    throw new Error("Admin email address is required");
  }
  if (!data.password || data.password.length < 6) {
    throw new Error("Password is required and must be at least 6 characters");
  }

  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await db.orm.public.User.where({
    email: normalizedEmail,
  }).first();
  if (existing) {
    throw new Error(
      `A user account with email "${normalizedEmail}" already exists`,
    );
  }

  const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
  const hashedPassword = await bcrypt.hash(data.password, saltRounds);

  const adminUser = await db.orm.public.User.create({
    name: data.name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: data.phone || null,
    photoUrl: data.photoUrl || null,
    role: "ADMIN" as const,
    status: "ACTIVE" as const,
    emailVerified: true,
    credential: "EMAIL" as const,
    createdAt: Temporal.Now.instant(),
    updatedAt: Temporal.Now.instant(),
  });

  await recordSuperAdminAuditLog(
    "CREATE_ADMIN",
    "User",
    adminUser.id,
    {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: "ADMIN",
    },
    null,
    actorId,
    ipAddress,
    userAgent,
  );

  const { password, ...safeAdmin } = adminUser as any;
  return safeAdmin;
};

// ============================================================
// 5. Roles & Permissions Management
// ============================================================
export const getAllRoles = async () => {
  // Built-in system roles
  const builtInRoles = Object.entries(BUILT_IN_ROLES).map(([name, info]) => ({
    id: `builtin_${name.toLowerCase()}`,
    name,
    description: info.description,
    isSystem: true,
    permissions: info.permissions,
  }));

  // Custom roles from database
  let customRoles: any[] = [];
  try {
    customRoles = await db.orm.public.Role.orderBy((r) =>
      r.createdAt.asc(),
    ).all();
  } catch (err) {
    console.warn(
      "Could not query Role table directly, returning built-in roles:",
      err,
    );
  }

  return {
    totalRoles: builtInRoles.length + customRoles.length,
    builtInRoles,
    customRoles,
    allRoles: [...builtInRoles, ...customRoles],
  };
};

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: string[];
}

export const createCustomRole = async (
  data: CreateRoleData,
  actorId?: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  if (!data.name || !data.name.trim()) {
    throw new Error("Role name is required");
  }

  const normalizedName = data.name.trim().toUpperCase().replace(/\s+/g, "_");

  // Disallow reserving built-in role names
  if (["STUDENT", "FACULTY", "ADMIN", "SUPER_ADMIN"].includes(normalizedName)) {
    throw new Error(
      `Cannot create custom role using reserved system role name "${normalizedName}"`,
    );
  }

  if (!Array.isArray(data.permissions) || data.permissions.length === 0) {
    throw new Error("At least one permission must be assigned to the role");
  }

  // Validate permission codes against system catalog
  const recognizedCodes = new Set(SYSTEM_PERMISSIONS.map((p) => p.code));
  recognizedCodes.add("*");

  const invalidCodes = data.permissions.filter((p) => !recognizedCodes.has(p));
  if (invalidCodes.length > 0) {
    throw new Error(
      `Invalid permission codes: ${invalidCodes.join(", ")}. Please query /super-admin/permissions for recognized codes.`,
    );
  }

  // Check if role already exists in database
  const existingRole = await db.orm.public.Role.where({
    name: normalizedName,
  }).first();
  if (existingRole) {
    throw new Error(`Role with name "${normalizedName}" already exists`);
  }

  const role = await db.orm.public.Role.create({
    name: normalizedName,
    description: data.description?.trim() || null,
    isSystem: false,
    permissions: data.permissions,
    createdAt: Temporal.Now.instant(),
    updatedAt: Temporal.Now.instant(),
  });

  await recordSuperAdminAuditLog(
    "CREATE_ROLE",
    "Role",
    role.id,
    {
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    },
    null,
    actorId,
    ipAddress,
    userAgent,
  );

  return role;
};

// ============================================================
// 6. Permissions Catalog
// ============================================================
export const getAllPermissions = () => {
  const categories: Record<string, typeof SYSTEM_PERMISSIONS> = {};

  for (const perm of SYSTEM_PERMISSIONS) {
    if (!categories[perm.category]) {
      categories[perm.category] = [];
    }
    categories[perm.category]!.push(perm);
  }

  return {
    total: SYSTEM_PERMISSIONS.length,
    permissions: SYSTEM_PERMISSIONS,
    categories,
  };
};

// ============================================================
// 7. Audit Logs Query
// ============================================================
export interface AuditLogsFilter {
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const getAuditLogs = async (filters: AuditLogsFilter) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  let query = db.orm.public.AuditLog;

  if (filters.action) {
    query = query.where({ action: filters.action });
  }

  if (filters.entity) {
    query = query.where({ entity: filters.entity });
  }

  if (filters.userId) {
    query = query.where({ userId: filters.userId });
  }

  const [totalRes, logs] = await Promise.all([
    query.aggregate((a) => ({ count: a.count() })),
    query
      .include("user", (u) => u.select("id", "name", "email", "role"))
      .orderBy((a) => a.createdAt.desc())
      .offset(skip)
      .limit(limit)
      .all(),
  ]);

  const total = totalRes?.count ?? 0;

  // In-memory date filtering if requested
  let filteredLogs = logs;
  if (filters.startDate || filters.endDate) {
    filteredLogs = logs.filter((log) => {
      const logDate = new Date(log.createdAt.toString()).getTime();
      if (filters.startDate && logDate < new Date(filters.startDate).getTime())
        return false;
      if (filters.endDate && logDate > new Date(filters.endDate).getTime())
        return false;
      return true;
    });
  }

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    logs: filteredLogs,
  };
};

// ============================================================
// 8. Live System Health Check
// ============================================================
export const getLiveSystemHealth = async () => {
  const startTime = Date.now();

  // 1. Database Health & Latency
  let dbStatus = "connected";
  let dbLatencyMs = 0;
  let dbError: string | null = null;
  try {
    const t0 = Date.now();
    await db.orm.public.User.limit(1).all();
    dbLatencyMs = Date.now() - t0;
  } catch (err: any) {
    dbStatus = "disconnected";
    dbError = err.message || "Database query failed";
  }

  // 2. Redis Health & Latency
  let redisStatus = "connected";
  let redisLatencyMs = 0;
  let redisError: string | null = null;
  try {
    const t0 = Date.now();
    if (redisClient.isOpen) {
      await redisClient.ping();
      redisLatencyMs = Date.now() - t0;
    } else {
      redisStatus = "disconnected";
      redisError = "Redis client is not open";
    }
  } catch (err: any) {
    redisStatus = "disconnected";
    redisError = err.message || "Redis ping failed";
  }

  // 3. Mailer Health Check
  let mailerStatus = "connected";
  let mailerError: string | null = null;
  try {
    await transporter.verify();
  } catch (err: any) {
    mailerStatus = "disconnected";
    mailerError = err.message || "Nodemailer verification failed";
  }

  // 4. Memory Metrics
  const mem = process.memoryUsage();
  const totalSystemMem = os.totalmem();
  const freeSystemMem = os.freemem();
  const memoryInfo = {
    process: {
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      externalMB: Math.round((mem.external / 1024 / 1024) * 100) / 100,
    },
    system: {
      totalMemoryMB: Math.round((totalSystemMem / 1024 / 1024) * 100) / 100,
      freeMemoryMB: Math.round((freeSystemMem / 1024 / 1024) * 100) / 100,
      usedPercent:
        Math.round(
          ((totalSystemMem - freeSystemMem) / totalSystemMem) * 10000,
        ) / 100,
    },
  };

  // 5. Uptime & Server Details
  const uptimeSeconds = Math.floor(process.uptime());
  const formatSeconds = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  // Determine overall status
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (dbStatus === "disconnected") {
    overallStatus = "unhealthy";
  } else if (
    redisStatus === "disconnected" ||
    mailerStatus === "disconnected"
  ) {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalCheckDurationMs: Date.now() - startTime,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
        error: redisError,
      },
      mailer: {
        status: mailerStatus,
        error: mailerError,
      },
    },
    memory: memoryInfo,
    uptime: {
      uptimeSeconds,
      uptimeFormatted: formatSeconds(uptimeSeconds),
      systemUptimeSeconds: Math.floor(os.uptime()),
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
    },
  };
};

// ============================================================
// 9. Global System Settings
// ============================================================
export const getSystemSettings = async () => {
  let storedSettings: any[] = [];
  try {
    storedSettings = await db.orm.public.SystemSetting.all();
  } catch (err) {
    console.warn("Could not query SystemSetting table, using defaults:", err);
  }

  // Build key-value mapping from stored settings
  const settingsMap: Record<string, any> = {};
  for (const s of storedSettings) {
    settingsMap[s.key] = s.value;
  }

  // Merge with default system settings
  const mergedSettings: Record<string, any> = { ...DEFAULT_SYSTEM_SETTINGS };
  for (const [key, val] of Object.entries(settingsMap)) {
    if (
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val) &&
      mergedSettings[key]
    ) {
      mergedSettings[key] = { ...mergedSettings[key], ...val };
    } else {
      mergedSettings[key] = val;
    }
  }

  return {
    settings: mergedSettings,
    storedEntriesCount: storedSettings.length,
    lastUpdated: storedSettings.length > 0 ? storedSettings[0].updatedAt : null,
  };
};

export const updateSystemSettings = async (
  updates: Record<string, any>,
  actorId?: string,
  ipAddress?: string,
  userAgent?: string,
) => {
  if (
    !updates ||
    typeof updates !== "object" ||
    Object.keys(updates).length === 0
  ) {
    throw new Error(
      "Settings updates object must contain at least one setting key",
    );
  }

  const updatedEntries: Record<string, any> = {};

  for (const [categoryKey, categoryValues] of Object.entries(updates)) {
    const existing = await db.orm.public.SystemSetting.where({
      key: categoryKey,
    }).first();

    if (existing) {
      const mergedVal =
        typeof categoryValues === "object" &&
        categoryValues !== null &&
        !Array.isArray(categoryValues)
          ? { ...(existing.value as any), ...categoryValues }
          : categoryValues;

      const updated = await db.orm.public.SystemSetting.where({
        key: categoryKey,
      }).update({
        value: mergedVal,
        updatedBy: actorId || null,
        updatedAt: Temporal.Now.instant(),
      });
      updatedEntries[categoryKey] = updated!.value;
    } else {
      const created = await db.orm.public.SystemSetting.create({
        key: categoryKey,
        value: categoryValues,
        category: categoryKey,
        description: `Settings for ${categoryKey}`,
        updatedBy: actorId || null,
        createdAt: Temporal.Now.instant(),
        updatedAt: Temporal.Now.instant(),
      });
      updatedEntries[categoryKey] = created.value;
    }
  }

  // Audit log the update
  await recordSuperAdminAuditLog(
    "UPDATE_SYSTEM_SETTINGS",
    "SystemSetting",
    null,
    updatedEntries,
    null,
    actorId,
    ipAddress,
    userAgent,
  );

  return {
    updatedCategories: Object.keys(updatedEntries),
    currentSettings: await getSystemSettings(),
  };
};

export const superAdminService = {
  getDashboardOverview,
  getAllUsers,
  updateUserStatus,
  createAdmin,
  getAllRoles,
  createCustomRole,
  getAllPermissions,
  getAuditLogs,
  getLiveSystemHealth,
  getSystemSettings,
  updateSystemSettings,
};
