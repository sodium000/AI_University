import config from "../../config";
import { stripe } from "../../config/stripe";
import { db } from "../../prisma/db";

const createStripeCheckoutSession = async (
  studentId: string,
  invoiceId: string,
) => {
  if (!studentId) {
    throw new Error("Student profile record not found.");
  }
  // 1. Fetch the invoice
  const invoice = await db.orm.public.Invoice.where({
    id: invoiceId,
    studentId,
  }).first();
  if (!invoice) {
    throw new Error("Invoice not found or unauthorized.");
  }
  if (invoice.status === "PAID") {
    throw new Error("This invoice is already paid.");
  }
  if (invoice.status === "CANCELLED") {
    throw new Error("Cannot pay a cancelled invoice.");
  }

  const student = await db.orm.public.Student.where({
    id: studentId,
  })
    .include("user", (u) => u.select("email"))
    .first();
  const customerEmail = student?.user?.email;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  // 2. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price: config.stripeSemesterPriceId!,
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      studentId,
    },
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/payment/cancel?invoice_id=${invoice.id}`,
  });
  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
};

const verifyAndFulfillStripeSession = async (sessionId: string) => {
  if (!sessionId) {
    throw new Error("sessionId is required.");
  }
  // 1. Retrieve session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new Error("Payment has not been completed on Stripe.");
  }
  const invoiceId = session.metadata?.invoiceId;
  const studentId = session.metadata?.studentId;
  if (!invoiceId) {
    throw new Error("Missing invoiceId metadata in Stripe session.");
  }
  const invoice = await db.orm.public.Invoice.where({ id: invoiceId }).first();
  if (!invoice) {
    throw new Error("Associated invoice not found.");
  }
  const transactionId = (session.payment_intent as string) || session.id;
  // 2. Check if payment was already recorded (avoids double recording)
  const existingPayment = await db.orm.public.Payment.where({
    transactionId,
  }).first();
  if (existingPayment) {
    return {
      message: "Payment was already processed.",
      payment: existingPayment,
      invoice,
    };
  }
  const paidAmount = Number(session.amount_total) / 100;
  // 3. Create Payment record in DB
  const payment = await db.orm.public.Payment.create({
    invoiceId: invoice.id,
    amount: paidAmount,
    method: "ONLINE" as any,
    transactionId,
    status: "SUCCESS" as any,
    createdAt: new Date(),
  });
  // 4. Update Invoice status to PAID
  await db.orm.public.Invoice.where({ id: invoice.id }).update({
    status: "PAID" as any,
  });
  // 5. Send Notification to Student
  const student = await db.orm.public.Student.where({ id: studentId }).first();
  if (student?.userId) {
    await db.orm.public.Notification.create({
      userId: student.userId,
      title: "Invoice Paid Successfully",
      message: `Your payment of $${paidAmount} for invoice #${invoice.invoiceNo} was successful. Transaction ID: ${transactionId}`,
      type: "INFO" as any,
      isRead: false,
      createdAt: new Date(),
    });
  }
  return {
    message: "Payment successfully recorded.",
    payment,
    invoiceStatus: "PAID",
  };
};

export const paymentService = {
  createStripeCheckoutSession,
  verifyAndFulfillStripeSession,
};
