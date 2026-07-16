import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { verifyPaymentContext } from "@/lib/payments/context";
import { paymentErrorResponse, readJsonObject } from "@/lib/payments/http";
import { normalizePaymentStatus } from "@/lib/payments/transactions";
import { PaymentError } from "@/lib/payments/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const orderId = textValue(body.orderId);
    if (!orderId) throw new PaymentError("Order ID is required.", 400);
    const context = verifyPaymentContext(body.paymentToken);

    const provider = getPaymentProvider();
    const current = await provider.getOrderStatus({ providerOrderId: orderId });
    verifyOrder(current, context);

    if (normalizePaymentStatus(current.status) === "completed") {
      return NextResponse.json({ transaction: transactionResponse(context, provider.name, orderId, current.captureId, "completed"), idempotent: true });
    }

    const result = await provider.captureOrder({
      providerOrderId: orderId,
      transactionId: context.transactionId,
    });
    const confirmed = await provider.getOrderStatus({ providerOrderId: orderId });
    verifyOrder(confirmed, context);
    const completed = result.status === "COMPLETED" && confirmed.status === "COMPLETED";
    const paymentStatus = completed ? "completed" : normalizePaymentStatus(confirmed.status);
    const captureId = confirmed.captureId ?? result.captureId;

    console.info("Payment capture checked", {
      transactionId: context.transactionId,
      provider: provider.name,
      status: paymentStatus,
    });

    return NextResponse.json({ transaction: transactionResponse(context, provider.name, orderId, captureId, paymentStatus) });
  } catch (error) {
    return paymentErrorResponse(error, "capture payment order");
  }
}

function verifyOrder(
  order: { amount: number | null; currency: string | null; customId: string | null },
  context: ReturnType<typeof verifyPaymentContext>,
) {
  if (order.amount !== context.amount || order.currency !== context.currency || order.customId !== context.transactionId) {
    console.warn("PayPal order verification mismatch", {
      amountMatches: order.amount === context.amount,
      currencyMatches: order.currency === context.currency,
      transactionMatches: order.customId === context.transactionId,
      providerAmount: order.amount,
      expectedAmount: context.amount,
      providerCurrency: order.currency,
    });
    throw new PaymentError("PayPal order details do not match this payment.", 409);
  }
}

function transactionResponse(
  context: ReturnType<typeof verifyPaymentContext>,
  provider: "mock" | "paypal",
  orderId: string,
  captureId: string | null,
  paymentStatus: ReturnType<typeof normalizePaymentStatus>,
) {
  const now = new Date(context.issuedAt).toISOString();
  return {
    internalTransactionId: context.transactionId,
    provider,
    providerOrderId: orderId,
    providerCaptureId: captureId,
    planId: context.planId,
    planName: context.planName,
    amount: context.amount,
    currency: context.currency,
    buyerName: "",
    buyerEmail: "",
    paymentStatus,
    createdAt: now,
    updatedAt: new Date().toISOString(),
  };
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}
