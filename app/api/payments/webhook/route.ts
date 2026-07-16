import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  console.warn("PayPal webhook processing is disabled", {
    hasWebhookId: Boolean(process.env.PAYPAL_WEBHOOK_ID),
    provider: process.env.PAYMENT_PROVIDER || "mock",
  });

  return NextResponse.json(
    {
      error:
        "Webhook processing requires signature verification and durable transaction storage.",
    },
    { status: 501 },
  );
}
