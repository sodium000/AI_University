import Stripe from "stripe";
import config from ".";

const secretKey = config.stripeSecretKey;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is missing");
}

export const stripe = new Stripe(secretKey);
