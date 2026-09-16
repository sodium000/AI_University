import app from "../app";
import { db } from "../prisma/db";
import { jwtUtils } from "../utils/createJwtToken";
import config from "../config";
import { SignOptions } from "jsonwebtoken";
import type { Server } from "http";

async function runTests() {
  console.log("=== Testing All 17 Admin Endpoints ===");

  // 1. Get or create Admin user for testing
  let admin = await db.orm.public.User.where({ email: "admin@university.edu" }).first();
  if (!admin) {
    throw new Error("Admin user not found. Run seed-admin first.");
  }

  const token = jwtUtils.createToken(
    { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    config.jwt_access_secret!,
    config.jwt_access_expires_in as SignOptions,
  );

  // 2. Start HTTP server on a random port
  const server: Server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3000;
  const baseUrl = `http://localhost:${port}`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const results: Record<string, boolean> = {};

  async function testEndpoint(name: string, fn: () => Promise<any>) {
    try {
      await fn();
      results[name] = true;
      console.log(`✅ [PASS] ${name}`);
    } catch (err: any) {
      results[name] = false;
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  try {
    // 1. GET /admin/dashboard
    await testEndpoint("GET /admin/dashboard", async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 2. POST /admin/departments
    let deptId = "";
    const testDeptCode = `DEPT_${Math.floor(1000 + Math.random() * 9000)}`;
    await testEndpoint("POST /admin/departments", async () => {
      const res = await fetch(`${baseUrl}/admin/departments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Department of AI and Robotics",
          code: testDeptCode,
          facultyName: "Faculty of Engineering",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      deptId = json.data.id;
    });

    // 3. PATCH /admin/departments/:id
    await testEndpoint("PATCH /admin/departments/:id", async () => {
      const res = await fetch(`${baseUrl}/admin/departments/${deptId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: "Department of AI and Autonomous Systems",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 4. POST /admin/programs
    let programId = "";
    const testProgCode = `PROG_${Math.floor(1000 + Math.random() * 9000)}`;
    await testEndpoint("POST /admin/programs", async () => {
      const res = await fetch(`${baseUrl}/admin/programs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "B.Sc. in Intelligent Systems",
          code: testProgCode,
          departmentId: deptId,
          durationYears: 4,
          totalCredits: 140,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      programId = json.data.id;
    });

    // 5. POST /admin/courses
    let courseId = "";
    const testCourseCode = `CS${Math.floor(1000 + Math.random() * 9000)}`;
    await testEndpoint("POST /admin/courses", async () => {
      const res = await fetch(`${baseUrl}/admin/courses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: testCourseCode,
          title: "Introduction to Agentic AI",
          description: "Foundations of Autonomous Intelligent Agents",
          credit: 3.0,
          departmentId: deptId,
          programId: programId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      courseId = json.data.id;
    });

    // 6. POST /admin/semesters
    let semesterId = "";
    await testEndpoint("POST /admin/semesters", async () => {
      const year = new Date().getFullYear();
      const res = await fetch(`${baseUrl}/admin/semesters`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `Fall ${year + 1}`,
          year: year + 1,
          startDate: `${year + 1}-09-01`,
          endDate: `${year + 1}-12-20`,
          status: "UPCOMING",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      semesterId = json.data.id;
    });

    // 7. POST /admin/faculty
    let facultyId = "";
    const facultyEmail = `prof_${Date.now()}@university.edu`;
    await testEndpoint("POST /admin/faculty", async () => {
      const res = await fetch(`${baseUrl}/admin/faculty`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Dr. Alan Turing",
          email: facultyEmail,
          password: "Faculty@123456",
          departmentId: deptId,
          designation: "Professor",
          specialization: "Artificial Intelligence",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      facultyId = json.data.id;
    });

    // 8. GET /admin/faculty
    await testEndpoint("GET /admin/faculty", async () => {
      const res = await fetch(`${baseUrl}/admin/faculty?limit=5`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 9. POST /admin/sections
    let sectionId = "";
    await testEndpoint("POST /admin/sections", async () => {
      const res = await fetch(`${baseUrl}/admin/sections`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Section 01",
          courseId,
          semesterId,
          facultyId,
          capacity: 2,
          schedules: [
            {
              dayOfWeek: 1,
              startTime: "10:00",
              endTime: "11:30",
              room: "Lab 402",
              building: "Turing Hall",
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      sectionId = json.data.id;
    });

    // 10. POST /admin/students
    let studentId = "";
    const studentEmail = `student_${Date.now()}@university.edu`;
    await testEndpoint("POST /admin/students", async () => {
      const res = await fetch(`${baseUrl}/admin/students`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: studentEmail,
          departmentId: deptId,
          programId: programId,
          admissionYear: new Date().getFullYear(),
          currentYear: 1,
          currentSemester: 1,
          gender: "Female",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      studentId = json.data.id;
    });

    // 11. GET /admin/students
    await testEndpoint("GET /admin/students", async () => {
      const res = await fetch(`${baseUrl}/admin/students?limit=5`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 12. PATCH /admin/students/:id
    await testEndpoint("PATCH /admin/students/:id", async () => {
      const res = await fetch(`${baseUrl}/admin/students/${studentId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          address: "221B Baker Street",
          phone: "+1234567890",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 13. POST /admin/enrollments (Force enroll)
    await testEndpoint("POST /admin/enrollments (Force-enroll)", async () => {
      const res = await fetch(`${baseUrl}/admin/enrollments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId,
          sectionId,
          overrideCapacity: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 14. GET /admin/enrollments
    await testEndpoint("GET /admin/enrollments", async () => {
      const res = await fetch(`${baseUrl}/admin/enrollments?limit=5`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 15. GET /admin/payments
    await testEndpoint("GET /admin/payments", async () => {
      const res = await fetch(`${baseUrl}/admin/payments?limit=5`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 16. GET /admin/reports
    await testEndpoint("GET /admin/reports", async () => {
      const res = await fetch(`${baseUrl}/admin/reports?type=all`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    // 17. DELETE /admin/students/:id (Deactivate)
    await testEndpoint("DELETE /admin/students/:id", async () => {
      const res = await fetch(`${baseUrl}/admin/students/${studentId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
    });

    console.log("\n=================================");
    console.log("Endpoint Test Summary:");
    const passCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    console.log(`Passed: ${passCount} / ${totalCount}`);
    console.log("=================================");

    if (passCount !== totalCount) {
      throw new Error(`Only ${passCount}/${totalCount} tests passed.`);
    }
  } finally {
    server.close();
    await (db as any).close?.();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
