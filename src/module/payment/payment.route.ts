import { Router } from "express";
import { auth } from "../../middleware/auth";
import { paymentController } from "./payment.controller";

const route = Router();

route.post(
  "/create-payment",
  auth("STUDENT"),
  paymentController.createStripeCheckoutSession,
);
// route.post("/verify-payment", paymentController.verifyStripePayment);

export const paymentRoute = route;
