import type {
  Budget,
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
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

let translateError: (key: "requestFailed") => string = (k) => k;

export function setApiErrorTranslator(
  fn: (key: "requestFailed") => string,
): void {
  translateError = fn;
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  return `${translateError("requestFailed")} (${res.status})`;
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

  listBudgets(): Promise<Budget[]> {
    return request("/api/budgets");
  },

  createBudget(category: string, monthlyLimit: number): Promise<Budget> {
    return request("/api/budgets", {
      method: "POST",
      body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
    });
  },

  updateBudget(id: number, monthlyLimit: number): Promise<Budget> {
    return request(`/api/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ monthly_limit: monthlyLimit }),
    });
  },

  deleteBudget(id: number): Promise<void> {
    return request(`/api/budgets/${id}`, { method: "DELETE" });
  },

  exportCsvUrl(): string {
    return `${BASE_URL}/api/csv/export`;
  },

  importCsv(file: File): Promise<{ imported: number; skipped: number }> {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE_URL}/api/csv/import`, { method: "POST", body: form }).then(
      async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? `Import failed: ${res.status}`);
        }
        return res.json();
      },
    );
  },
};
