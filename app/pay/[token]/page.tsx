import { notFound } from "next/navigation";

import { CheckoutExperience } from "@/app/checkout/checkout-experience";
import { getPreviewPaymentRequest } from "@/lib/payment-requests/preview";

interface PaymentRequestPageProps {
  params: Promise<{ token: string }>;
}

export default async function PaymentRequestPage({ params }: PaymentRequestPageProps) {
  const { token } = await params;
  const paymentRequest = getPreviewPaymentRequest(token);
  if (!paymentRequest) notFound();

  return <CheckoutExperience checkout={paymentRequest} />;
}
