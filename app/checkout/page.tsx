import { getPlan } from "@/lib/payments/plans";

import { CheckoutExperience } from "./checkout-experience";

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { plan: planId } = await searchParams;
  const plan = getPlan(planId);

  return (
    <CheckoutExperience
      checkout={
        plan
          ? {
              kind: "plan",
              title: `${plan.name} plan`,
              description: "One-time payment for HEREX services",
              amount: plan.amount,
              currency: plan.currency,
              planId: plan.id,
            }
          : {
              kind: "open",
              title: "Custom payment",
              description: "Enter the amount agreed with HEREX",
              currency: "USD",
            }
      }
    />
  );
}
