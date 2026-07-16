import "server-only";

import { MockPaymentProvider } from "./providers/mock";
import { PayPalPaymentProvider } from "./providers/paypal";
import { PaymentError, type PaymentProvider } from "./types";

export function getPaymentProvider(
  env: NodeJS.ProcessEnv = process.env,
): PaymentProvider {
  const configured = env.PAYMENT_PROVIDER?.trim().toLowerCase();
  const provider = configured || (env.NODE_ENV === "production" ? "" : "mock");
  if (provider === "paypal") return new PayPalPaymentProvider(env);
  if (provider === "mock") return new MockPaymentProvider();

  throw new PaymentError(
    provider ? `Unsupported payment provider: ${provider}` : "Payment provider is not configured.",
    503,
  );
}
