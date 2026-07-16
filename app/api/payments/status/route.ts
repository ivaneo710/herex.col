import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { paymentErrorResponse } from "@/lib/payments/http";
import { normalizePaymentStatus, publicTransaction } from "@/lib/payments/transactions";
import { PaymentError } from "@/lib/payments/types";
import { transactionRepository } from "@/lib/transactions/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const transactionId = params.get("transactionId")?.slice(0, 200) || "";
    const orderId = params.get("orderId")?.slice(0, 200) || "";
    const transaction = transactionId
      ? await transactionRepository.findByInternalId(transactionId)
      : await transactionRepository.findByProviderOrderId(orderId);

    if (!transaction) throw new PaymentError("Transaction not found.", 404);

    const provider = getPaymentProvider();
    if (provider.name !== transaction.provider) {
      throw new PaymentError("Configured provider does not match the transaction.", 409);
    }
    const status = await provider.getOrderStatus({
      providerOrderId: transaction.providerOrderId,
    });
    const updated = await transactionRepository.update(transaction.internalTransactionId, {
      paymentStatus: normalizePaymentStatus(status.status),
      providerCaptureId: status.captureId || transaction.providerCaptureId,
    });
    if (!updated) throw new PaymentError("Transaction update failed.", 500);

    return NextResponse.json({ transaction: publicTransaction(updated) });
  } catch (error) {
    return paymentErrorResponse(error, "check payment status");
  }
}
