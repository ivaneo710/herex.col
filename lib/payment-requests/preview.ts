import "server-only";

import type { InstallmentCheckout } from "@/app/checkout/checkout-experience";

const previewPaymentRequests: Record<string, InstallmentCheckout> = {
  "demo-cuotas": {
    kind: "installment",
    title: "Project installment",
    description: "Manual payment agreement with no automatic charges",
    amount: 200,
    currency: "USD",
    projectTotal: 800,
    installmentNumber: 2,
    installmentCount: 4,
    customerName: "HEREX customer",
    projectReference: "Custom website project",
    installments: [
      { number: 1, amount: 200, dueLabel: "Paid", status: "paid" },
      { number: 2, amount: 200, dueLabel: "Available to pay", status: "due" },
      { number: 3, amount: 200, dueLabel: "Upcoming", status: "upcoming" },
      { number: 4, amount: 200, dueLabel: "Upcoming", status: "upcoming" },
    ],
  },
};

export function getPreviewPaymentRequest(token: string): InstallmentCheckout | null {
  if (process.env.PAYMENT_PROVIDER !== "mock" && process.env.NODE_ENV === "production") {
    return null;
  }

  return previewPaymentRequests[token] ?? null;
}
