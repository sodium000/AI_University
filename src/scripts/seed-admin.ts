import { db } from "../prisma/db";
import { Temporal } from "@js-temporal/polyfill";
import bcrypt from "bcryptjs";
import config from "../config";
import { jwtUtils } from "../utils/createJwtToken";
import { SignOptions } from "jsonwebtoken";

async function main() {
  console.log("=== Seeding Initial Admin User & Running Tests ===");

  const adminEmail = "admin@university.edu";
  let admin = await db.orm.public.User.where({ email: adminEmail }).first();

  if (!admin) {
    const hashedPassword = await bcrypt.hash("Admin@123456", Number(config.bcrypt_salt_rounds) || 10);
    admin = await db.orm.public.User.create({
      name: "University Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "SUPER_ADMIN" as const,
      status: "ACTIVE" as const,
      emailVerified: true,
      credential: "EMAIL" as const,
      createdAt: Temporal.Now.instant(),
      updatedAt: Temporal.Now.instant(),
    });
    console.log("Created admin user:", admin.email, "id:", admin.id);
  } else {
    console.log("Admin user already exists:", admin.email, "id:", admin.id);
  }

  // Generate an admin token for testing API endpoints
  const token = jwtUtils.createToken(
    { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    config.jwt_access_secret!,
    config.jwt_access_expires_in as SignOptions,
  );
  console.log("Admin JWT token generated successfully.");

  // Test dashboard stats service directly
  const { adminService } = await import("../module/admin/admin.service");
  console.log("Testing adminService.getDashboardStats()...");
  const stats = await adminService.getDashboardStats();
  console.log("Dashboard stats retrieved:", JSON.stringify(stats.counts, null, 2));

  // Test reports service
  console.log("Testing adminService.generateReports({ type: 'all' })...");
  const reports = await adminService.generateReports({ type: "all" });
  console.log("Reports generated successfully. Academic results count:", reports.academicReport?.totalResultsRecorded);

  console.log("=== Admin Seed & Verification Completed Successfully ===");
}

main()
  .catch((err) => {
    console.error("Error in seed-admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Teardown db connection cleanly
    await (db as any).close?.();
  });
