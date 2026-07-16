import "server-only";

import type {
  NewTransaction,
  Transaction,
  TransactionRepository,
} from "@/lib/payments/types";

class InMemoryTransactionRepository implements TransactionRepository {
  constructor(private readonly transactions: Map<string, Transaction | string>) {}

  async create(input: NewTransaction): Promise<Transaction> {
    const timestamp = new Date().toISOString();
    const transaction: Transaction = {
      ...input,
      internalTransactionId: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.transactions.set(transaction.internalTransactionId, transaction);
    this.indexProviderOrder(transaction);
    return transaction;
  }

  async findByInternalId(id: string): Promise<Transaction | null> {
    const value = this.transactions.get(id);
    return value && typeof value !== "string" ? value : null;
  }

  async findByProviderOrderId(orderId: string): Promise<Transaction | null> {
    const internalId = this.transactions.get(`providerOrder:${orderId}`);
    return typeof internalId === "string" ? this.findByInternalId(internalId) : null;
  }

  async update(id: string, patch: Partial<NewTransaction>): Promise<Transaction | null> {
    const existing = await this.findByInternalId(id);
    if (!existing) return null;

    const updated: Transaction = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.transactions.set(id, updated);
    this.indexProviderOrder(updated);
    return updated;
  }

  private indexProviderOrder(transaction: Transaction): void {
    if (transaction.providerOrderId) {
      this.transactions.set(
        `providerOrder:${transaction.providerOrderId}`,
        transaction.internalTransactionId,
      );
    }
  }
}

const globalStore = globalThis as typeof globalThis & {
  herexTransactions?: Map<string, Transaction | string>;
  herexTransactionRepository?: TransactionRepository;
};

const transactions =
  globalStore.herexTransactions ?? new Map<string, Transaction | string>();
globalStore.herexTransactions = transactions;

export const transactionRepository =
  globalStore.herexTransactionRepository ??
  new InMemoryTransactionRepository(transactions);
globalStore.herexTransactionRepository = transactionRepository;
