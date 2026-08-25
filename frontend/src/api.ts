import type {
  Budget,
  CategoryStat,
  MonthlyStat,
  Summary,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionUpdate,
  User,
} from "./types";

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? `http://${window.location.hostname}:8000` : "");

let authToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setOnAuthExpired(cb: (() => void) | null): void {
  onAuthExpired = cb;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem("pennywise-token", token);
  } else {
    localStorage.removeItem("pennywise-token");
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem("pennywise-token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const msg = await errorMessage(res);
    if (res.status === 401 && !path.includes("/api/auth/")) {
      setAuthToken(null);
      onAuthExpired?.();
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(msg);
  }
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

const PAGE_SIZE = 500;

async function listAllTransactions(
  filters: TransactionFilters,
): Promise<Transaction[]> {
  const query = toQuery({
    type: filters.type || undefined,
    category: filters.category || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  });
  const all: Transaction[] = [];
  let skip = 0;
  for (;;) {
    const page = await request<Transaction[]>(
      `/api/transactions${query ? `${query}&` : "?"}skip=${skip}&limit=${PAGE_SIZE}`,
    );
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
    skip += PAGE_SIZE;
  }
}

export const authApi = {
  register(email: string, password: string): Promise<User> {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string): Promise<{ access_token: string }> {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me(): Promise<User> {
    return request("/api/auth/me");
  },
};

export const api = {
  listTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    return listAllTransactions(filters);
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

  listCategories(type?: "income" | "expense"): Promise<string[]> {
    return request(`/api/transactions/categories${type ? `?type=${type}` : ""}`);
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
    return `${BASE_URL}/api/csv/export${authToken ? `?token=${authToken}` : ""}`;
  },

  importCsv(file: File): Promise<{ imported: number; skipped: number }> {
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return fetch(`${BASE_URL}/api/csv/import`, {
      method: "POST",
      body: form,
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Import failed: ${res.status}`);
      }
      return res.json();
    });
  },

  loadDemoData(): Promise<{ loaded: boolean; transactions: number; budgets: number }> {
    return request("/api/demo/load", { method: "POST" });
  },
};
