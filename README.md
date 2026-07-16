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

The checkout uses an inline two-step flow: payment details followed by PayPal-hosted wallet and eligible card options.

## Payment providers

For fixed plans, the browser sends only a `planId`; names, amounts, and USD currency come from the server-only allowlist in `lib/payments/plans.ts`. Custom USD amounts are intentionally customer-entered and validated server-side between $1 and $10,000.

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

Use the deployed preview URL for `APP_URL` when testing on Vercel. Add the Sandbox webhook ID after creating a webhook for `/api/payments/webhook`. Never expose or commit the client secret.

### PayPal Live

Create a separate Live REST app and Live webhook. Set `PAYPAL_ENV=live`, add the Live client ID, secret, and webhook ID, and set `APP_URL` to the production domain. Sandbox and Live credentials are not interchangeable.

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
- `lib/payments/context.ts`: signed, expiring payment context used to verify stateless Vercel requests.
- `lib/payment-requests/preview.ts`: development-only installment preview data.

## Required before production

- Add the correct Sandbox webhook ID to Preview and verify a simulated delivery.
- Test PayPal Sandbox wallet, card, cancellation, capture retry, and duplicate callback behavior on Vercel Preview.
- Create separate Live credentials and a Live webhook for the production domain.
- Make and refund one small real payment after deployment.

The first version uses PayPal as the transaction source of truth and does not maintain a HEREX payment database. Every capture/status request verifies the signed server context against PayPal's amount, currency, and internal order reference. Verified webhook events are logged but do not trigger separate fulfillment. Add durable storage later if HEREX needs an internal transaction dashboard, automated fulfillment, or reconciliation history outside PayPal.
