import "server-only";

import type {
  CaptureOrderInput,
  CaptureOrderResult,
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  PaymentBuyer,
  PaymentPlan,
  PaymentProvider,
} from "../types";

interface MockOrder {
  id: string;
  status: string;
  plan: PaymentPlan;
  buyer: PaymentBuyer;
  captureId: string | null;
  createdAt: string;
  updatedAt: string;
  transactionId: string;
}

const globalStore = globalThis as typeof globalThis & {
  herexMockOrders?: Map<string, MockOrder>;
};
const mockOrders = globalStore.herexMockOrders ?? new Map<string, MockOrder>();
globalStore.herexMockOrders = mockOrders;

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createOrder({
    plan,
    buyer,
    appUrl,
    transactionId,
    paymentToken,
  }: CreateOrderInput): Promise<CreateOrderResult> {
    const orderId = createMockId("mock_order");
    const approvalUrl = `${appUrl}/payment/success?mock=1&paymentToken=${encodeURIComponent(paymentToken)}&orderId=${encodeURIComponent(orderId)}`;
    const timestamp = new Date().toISOString();

    mockOrders.set(orderId, {
      id: orderId,
      status: "CREATED",
      plan,
      buyer,
      captureId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      transactionId,
    });

    return { provider: this.name, orderId, status: "CREATED", approvalUrl };
  }

  async captureOrder({ providerOrderId }: CaptureOrderInput): Promise<CaptureOrderResult> {
    const order = mockOrders.get(providerOrderId);
    if (!order) {
      return {
        provider: this.name,
        orderId: providerOrderId,
        status: "NOT_FOUND",
        captureId: null,
        rawStatus: "NOT_FOUND",
        amount: null,
        currency: null,
        customId: null,
      };
    }

    if (order.status !== "COMPLETED") {
      order.status = "COMPLETED";
      order.captureId = createMockId("mock_capture");
      order.updatedAt = new Date().toISOString();
    }

    return {
      provider: this.name,
      orderId: providerOrderId,
      status: "COMPLETED",
      captureId: order.captureId,
      rawStatus: "COMPLETED",
      amount: order.plan.amount,
      currency: order.plan.currency,
      customId: order.transactionId,
    };
  }

  async getOrderStatus({ providerOrderId }: { providerOrderId: string }): Promise<OrderStatusResult> {
    const order = mockOrders.get(providerOrderId);
    return {
      provider: this.name,
      orderId: providerOrderId,
      status: order?.status ?? "NOT_FOUND",
      captureId: order?.captureId ?? null,
      amount: order?.plan.amount ?? null,
      currency: order?.plan.currency ?? null,
      customId: order?.transactionId ?? null,
    };
  }
}

function createMockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}
