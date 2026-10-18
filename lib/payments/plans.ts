import "server-only";

import type { FixedPaymentPlan, FixedPlanId, PaymentPlan } from "./types";

export const plans = {
  essential: { id: "essential", name: "Essential", amount: 600, currency: "USD" },
  growth: { id: "growth", name: "Growth", amount: 1200, currency: "USD" },
  impact: { id: "impact", name: "Impact", amount: 2500, currency: "USD" },
  web_pro: { id: "web_pro", name: "Professional Website", amount: 1500, currency: "USD" },
  web_advanced: { id: "web_advanced", name: "Advanced Website", amount: 3000, currency: "USD" },
} as const satisfies Record<FixedPlanId, FixedPaymentPlan>;

export function getPlan(planId: unknown): FixedPaymentPlan | null {
  if (typeof planId !== "string") return null;
  return plans[planId.toLowerCase() as keyof typeof plans] ?? null;
}

export function getCustomPayment(amount: unknown): PaymentPlan | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const normalized = Math.round(amount * 100) / 100;
  if (normalized < 1 || normalized > 10000 || normalized !== amount) return null;

  return { id: "custom", name: "Custom payment", amount: normalized, currency: "USD" };
}

export function publicPlan(plan: PaymentPlan): PaymentPlan {
  return { ...plan };
}
