"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import styles from "../payment-result.module.css";

type ConfirmationState = "confirming" | "success" | "error";

interface CaptureResponse {
  error?: string;
  transaction?: { paymentStatus?: string };
}

export function PaymentConfirmation() {
  const params = useSearchParams();
  const attempted = useRef(false);
  const [state, setState] = useState<ConfirmationState>("confirming");
  const [message, setMessage] = useState(
    "Do not close this window. Success is only shown after the server confirms the capture.",
  );

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const paymentToken = params.get("paymentToken");
    const orderId = params.get("token") || params.get("orderId");

    async function confirmPayment() {
      try {
        if (!paymentToken || !orderId) {
          throw new Error("No order was found to confirm.");
        }

        const response = await fetch("/api/payments/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentToken, orderId }),
        });
        const data = (await response.json().catch(() => ({}))) as CaptureResponse;
        if (!response.ok) throw new Error(data.error || "The payment could not be confirmed.");
        if (data.transaction?.paymentStatus !== "completed") {
          throw new Error("The payment is not yet marked as completed.");
        }

        setState("success");
        setMessage(
          "Your payment was confirmed by the server. HEREX will review the order and contact you with the next steps.",
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : "The payment could not be confirmed.";
        setState("error");
        setMessage(
          `${detail} If money was debited, do not pay again; contact HEREX to verify the transaction.`,
        );
      }
    }

    void confirmPayment();
  }, [params]);

  const statusText =
    state === "confirming"
      ? "Confirming payment with the server..."
      : state === "success"
        ? "Payment confirmed"
        : "Payment not confirmed";
  const title =
    state === "confirming"
      ? "One moment"
      : state === "success"
        ? "Thank you for your payment"
        : "We need to review the payment";

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div
          className={`${styles.status} ${state === "success" ? styles.success : ""} ${state === "error" ? styles.error : ""}`}
          aria-live="polite"
        >
          {statusText}
        </div>
        <h1>{title}</h1>
        <p>{message}</p>
        {state !== "confirming" ? (
          <Link className={styles.action} href="/">
            Back to HEREX
          </Link>
        ) : null}
      </section>
    </main>
  );
}
