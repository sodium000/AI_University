import express, { type Express, type Request, type Response } from "express";
import { authRoutes } from "./module/auth/regestration/regestration.route";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logUser } from "./module/auth/login/login.route";
import { studentRoutes } from "./module/student/student.route";
import { facultyRoutes } from "./module/faculty/faculty.route";
import { adminRoutes } from "./module/admin/admin.route";
import { superAdminRoutes } from "./module/super-admin/super-admin.route";
import { paymentRoute } from "./module/payment/payment.route";
import { stripe } from "./config/stripe";
import { paymentService } from "./module/payment/payment.service";

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
        await paymentService.verifyAndFulfillStripeSession(session.id);
        console.log(`Payment fulfilled for session: ${session.id}`);
      } catch (err: any) {
        console.error("Failed to fulfill payment via webhook:", err.message);
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    return response.status(200).json({ received: true });
  },
);

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
app.use("/api/v1/payment", paymentRoute);

export default app;
