import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { verifyPaymentContext } from "@/lib/payments/context";
import { paymentErrorResponse } from "@/lib/payments/http";
import { normalizePaymentStatus } from "@/lib/payments/transactions";
import { PaymentError } from "@/lib/payments/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const orderId = params.get("orderId")?.slice(0, 200) || "";
    if (!orderId) throw new PaymentError("Order ID is required.", 400);
    const context = verifyPaymentContext(params.get("paymentToken"));

    const provider = getPaymentProvider();
    const status = await provider.getOrderStatus({
      providerOrderId: orderId,
    });
    if (status.amount !== context.amount || status.currency !== context.currency || status.customId !== context.transactionId) {
      throw new PaymentError("PayPal order details do not match this payment.", 409);
    }

    return NextResponse.json({
      transaction: {
        internalTransactionId: context.transactionId,
        provider: provider.name,
        providerOrderId: orderId,
        providerCaptureId: status.captureId,
        planId: context.planId,
        planName: context.planName,
        amount: context.amount,
        currency: context.currency,
        buyerName: "",
        buyerEmail: "",
        paymentStatus: normalizePaymentStatus(status.status),
        createdAt: new Date(context.issuedAt).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return paymentErrorResponse(error, "check payment status");
  }
}
