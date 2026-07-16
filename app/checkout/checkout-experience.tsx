"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

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

interface InstallmentItem {
  number: number;
  amount: number;
  dueLabel: string;
  status: "paid" | "due" | "upcoming";
}

export interface InstallmentCheckout extends CheckoutBase {
  kind: "installment";
  amount: number;
  projectTotal: number;
  installmentNumber: number;
  installmentCount: number;
  customerName: string;
  projectReference: string;
  installments: InstallmentItem[];
}

export type CheckoutConfiguration = OpenCheckout | PlanCheckout | InstallmentCheckout;

interface CheckoutExperienceProps {
  checkout: CheckoutConfiguration;
}

type PreviewState = "idle" | "loading" | "ready";

export function CheckoutExperience({ checkout }: CheckoutExperienceProps) {
  const fixedAmount = checkout.kind === "open" ? null : checkout.amount;
  const [amount, setAmount] = useState(fixedAmount ? String(fixedAmount) : "");
  const [name, setName] = useState(
    checkout.kind === "installment" ? checkout.customerName : "",
  );
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState(
    checkout.kind === "installment" ? checkout.projectReference : "",
  );
  const [error, setError] = useState("");
  const [previewState, setPreviewState] = useState<PreviewState>("idle");

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
    if (!name.trim()) {
      setError("Enter the name of the person or business making the payment.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address for the receipt.");
      return;
    }

    setPreviewState("loading");
    window.setTimeout(() => setPreviewState("ready"), 650);
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

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
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

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Full name or business name</span>
                <input
                  className={styles.input}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Name or business"
                />
              </label>
              <label className={styles.field}>
                <span>Receipt email</span>
                <input
                  className={styles.input}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Project or payment reference <em>Optional</em></span>
              <input
                className={styles.input}
                type="text"
                value={reference}
                disabled={checkout.kind === "installment"}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Example: Website project, installment 2 of 4"
              />
            </label>

            {error ? <div className={styles.error} role="alert">{error}</div> : null}

            <button
              className={styles.payButton}
              type="submit"
              disabled={previewState === "loading"}
            >
              <span>{previewState === "loading" ? "Preparing payment..." : "Continue with PayPal"}</span>
              <strong aria-hidden="true">PayPal</strong>
            </button>
            <p className={styles.paymentNote}>
              Pay with a card or PayPal balance. HEREX never stores card details.
            </p>
          </form>
        </section>

        <aside className={styles.summarySide}>
          <div className={styles.summaryInner}>
            <span className={styles.summaryEyebrow}>SUMMARY</span>
            <h2>{checkout.title}</h2>
            <p className={styles.summaryDescription}>{checkout.description}</p>

            {checkout.kind === "installment" ? (
              <>
                <div className={styles.projectMeta}>
                  <span>Project</span>
                  <strong>{checkout.projectReference}</strong>
                </div>
                <div className={styles.progressHeader}>
                  <span>Payment progress</span>
                  <strong>{checkout.installmentNumber - 1} of {checkout.installmentCount} paid</strong>
                </div>
                <div className={styles.progressTrack} aria-hidden="true">
                  <span style={{ width: `${((checkout.installmentNumber - 1) / checkout.installmentCount) * 100}%` }} />
                </div>
                <div className={styles.installments}>
                  {checkout.installments.map((item) => (
                    <div className={`${styles.installment} ${styles[item.status]}`} key={item.number}>
                      <span className={styles.installmentMark} aria-hidden="true" />
                      <div>
                        <strong>Installment {item.number}</strong>
                        <span>{item.dueLabel}</span>
                      </div>
                      <b>{formatMoney(item.amount, checkout.currency)}</b>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.summaryLine}>
                <div>
                  <span>Payment for</span>
                  <strong>{checkout.kind === "plan" ? checkout.title : reference || "HEREX services"}</strong>
                </div>
                {checkout.kind === "plan" ? <Link href="/#precios">Change</Link> : null}
              </div>
            )}

            <div className={styles.totalBlock}>
              {checkout.kind === "installment" ? (
                <div className={styles.totalContext}>
                  <span>Project total</span>
                  <strong>{formatMoney(checkout.projectTotal, checkout.currency)}</strong>
                </div>
              ) : null}
              <div className={styles.totalRow}>
                <span>{checkout.kind === "installment" ? `Installment ${checkout.installmentNumber} due` : "Total due"}</span>
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

      {previewState === "ready" ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <button
              className={styles.modalClose}
              type="button"
              aria-label="Close"
              onClick={() => setPreviewState("idle")}
            >
              ×
            </button>
            <span className={styles.modalKicker}>PREVIEW</span>
            <h2 id="preview-title">The checkout is ready</h2>
            <p>
              In production, this step will create the order and open PayPal to complete the {formattedAmount} payment.
            </p>
            <button className={styles.modalAction} type="button" onClick={() => setPreviewState("idle")}>
              Continue reviewing
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function formatMoney(amount: number, currency: "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
