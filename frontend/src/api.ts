import type {
  CategoryStat,
  MonthlyStat,
  Summary,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionUpdate,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

function toQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const api = {
  listTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    return request(
      `/api/transactions${toQuery({
        type: filters.type || undefined,
        category: filters.category || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      })}`,
    );
  },

  getTransaction(id: number): Promise<Transaction> {
    return request(`/api/transactions/${id}`);
  },

  createTransaction(data: TransactionInput): Promise<Transaction> {
    return request("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateTransaction(id: number, data: TransactionUpdate): Promise<Transaction> {
    return request(`/api/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteTransaction(id: number): Promise<void> {
    return request(`/api/transactions/${id}`, { method: "DELETE" });
  },

  listCategories(): Promise<string[]> {
    return request("/api/transactions/categories");
  },

  summary(dateFrom?: string, dateTo?: string): Promise<Summary> {
    return request(
      `/api/statistics/summary${toQuery({
        date_from: dateFrom,
        date_to: dateTo,
      })}`,
    );
  },

  byCategory(
    type: "income" | "expense" = "expense",
    dateFrom?: string,
    dateTo?: string,
  ): Promise<CategoryStat[]> {
    return request(
      `/api/statistics/by-category${toQuery({
        type,
        date_from: dateFrom,
        date_to: dateTo,
      })}`,
    );
  },

  monthly(months = 6): Promise<MonthlyStat[]> {
    return request(`/api/statistics/monthly?months=${months}`);
  },
};
