import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { paymentErrorResponse, readJsonObject } from "@/lib/payments/http";
import { getPlan, publicPlan } from "@/lib/payments/plans";
import { PaymentError, type PaymentBuyer } from "@/lib/payments/types";
import { transactionRepository } from "@/lib/transactions/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const plan = getPlan(body.planId);
    if (!plan) throw new PaymentError("Invalid plan.", 400);

    const buyer = validateBuyer(body.buyer);
    const provider = getPaymentProvider();
    const transaction = await transactionRepository.create({
      provider: provider.name,
      providerOrderId: "",
      providerCaptureId: null,
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      paymentStatus: "pending",
    });
    const result = await provider.createOrder({
      plan,
      buyer,
      appUrl: getAppUrl(request),
      transactionId: transaction.internalTransactionId,
    });
    await transactionRepository.update(transaction.internalTransactionId, {
      providerOrderId: result.orderId,
      paymentStatus: result.status === "CREATED" ? "created" : "pending",
    });

    console.info("Payment order created", {
      transactionId: transaction.internalTransactionId,
      provider: provider.name,
      planId: plan.id,
    });

    return NextResponse.json(
      {
        transactionId: transaction.internalTransactionId,
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
    name: cleanText(buyer.name, 120),
    email,
    whatsapp: cleanText(buyer.whatsapp, 40),
  };
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getAppUrl(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  return configured || new URL(request.url).origin;
}
