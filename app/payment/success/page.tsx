import { Suspense } from "react";

import { PaymentConfirmation } from "./payment-confirmation";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentConfirmation />
    </Suspense>
  );
}
