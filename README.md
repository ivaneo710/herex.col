# HEREX

HEREX runs on Next.js and TypeScript for Vercel. The existing client landing page remains preserved in `index.html` and is rendered through a compatibility layer in `app/page.tsx`; payment routes and server code use the Next.js App Router.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Keep `PAYMENT_PROVIDER=mock` to exercise the checkout without moving money.

### Checkout previews

- `http://localhost:3000/checkout`: customer-entered one-time amount.
- `http://localhost:3000/checkout?plan=growth`: locked plan amount.
- `http://localhost:3000/pay/demo-cuotas`: locked installment schedule preview available in mock development.

The checkout button intentionally stops at a preview confirmation until the custom-payment records, durable storage, and final PayPal credentials are connected.

## Payment providers

The browser sends only a `planId` and buyer contact details. Names, amounts, and USD currency are resolved from the server-only allowlist in `lib/payments/plans.ts`.

### Mock

Set `PAYMENT_PROVIDER=mock`. Select a plan, submit the landing-page form, and confirm the mock payment. The success route captures the fake order through the same provider interface used by PayPal.

### PayPal Sandbox

1. Open the PayPal Developer Dashboard and create or select a Sandbox REST app.
2. Copy its client ID and secret into `.env.local` or the Vercel environment settings.
3. Configure:

```env
PAYMENT_PROVIDER=paypal
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=
APP_URL=http://localhost:3000
```

Use the deployed preview URL for `APP_URL` when testing on Vercel. Never expose or commit the client secret.

### PayPal Live

Switch `PAYPAL_ENV=live`, add the Live client ID and secret, and set `APP_URL` to the production domain. Do not enable Live payments until durable transaction storage and verified webhooks are implemented.

## Testing payment states

- Success: finish the mock or PayPal approval flow. `/payment/success` displays success only after the server capture endpoint returns a completed transaction.
- Cancel: cancel the PayPal approval or open `/payment/cancel`.
- Failure: open `/payment/failure`; capture errors also remain unconfirmed on the success route.

## Architecture

- `app/page.tsx`: compatibility renderer for the unchanged landing page.
- `index.html`: preserved landing-page markup, styles, and interactions.
- `app/checkout/*`: responsive React checkout for open amounts and fixed plans.
- `app/pay/[token]`: payment-request and installment checkout route.
- `app/api/payments/*`: typed create, capture, status, and webhook routes.
- `app/payment/*`: React payment result routes.
- `lib/payments/types.ts`: provider, plan, order, and transaction contracts.
- `lib/payments/plans.ts`: server-only plan allowlist.
- `lib/payments/providers/*`: mock and PayPal REST implementations.
- `lib/payment-requests/preview.ts`: development-only installment preview data.
- `lib/transactions/repository.ts`: repository contract with a development-only memory implementation.

## Required before production

- Replace the memory transaction repository with durable storage. Memory state can disappear between Vercel function invocations and is not production-safe.
- Implement PayPal webhook signature verification using `PAYPAL_WEBHOOK_ID`.
- Process and reconcile approved/captured/refunded events idempotently.
- Add database uniqueness constraints for internal transaction IDs, PayPal order IDs, and capture IDs.
- Test PayPal Sandbox approval, cancellation, capture retries, duplicate callbacks, and network failures.
