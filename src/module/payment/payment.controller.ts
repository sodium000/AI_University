import { Response } from "express";
import { paymentService } from "./payment.service";
import { AuthRequest } from "../../middleware/auth";

const createStripeCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.student?.id;
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "invoiceId is required",
        data: null,
      });
    }
    const data = await paymentService.createStripeCheckoutSession(
      studentId,
      invoiceId,
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Stripe checkout session created successfully",
      data,
    });
  } catch (error: any) {
    return res.status(error.message.includes("not found") ? 404 : 400).json({
      success: false,
      statusCode: error.message.includes("not found") ? 404 : 400,
      message: error.message || "Failed to create checkout session",
      data: null,
    });
  }
};

export const paymentController = {
  createStripeCheckoutSession,
};
