import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  if (process.env.PAYMENT_PROVIDER !== "paypal") {
    return NextResponse.json({ provider: process.env.PAYMENT_PROVIDER || "mock" });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
  }

  return NextResponse.json({ provider: "paypal", clientId, currency: "USD" });
}
