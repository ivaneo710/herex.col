import Link from "next/link";

import styles from "../payment-result.module.css";

export default function PaymentCancelPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>Payment cancelled</h1>
        <p>No payment was captured. You can return to the site whenever you are ready.</p>
        <Link className={styles.action} href="/#precios">
          Back to plans
        </Link>
      </section>
    </main>
  );
}
