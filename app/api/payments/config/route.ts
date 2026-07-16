import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { paymentErrorResponse } from "@/lib/payments/http";

export const runtime = "nodejs";

export function GET() {
  try {
    const provider = getPaymentProvider();
    if (provider.name !== "paypal") return NextResponse.json({ provider: provider.name });

    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
    }

    return NextResponse.json({ provider: "paypal", clientId, currency: "USD" });
  } catch (error) {
    return paymentErrorResponse(error, "load payment configuration");
  }
}
