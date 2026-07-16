import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PaymentError, type PaymentCurrency, type PaymentPlan } from "./types";

export interface PaymentContext {
  transactionId: string;
  planId: PaymentPlan["id"];
  planName: string;
  amount: number;
  currency: PaymentCurrency;
  issuedAt: number;
}

export function signPaymentContext(context: PaymentContext): string {
  const payload = Buffer.from(JSON.stringify(context)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyPaymentContext(token: unknown): PaymentContext {
  if (typeof token !== "string" || token.length > 2000) {
    throw new PaymentError("Payment confirmation is missing.", 400);
  }

  const [payload, provided, extra] = token.split(".");
  if (!payload || !provided || extra) throw new PaymentError("Invalid payment confirmation.", 400);

  const expected = signature(payload);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new PaymentError("Invalid payment confirmation.", 400);
  }

  try {
    const context = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PaymentContext;
    const validPlanId = ["essential", "growth", "impact", "custom"].includes(context.planId);
    const validAmount = Number.isFinite(context.amount)
      && context.amount >= 1
      && context.amount <= 10_000
      && context.amount === Math.round(context.amount * 100) / 100;
    const validIssuedAt = Number.isFinite(context.issuedAt)
      && context.issuedAt <= Date.now() + 60_000;
    if (
      !/^[0-9a-f-]{36}$/i.test(context.transactionId)
      || !validPlanId
      || !context.planName
      || context.planName.length > 120
      || context.currency !== "USD"
      || !validAmount
      || !validIssuedAt
    ) {
      throw new Error("Incomplete context");
    }
    if (Date.now() - context.issuedAt > 24 * 60 * 60 * 1000) {
      throw new PaymentError("This payment session has expired.", 410);
    }
    return context;
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw new PaymentError("Invalid payment confirmation.", 400);
  }
}

function signature(payload: string): string {
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) throw new PaymentError("Payment signing is not configured.", 503);
  const signingKey = createHmac("sha256", secret)
    .update("herex-payment-context:v1")
    .digest();
  return createHmac("sha256", signingKey).update(payload).digest("base64url");
}
