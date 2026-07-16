export type PaymentProviderName = "mock" | "paypal";
export type PaymentCurrency = "USD";
export type PaymentStatus =
  | "pending"
  | "created"
  | "approved"
  | "completed"
  | "cancelled"
  | "failed"
  | "not_found";

export interface PaymentPlan {
  id: "essential" | "growth" | "impact";
  name: string;
  amount: number;
  currency: PaymentCurrency;
}

export interface PaymentBuyer {
  name: string;
  email: string;
  whatsapp: string;
}

export interface CreateOrderInput {
  plan: PaymentPlan;
  buyer: PaymentBuyer;
  appUrl: string;
  transactionId: string;
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
}

export interface OrderStatusResult {
  provider: PaymentProviderName;
  orderId: string;
  status: string;
  captureId: string | null;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  captureOrder(input: CaptureOrderInput): Promise<CaptureOrderResult>;
  getOrderStatus(input: { providerOrderId: string }): Promise<OrderStatusResult>;
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

export type NewTransaction = Omit<
  Transaction,
  "internalTransactionId" | "createdAt" | "updatedAt"
>;

export interface TransactionRepository {
  create(input: NewTransaction): Promise<Transaction>;
  findByInternalId(id: string): Promise<Transaction | null>;
  findByProviderOrderId(orderId: string): Promise<Transaction | null>;
  update(id: string, patch: Partial<NewTransaction>): Promise<Transaction | null>;
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
