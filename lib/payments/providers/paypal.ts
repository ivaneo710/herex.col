import "server-only";

import {
  PaymentError,
  type CaptureOrderInput,
  type CaptureOrderResult,
  type CreateOrderInput,
  type CreateOrderResult,
  type OrderStatusResult,
  type PaymentProvider,
} from "../types";

interface PayPalLink {
  href?: string;
  rel?: string;
}

interface PayPalCapture {
  id?: string;
  status?: string;
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    payments?: { captures?: PayPalCapture[] };
  }>;
}

interface PayPalTokenResponse {
  access_token?: string;
}

export class PayPalPaymentProvider implements PaymentProvider {
  readonly name = "paypal" as const;
  private readonly environment: "sandbox" | "live";
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.environment = env.PAYPAL_ENV === "live" ? "live" : "sandbox";
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
    appUrl,
    transactionId,
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
            description: `HEREX ${plan.name} one-time service payment`,
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
              return_url: `${appUrl}/payment/success?transactionId=${encodeURIComponent(transactionId)}`,
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

    return {
      provider: this.name,
      orderId: data.id ?? providerOrderId,
      status: data.status ?? "UNKNOWN",
      captureId: capture?.id ?? null,
      rawStatus: capture?.status ?? data.status ?? "UNKNOWN",
    };
  }

  async getOrderStatus({ providerOrderId }: { providerOrderId: string }): Promise<OrderStatusResult> {
    const data = await this.request<PayPalOrderResponse>(
      `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`,
      { method: "GET" },
    );
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

    return {
      provider: this.name,
      orderId: data.id ?? providerOrderId,
      status: capture?.status ?? data.status ?? "UNKNOWN",
      captureId: capture?.id ?? null,
    };
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
    });
    const data = await safeJson<T>(response);

    if (!response.ok || !data) {
      console.error("PayPal API request failed", { path, status: response.status });
      throw new PaymentError("PayPal could not process the request.", 502);
    }

    return data;
  }
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
