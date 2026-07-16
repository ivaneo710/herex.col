import Link from "next/link";

import styles from "../payment-result.module.css";

export default function PaymentFailurePage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>We could not process the payment</h1>
        <p>
          The order was not confirmed. If you believe you were charged, do not try again until the
          transaction has been verified with HEREX.
        </p>
        <Link className={styles.action} href="/#precios">
          Try again
        </Link>
      </section>
    </main>
  );
}
