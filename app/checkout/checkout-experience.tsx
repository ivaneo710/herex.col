"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import styles from "./checkout.module.css";

interface CheckoutBase {
  title: string;
  description: string;
  currency: "USD";
}

interface OpenCheckout extends CheckoutBase {
  kind: "open";
}

interface PlanCheckout extends CheckoutBase {
  kind: "plan";
  amount: number;
  planId: "essential" | "growth" | "impact";
}

export type CheckoutConfiguration = OpenCheckout | PlanCheckout;

interface CheckoutExperienceProps {
  checkout: CheckoutConfiguration;
}

type CheckoutState = "idle" | "loading" | "ready";

export function CheckoutExperience({ checkout }: CheckoutExperienceProps) {
  const fixedAmount = checkout.kind === "plan" ? checkout.amount : null;
  const [amount, setAmount] = useState(fixedAmount ? String(fixedAmount) : "");
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");

  const numericAmount = useMemo(() => Number.parseFloat(amount) || 0, [amount]);
  const formattedAmount = formatMoney(numericAmount, checkout.currency);

  function handleAmountChange(value: string) {
    const normalized = value.replace(/[^0-9.]/g, "");
    const [whole, ...decimalParts] = normalized.split(".");
    const decimal = decimalParts.join("").slice(0, 2);
    setAmount(decimalParts.length ? `${whole}.${decimal}` : whole);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (numericAmount < 1 || numericAmount > 10000) {
      setError("Enter an amount between $1 and $10,000 USD.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid contact email for this payment.");
      return;
    }

    setCheckoutState("loading");
    window.setTimeout(() => setCheckoutState("ready"), 250);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.formSide}>
          <header className={styles.header}>
            <Link className={styles.brand} href="/" aria-label="Volver a HEREX">
              HEREX<span>.</span>
            </Link>
            <div className={styles.secureLabel}>
              <span className={styles.secureDot} aria-hidden="true" />
              Secure payment
            </div>
          </header>

          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Payment</span>
          </nav>

          <div className={styles.intro}>
            <span className={styles.eyebrow}>SECURE PAYMENT IN USD</span>
            <h1>Complete your payment</h1>
            <p>Confirm the payment details. In the next step, you will continue securely with PayPal.</p>
          </div>

          <div className={styles.stepper} aria-label="Checkout progress">
            <div className={`${styles.step} ${styles.stepActive}`}>
              <span>1</span>
              <div><strong>Payment details</strong><small>{checkoutState === "ready" ? "Completed" : "Amount and contact"}</small></div>
            </div>
            <span className={`${styles.stepLine} ${checkoutState === "ready" ? styles.stepLineComplete : ""}`} aria-hidden="true" />
            <div className={`${styles.step} ${checkoutState === "ready" ? styles.stepActive : ""}`}>
              <span>2</span>
              <div><strong>Payment method</strong><small>Card or PayPal</small></div>
            </div>
          </div>

          {checkoutState !== "ready" ? <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {checkout.kind === "open" ? (
              <label className={styles.field}>
                <span>Payment amount</span>
                <div className={`${styles.control} ${styles.amountControl}`}>
                  <span aria-hidden="true">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    placeholder="0.00"
                    aria-describedby="amount-help"
                  />
                  <strong>USD</strong>
                </div>
                <small id="amount-help">Enter the amount agreed with HEREX.</small>
              </label>
            ) : (
              <div className={styles.lockedAmount}>
                <div>
                  <span>Payment amount</span>
                  <strong>{formattedAmount}</strong>
                </div>
                <span className={styles.lockedBadge}>Fixed amount</span>
              </div>
            )}

            <label className={styles.field}>
              <span>Contact email</span>
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
              <small>Used by HEREX to match this payment to your project.</small>
            </label>

            <label className={styles.field}>
              <span>Project or payment reference <em>Optional</em></span>
              <input
                className={styles.input}
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Example: Website project, installment 2 of 4"
              />
            </label>

            {error ? <div className={styles.error} role="alert">{error}</div> : null}

            <button
              className={styles.payButton}
              type="submit"
              disabled={checkoutState === "loading"}
            >
              <span>{checkoutState === "loading" ? "Preparing checkout..." : "Continue to checkout"}</span>
              <strong aria-hidden="true">PayPal</strong>
            </button>
            <p className={styles.paymentNote}>
              Pay with a card or PayPal balance. HEREX never stores card details.
            </p>
          </form> : (
            <section className={styles.paymentStep} aria-labelledby="payment-method-title">
              <div className={styles.paymentStepHeader}>
                <div>
                  <span className={styles.eyebrow}>STEP 2 OF 2</span>
                  <h2 id="payment-method-title">Choose a payment method</h2>
                  <p>Complete your {formattedAmount} payment securely with PayPal.</p>
                </div>
                <button type="button" onClick={() => { setError(""); setCheckoutState("idle"); }}>
                  Edit details
                </button>
              </div>
              {error ? <div className={styles.error} role="alert">{error}</div> : null}
              <PayPalCheckout
                amount={numericAmount}
                planId={checkout.kind === "plan" ? checkout.planId : null}
                buyer={{ email: email.trim() }}
                reference={reference.trim()}
                onError={setError}
              />
              <p className={styles.paymentNote}>
                Payment details are securely handled by PayPal. HEREX never stores card details.
              </p>
            </section>
          )}
        </section>

        <aside className={styles.summarySide}>
          <div className={styles.summaryInner}>
            <span className={styles.summaryEyebrow}>SUMMARY</span>
            <h2>{checkout.title}</h2>
            <p className={styles.summaryDescription}>{checkout.description}</p>

            <div className={styles.summaryLine}>
              <div>
                <span>Payment for</span>
                <strong>{checkout.kind === "plan" ? checkout.title : reference || "HEREX services"}</strong>
              </div>
              {checkout.kind === "plan" ? <Link href="/#precios">Change</Link> : null}
            </div>

            <div className={styles.totalBlock}>
              <div className={styles.totalRow}>
                <span>Total due</span>
                <strong>{formattedAmount}</strong>
              </div>
            </div>

            <div className={styles.assurance}>
              <span className={styles.assuranceIcon} aria-hidden="true">✓</span>
              <div>
                <strong>Server confirmation</strong>
                <p>Payment is only marked complete after confirmation is received from PayPal.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

    </main>
  );
}

interface PayPalNamespace {
  Buttons(options: {
    createOrder(): Promise<string>;
    onApprove(data: { orderID: string }): Promise<void>;
    onCancel(): void;
    onError(error: unknown): void;
    style: { layout: string; shape: string; label: string; height: number };
  }): { render(selector: string): Promise<void>; close(): void };
}

declare global {
  interface Window { paypal?: PayPalNamespace }
}

function PayPalCheckout({
  amount,
  planId,
  buyer,
  reference,
  onError,
}: {
  amount: number;
  planId: PlanCheckout["planId"] | null;
  buyer: { email: string };
  reference: string;
  onError(message: string): void;
}) {
  const reactId = useId();
  const containerId = `paypal-buttons-${reactId.replace(/:/g, "")}`;
  const paymentToken = useRef("");
  const [status, setStatus] = useState("Loading secure payment options...");
  const [mockMode, setMockMode] = useState(false);
  const [mockProcessing, setMockProcessing] = useState(false);
  const buyerEmail = buyer.email;

  const createOrder = useCallback(async (): Promise<PaymentOrderResponse> => {
    const response = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(planId ? { planId } : { amount }),
        buyer: { email: buyerEmail },
        reference,
      }),
    });
    const data = await response.json() as PaymentOrderResponse;
    if (!response.ok || !data.orderId || !data.transactionId || !data.paymentToken) {
      throw new Error(data.error || "The payment order could not be created.");
    }
    paymentToken.current = data.paymentToken;
    return data;
  }, [amount, buyerEmail, planId, reference]);

  async function handleMockPayment() {
    setMockProcessing(true);
    setStatus("Completing mock payment...");
    try {
      const order = await createOrder();
      if (!order.approvalUrl) throw new Error("The mock payment could not be opened.");
      window.location.assign(order.approvalUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The mock payment failed.";
      setStatus(message);
      onError(message);
      setMockProcessing(false);
    }
  }

  useEffect(() => {
    let active = true;
    let buttons: ReturnType<PayPalNamespace["Buttons"]> | undefined;

    async function initialize() {
      try {
        const configResponse = await fetch("/api/payments/config", { cache: "no-store" });
        const config = await configResponse.json() as { provider?: string; clientId?: string; error?: string };
        if (configResponse.ok && config.provider === "mock") {
          setMockMode(true);
          setStatus("");
          return;
        }
        if (!configResponse.ok || config.provider !== "paypal" || !config.clientId) {
          throw new Error(config.error || "PayPal checkout is not available.");
        }

        await loadPayPalScript(config.clientId);
        if (!active || !window.paypal) return;

        setStatus("");
        buttons = window.paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "paypal", height: 48 },
          async createOrder() {
            return (await createOrder()).orderId;
          },
          async onApprove(data) {
            setStatus("Confirming payment with PayPal...");
            const response = await fetch("/api/payments/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID, paymentToken: paymentToken.current }),
            });
            const result = await response.json() as { transaction?: { paymentStatus?: string }; error?: string };
            if (!response.ok || result.transaction?.paymentStatus !== "completed") {
              throw new Error(result.error || "PayPal did not confirm the payment.");
            }
            window.location.assign(`/payment/success?paymentToken=${encodeURIComponent(paymentToken.current)}&orderId=${encodeURIComponent(data.orderID)}`);
          },
          onCancel() {
            window.location.assign("/payment/cancel");
          },
          onError(error) {
            console.error("PayPal checkout failed", { hasError: Boolean(error) });
            onError("PayPal could not complete the checkout. Please try again.");
            setStatus("Payment could not be completed.");
          },
        });
        await buttons.render(`#${containerId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "PayPal could not be loaded.";
        setStatus(message);
        onError(message);
      }
    }

    void initialize();
    return () => {
      active = false;
      buttons?.close();
    };
  }, [containerId, createOrder, onError]);

  return (
    <div className={styles.paypalArea}>
      {status ? <p role="status">{status}</p> : null}
      {mockMode ? (
        <button
          className={styles.mockPaymentButton}
          type="button"
          disabled={mockProcessing}
          onClick={() => void handleMockPayment()}
        >
          {mockProcessing ? "Completing mock payment..." : "Complete mock payment"}
        </button>
      ) : <div id={containerId} />}
    </div>
  );
}

interface PaymentOrderResponse {
  approvalUrl?: string | null;
  error?: string;
  orderId: string;
  paymentToken: string;
  transactionId: string;
}

let paypalScriptPromise: Promise<void> | null = null;

function loadPayPalScript(clientId: string): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (paypalScriptPromise) return paypalScriptPromise;

  paypalScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The secure PayPal checkout could not be loaded."));
    document.head.appendChild(script);
  });
  return paypalScriptPromise;
}

function formatMoney(amount: number, currency: "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
