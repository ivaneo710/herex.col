import "server-only";

import {
  PaymentError,
  type CaptureOrderInput,
  type CaptureOrderResult,
  type CreateOrderInput,
  type CreateOrderResult,
  type OrderStatusResult,
  type PaymentProvider,
  type WebhookVerificationInput,
} from "../types";

interface PayPalLink {
  href?: string;
  rel?: string;
}

interface PayPalCapture {
  id?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string };
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: PayPalCapture[] };
  }>;
}

interface PayPalTokenResponse {
  access_token?: string;
}

interface PayPalWebhookVerificationResponse {
  verification_status?: string;
}

export class PayPalPaymentProvider implements PaymentProvider {
  readonly name = "paypal" as const;
  private readonly environment: "sandbox" | "live";
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    if (env.PAYPAL_ENV !== "sandbox" && env.PAYPAL_ENV !== "live") {
      throw new PaymentError("PAYPAL_ENV must be sandbox or live.", 503);
    }
    this.environment = env.PAYPAL_ENV;
    this.clientId = env.PAYPAL_CLIENT_ID;
    this.clientSecret = env.PAYPAL_CLIENT_SECRET;
    this.baseUrl =
      this.environment === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
  }

  async createOrder({
    plan,
    buyer,
    reference,
    appUrl,
    transactionId,
    paymentToken,
  }: CreateOrderInput): Promise<CreateOrderResult> {
    const data = await this.request<PayPalOrderResponse>("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": requestId("create", transactionId) },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: plan.id,
            custom_id: transactionId,
            description: reference
              ? `HEREX ${plan.name} - ${reference}`
              : `HEREX ${plan.name} one-time service payment`,
            amount: {
              currency_code: plan.currency,
              value: plan.amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              brand_name: "HEREX",
              locale: "en-US",
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              return_url: `${appUrl}/payment/success?paymentToken=${encodeURIComponent(paymentToken)}`,
              cancel_url: `${appUrl}/payment/cancel`,
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
        payer: buyer.email ? { email_address: buyer.email } : undefined,
      }),
    });

    if (!data.id || !data.status) {
      throw new PaymentError("PayPal returned an incomplete order.", 502);
    }

    const approvalUrl = data.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
    return {
      provider: this.name,
      orderId: data.id,
      status: data.status,
      approvalUrl: approvalUrl ?? null,
    };
  }

  async captureOrder({
    providerOrderId,
    transactionId,
  }: CaptureOrderInput): Promise<CaptureOrderResult> {
    const data = await this.request<PayPalOrderResponse>(
      `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`,
      {
        method: "POST",
        headers: { "PayPal-Request-Id": requestId("capture", transactionId) },
      },
    );
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const purchaseUnit = data.purchase_units?.[0];
    const amount = capture?.amount ?? purchaseUnit?.amount;

    return {
      provider: this.name,
      orderId: data.id ?? providerOrderId,
      status: data.status ?? "UNKNOWN",
      captureId: capture?.id ?? null,
      rawStatus: capture?.status ?? data.status ?? "UNKNOWN",
      amount: moneyValue(amount?.value),
      currency: amount?.currency_code === "USD" ? "USD" : null,
      customId: purchaseUnit?.custom_id ?? null,
    };
  }

  async getOrderStatus({ providerOrderId }: { providerOrderId: string }): Promise<OrderStatusResult> {
    const data = await this.request<PayPalOrderResponse>(
      `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`,
      { method: "GET" },
    );
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const purchaseUnit = data.purchase_units?.[0];
    const amount = capture?.amount ?? purchaseUnit?.amount;

    return {
      provider: this.name,
      orderId: data.id ?? providerOrderId,
      status: capture?.status ?? data.status ?? "UNKNOWN",
      captureId: capture?.id ?? null,
      amount: moneyValue(amount?.value),
      currency: amount?.currency_code === "USD" ? "USD" : null,
      customId: purchaseUnit?.custom_id ?? null,
    };
  }

  async verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean> {
    const data = await this.request<PayPalWebhookVerificationResponse>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: input.authAlgo,
          cert_url: input.certUrl,
          transmission_id: input.transmissionId,
          transmission_sig: input.transmissionSignature,
          transmission_time: input.transmissionTime,
          webhook_id: input.webhookId,
          webhook_event: input.event,
        }),
      },
    );
    return data.verification_status === "SUCCESS";
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new PaymentError("PayPal credentials are not configured.");
    }

    const authorization = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await safeJson<PayPalTokenResponse>(response);

    if (!response.ok || !data?.access_token) {
      console.error("PayPal authentication failed", { status: response.status });
      throw new PaymentError("Unable to authenticate with PayPal.", 502);
    }

    return data.access_token;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
    const data = await safeJson<T>(response);

    if (!response.ok || !data) {
      console.error("PayPal API request failed", { path, status: response.status });
      throw new PaymentError("PayPal could not process the request.", 502);
    }

    return data;
  }
}

function moneyValue(value: string | undefined): number | null {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function requestId(...parts: string[]): string {
  return parts.join("-").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 108);
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
