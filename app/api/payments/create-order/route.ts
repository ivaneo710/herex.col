import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { signPaymentContext } from "@/lib/payments/context";
import { paymentErrorResponse, readJsonObject } from "@/lib/payments/http";
import { getCustomPayment, getPlan, publicPlan } from "@/lib/payments/plans";
import { PaymentError, type PaymentBuyer } from "@/lib/payments/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const plan = getPlan(body.planId) ?? getCustomPayment(body.amount);
    if (!plan) throw new PaymentError("Select a valid plan or enter an amount between $1 and $10,000 USD.", 400);

    const buyer = validateBuyer(body.buyer);
    const reference = cleanReference(body.reference);
    const provider = getPaymentProvider();
    const transactionId = crypto.randomUUID();
    const paymentToken = signPaymentContext({
      transactionId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      issuedAt: Date.now(),
    });
    const result = await provider.createOrder({
      plan,
      buyer,
      reference,
      appUrl: getAppUrl(request),
      transactionId,
      paymentToken,
    });

    console.info("Payment order created", {
      transactionId,
      provider: provider.name,
      planId: plan.id,
    });

    return NextResponse.json(
      {
        transactionId,
        paymentToken,
        provider: provider.name,
        orderId: result.orderId,
        status: result.status,
        approvalUrl: result.approvalUrl,
        plan: publicPlan(plan),
      },
      { status: 201 },
    );
  } catch (error) {
    return paymentErrorResponse(error, "create payment order");
  }
}

function validateBuyer(value: unknown): PaymentBuyer {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PaymentError("Buyer details are required.", 400);
  }

  const buyer = value as Record<string, unknown>;
  const email = cleanText(buyer.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PaymentError("A valid email is required.", 400);
  }

  return {
    email,
  };
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanReference(value: unknown): string {
  return cleanText(value, 180)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 90);
}

function getAppUrl(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  const appUrl = new URL(configured || new URL(request.url).origin);
  const isLocal = appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1";
  if ((appUrl.protocol !== "https:" && !isLocal) || appUrl.username || appUrl.password) {
    throw new PaymentError("APP_URL is invalid.", 503);
  }
  return appUrl.origin;
}
