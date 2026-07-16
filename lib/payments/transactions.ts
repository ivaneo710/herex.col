import type { PaymentStatus } from "./types";

export function normalizePaymentStatus(status: string): PaymentStatus {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "completed";
    case "APPROVED":
      return "approved";
    case "CREATED":
      return "created";
    case "VOIDED":
    case "CANCELLED":
      return "cancelled";
    case "DECLINED":
    case "FAILED":
      return "failed";
    case "NOT_FOUND":
      return "not_found";
    default:
      return "pending";
  }
}
