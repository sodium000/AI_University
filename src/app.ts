import express, { type Express, type Request, type Response } from "express";
import { authRoutes } from "./module/auth/regestration/regestration.route";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logUser } from "./module/auth/login/login.route";
import { studentRoutes } from "./module/student/student.route";
import { facultyRoutes } from "./module/faculty/faculty.route";
import { adminRoutes } from "./module/admin/admin.route";
import { superAdminRoutes } from "./module/super-admin/super-admin.route";
import { stripe } from "./config/stripe";
import { studentService } from "./module/student/student.service";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sendFailure, sendSuccess } from "./utils/apiResponse";
import { AppError } from "./errors/AppError";

const app: Express = express();

// middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    let event = request.body;
    // Only verify the event if you have an endpoint secret defined.
    // Otherwise use the basic event deserialized with JSON.parse
    if (endpointSecret) {
      // Get the signature sent by Stripe
      const signature = request.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature as string,
          endpointSecret!,
        );
      } catch (err: any) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return response.sendStatus(400);
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      try {
        await studentService.verifyAndFulfillPayment(session.id);
        console.log(`Payment fulfilled for session: ${session.id}`);
      } catch (err: any) {
        console.error("Failed to fulfill payment via webhook:", err.message);
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    return response.status(200).json({ received: true });
  },
);

// Payment success redirect handler (called by Stripe after checkout)
// This auto-verifies and records the payment when webhook can't reach localhost
app.get("/payment/success", async (req: Request, res: Response) => {
  const sessionId = req.query?.session_id as string;
  if (!sessionId) {
    return sendFailure(
      res,
      AppError.badRequest("Missing session_id query parameter.", undefined, {
        hint: "Stripe redirects here with ?session_id=cs_test_... after checkout.",
      }),
      "Missing session_id query parameter.",
    );
  }
  try {
    const result = await studentService.verifyAndFulfillPayment(sessionId);
    return sendSuccess(
      res,
      200,
      result.message || "Payment verified and recorded successfully.",
      {
        payment: result.payment,
        invoiceStatus: result.invoiceStatus,
      },
    );
  } catch (err: unknown) {
    return sendFailure(res, err, "Failed to verify payment.");
  }
});

// Payment cancel redirect handler (called by Stripe when user cancels checkout)
app.get("/payment/cancel", (req: Request, res: Response) => {
  const invoiceId = req.query?.invoice_id as string;
  return res.status(200).json({
    success: false,
    statusCode: 200,
    message: "Payment was cancelled. You can retry payment from your invoices.",
    data: { invoiceId: invoiceId || null },
  });
});

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// root route
app.get("/", (req: Request, res: Response) => {
  res.send("<h1>AI Agentic University Backend</h1>");
});

app.use("/", authRoutes);
app.use("/auth", logUser);
app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/faculty", facultyRoutes);
app.use("/admin", adminRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/super-admin", superAdminRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
