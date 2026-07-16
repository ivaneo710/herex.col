import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { paymentErrorResponse, readJsonObject } from "@/lib/payments/http";
import { normalizePaymentStatus, publicTransaction } from "@/lib/payments/transactions";
import { PaymentError } from "@/lib/payments/types";
import { transactionRepository } from "@/lib/transactions/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const transactionId = textValue(body.transactionId);
    const orderId = textValue(body.orderId);
    const transaction = transactionId
      ? await transactionRepository.findByInternalId(transactionId)
      : await transactionRepository.findByProviderOrderId(orderId);

    if (!transaction) throw new PaymentError("Transaction not found.", 404);
    if (orderId && transaction.providerOrderId !== orderId) {
      throw new PaymentError("Order does not match the transaction.", 409);
    }
    if (transaction.paymentStatus === "completed" && transaction.providerCaptureId) {
      return NextResponse.json({
        transaction: publicTransaction(transaction),
        idempotent: true,
      });
    }

    const provider = getPaymentProvider();
    if (provider.name !== transaction.provider) {
      throw new PaymentError("Configured provider does not match the transaction.", 409);
    }

    const result = await provider.captureOrder({
      providerOrderId: transaction.providerOrderId,
      transactionId: transaction.internalTransactionId,
    });
    const completed = result.status === "COMPLETED" && result.rawStatus === "COMPLETED";
    const updated = await transactionRepository.update(transaction.internalTransactionId, {
      providerCaptureId: result.captureId,
      paymentStatus: completed ? "completed" : normalizePaymentStatus(result.rawStatus),
    });
    if (!updated) throw new PaymentError("Transaction update failed.", 500);

    console.info("Payment capture checked", {
      transactionId: updated.internalTransactionId,
      provider: updated.provider,
      status: updated.paymentStatus,
    });

    return NextResponse.json({ transaction: publicTransaction(updated) });
  } catch (error) {
    return paymentErrorResponse(error, "capture payment order");
  }
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}
