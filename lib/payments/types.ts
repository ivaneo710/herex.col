export type PaymentProviderName = "mock" | "paypal";
export type PaymentCurrency = "USD";
export type FixedPlanId = "essential" | "growth" | "impact";
export type PaymentStatus =
  | "pending"
  | "created"
  | "approved"
  | "completed"
  | "cancelled"
  | "failed"
  | "not_found";

export interface PaymentPlan {
  id: FixedPlanId | "custom";
  name: string;
  amount: number;
  currency: PaymentCurrency;
}

export type FixedPaymentPlan = PaymentPlan & { id: FixedPlanId };

export interface PaymentBuyer {
  email: string;
}

export interface CreateOrderInput {
  plan: PaymentPlan;
  buyer: PaymentBuyer;
  reference: string;
  appUrl: string;
  transactionId: string;
  paymentToken: string;
}

export interface CreateOrderResult {
  provider: PaymentProviderName;
  orderId: string;
  status: string;
  approvalUrl: string | null;
}

export interface CaptureOrderInput {
  providerOrderId: string;
  transactionId: string;
}

export interface CaptureOrderResult {
  provider: PaymentProviderName;
  orderId: string;
  status: string;
  captureId: string | null;
  rawStatus: string;
  amount: number | null;
  currency: PaymentCurrency | null;
  customId: string | null;
}

export interface OrderStatusResult {
  provider: PaymentProviderName;
  orderId: string;
  status: string;
  captureId: string | null;
  amount: number | null;
  currency: PaymentCurrency | null;
  customId: string | null;
}

export interface WebhookVerificationInput {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSignature: string;
  transmissionTime: string;
  webhookId: string;
  event: unknown;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  captureOrder(input: CaptureOrderInput): Promise<CaptureOrderResult>;
  getOrderStatus(input: { providerOrderId: string }): Promise<OrderStatusResult>;
  verifyWebhookSignature?(input: WebhookVerificationInput): Promise<boolean>;
}

export interface Transaction {
  internalTransactionId: string;
  provider: PaymentProviderName;
  providerOrderId: string;
  providerCaptureId: string | null;
  planId: PaymentPlan["id"];
  planName: string;
  amount: number;
  currency: PaymentCurrency;
  buyerName: string;
  buyerEmail: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}
