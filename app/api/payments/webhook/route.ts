import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { paymentErrorResponse, readJsonObject } from "@/lib/payments/http";
import { PaymentError } from "@/lib/payments/types";

export const runtime = "nodejs";

const handledEvents = new Set([
  "CHECKOUT.ORDER.APPROVED",
  "CHECKOUT.PAYMENT-APPROVAL.REVERSED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.DECLINED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
]);

export async function POST(request: Request) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) throw new PaymentError("PayPal webhook is not configured.", 503);

    const event = await readJsonObject(request);
    const provider = getPaymentProvider();
    if (provider.name !== "paypal" || !provider.verifyWebhookSignature) {
      throw new PaymentError("PayPal webhook verification is unavailable.", 503);
    }

    const verified = await provider.verifyWebhookSignature({
      authAlgo: requiredHeader(request, "paypal-auth-algo"),
      certUrl: requiredHeader(request, "paypal-cert-url"),
      transmissionId: requiredHeader(request, "paypal-transmission-id"),
      transmissionSignature: requiredHeader(request, "paypal-transmission-sig"),
      transmissionTime: requiredHeader(request, "paypal-transmission-time"),
      webhookId,
      event,
    });
    if (!verified) throw new PaymentError("Invalid PayPal webhook signature.", 401);

    const eventType = textValue(event.event_type, 120);
    const eventId = textValue(event.id, 120);
    if (!handledEvents.has(eventType)) {
      console.info("Ignored verified PayPal webhook", { eventId, eventType });
      return NextResponse.json({ received: true, handled: false });
    }

    const resource = objectValue(event.resource);
    console.info("Verified PayPal webhook", {
      eventId,
      eventType,
      resourceId: textValue(resource.id, 120),
      resourceStatus: textValue(resource.status, 80),
    });

    return NextResponse.json({ received: true, handled: true });
  } catch (error) {
    return paymentErrorResponse(error, "process PayPal webhook");
  }
}

function requiredHeader(request: Request, name: string): string {
  const value = request.headers.get(name)?.trim();
  if (!value) throw new PaymentError(`Missing PayPal webhook header: ${name}.`, 400);
  return value.slice(0, 2000);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}
