import "server-only";

import type { PaymentPlan } from "./types";

export const plans = {
  essential: { id: "essential", name: "Essential", amount: 300, currency: "USD" },
  growth: { id: "growth", name: "Growth", amount: 600, currency: "USD" },
  impact: { id: "impact", name: "Impact", amount: 1000, currency: "USD" },
} as const satisfies Record<PaymentPlan["id"], PaymentPlan>;

export function getPlan(planId: unknown): PaymentPlan | null {
  if (typeof planId !== "string") return null;
  return plans[planId.toLowerCase() as PaymentPlan["id"]] ?? null;
}

export function publicPlan(plan: PaymentPlan): PaymentPlan {
  return { ...plan };
}
