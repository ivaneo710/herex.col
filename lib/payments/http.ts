import "server-only";

import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { PaymentError } from "./types";

export function paymentErrorResponse(error: unknown, action: string): NextResponse {
  const statusCode = error instanceof PaymentError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : "Unknown payment error";

  console.error(`Unable to ${action}`, { statusCode, message });
  return NextResponse.json(
    { error: statusCode >= 500 ? "Payment service unavailable" : message },
    { status: statusCode },
  );
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 256_000) throw new PaymentError("Request body is too large.", 413);
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 256_000) {
      throw new PaymentError("Request body is too large.", 413);
    }
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new PaymentError("Invalid JSON body.", 400);
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw new PaymentError("Invalid JSON body.", 400);
  }
}
