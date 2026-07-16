import "server-only";

import { MockPaymentProvider } from "./providers/mock";
import { PayPalPaymentProvider } from "./providers/paypal";
import { PaymentError, type PaymentProvider } from "./types";

export function getPaymentProvider(
  env: NodeJS.ProcessEnv = process.env,
): PaymentProvider {
  const provider = (env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (provider === "paypal") return new PayPalPaymentProvider(env);
  if (provider === "mock") return new MockPaymentProvider();

  throw new PaymentError(`Unsupported payment provider: ${provider}`);
}
