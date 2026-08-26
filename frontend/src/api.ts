import type {
  Account,
  AccountInput,
  Budget,
  CategoryStat,
  CategoryTrend,
  Family,
  FamilyMember,
  GoalInput,
  MonthlyStat,
  Recurring,
  RecurringInput,
  Reminder,
  ReminderInput,
  SavingsGoal,
  SharedAccess,
  Summary,
  Tag,
  TagInput,
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
    account_id: filters.account_id || undefined,
    member: filters.member || undefined,
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

  summary(dateFrom?: string, dateTo?: string, member?: string): Promise<Summary> {
    return request(
      `/api/statistics/summary${toQuery({
        date_from: dateFrom,
        date_to: dateTo,
        member,
      })}`,
    );
  },

  byCategory(
    type: "income" | "expense" = "expense",
    dateFrom?: string,
    dateTo?: string,
    member?: string,
  ): Promise<CategoryStat[]> {
    return request(
      `/api/statistics/by-category${toQuery({
        type,
        date_from: dateFrom,
        date_to: dateTo,
        member,
      })}`,
    );
  },

  monthly(months = 6, member?: string): Promise<MonthlyStat[]> {
    return request(`/api/statistics/monthly?months=${months}${member ? `&member=${encodeURIComponent(member)}` : ""}`);
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

  // Accounts
  listAccounts(): Promise<Account[]> {
    return request("/api/accounts");
  },
  createAccount(data: AccountInput): Promise<Account> {
    return request("/api/accounts", { method: "POST", body: JSON.stringify(data) });
  },
  updateAccount(id: number, data: Partial<AccountInput>): Promise<Account> {
    return request(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  deleteAccount(id: number): Promise<void> {
    return request(`/api/accounts/${id}`, { method: "DELETE" });
  },

  // Tags
  listTags(): Promise<Tag[]> {
    return request("/api/tags");
  },
  createTag(data: TagInput): Promise<Tag> {
    return request("/api/tags", { method: "POST", body: JSON.stringify(data) });
  },
  deleteTag(id: number): Promise<void> {
    return request(`/api/tags/${id}`, { method: "DELETE" });
  },
  getTransactionTags(txId: number): Promise<number[]> {
    return request(`/api/tags/transaction/${txId}`);
  },
  setTransactionTags(txId: number, tagIds: number[]): Promise<void> {
    return request(`/api/tags/transaction/${txId}`, { method: "PUT", body: JSON.stringify({ tag_ids: tagIds }) });
  },

  // Recurring
  listRecurring(): Promise<Recurring[]> {
    return request("/api/recurring");
  },
  createRecurring(data: RecurringInput): Promise<Recurring> {
    return request("/api/recurring", { method: "POST", body: JSON.stringify(data) });
  },
  updateRecurring(id: number, data: Partial<RecurringInput & { active: boolean }>): Promise<Recurring> {
    return request(`/api/recurring/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  deleteRecurring(id: number): Promise<void> {
    return request(`/api/recurring/${id}`, { method: "DELETE" });
  },
  processRecurring(): Promise<{ processed: number }> {
    return request("/api/recurring/process", { method: "POST" });
  },

  // Savings Goals
  listGoals(): Promise<SavingsGoal[]> {
    return request("/api/goals");
  },
  createGoal(data: GoalInput): Promise<SavingsGoal> {
    return request("/api/goals", { method: "POST", body: JSON.stringify(data) });
  },
  updateGoal(id: number, data: Partial<GoalInput & { current: number }>): Promise<SavingsGoal> {
    return request(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  deleteGoal(id: number): Promise<void> {
    return request(`/api/goals/${id}`, { method: "DELETE" });
  },

  // Reminders
  listReminders(): Promise<Reminder[]> {
    return request("/api/reminders");
  },
  createReminder(data: ReminderInput): Promise<Reminder> {
    return request("/api/reminders", { method: "POST", body: JSON.stringify(data) });
  },
  updateReminder(id: number, data: Partial<ReminderInput & { active: boolean }>): Promise<Reminder> {
    return request(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  deleteReminder(id: number): Promise<void> {
    return request(`/api/reminders/${id}`, { method: "DELETE" });
  },
  upcomingReminders(days = 7): Promise<Reminder[]> {
    return request(`/api/reminders/upcoming?days=${days}`);
  },

  // Shared
  listShared(): Promise<SharedAccess[]> {
    return request("/api/shared");
  },
  createShared(email: string, permission = "view"): Promise<SharedAccess> {
    return request("/api/shared", { method: "POST", body: JSON.stringify({ email, permission }) });
  },
  deleteShared(id: number): Promise<void> {
    return request(`/api/shared/${id}`, { method: "DELETE" });
  },

  // Statistics extras
  yearly(years = 3, member?: string): Promise<MonthlyStat[]> {
    return request(`/api/statistics/yearly?years=${years}${member ? `&member=${encodeURIComponent(member)}` : ""}`);
  },
  categoryTrend(category: string, months = 6, member?: string): Promise<CategoryTrend[]> {
    return request(`/api/statistics/category-trend?category=${encodeURIComponent(category)}&months=${months}${member ? `&member=${encodeURIComponent(member)}` : ""}`);
  },

  // Reports
  reportSummary(dateFrom?: string, dateTo?: string, member?: string): Promise<{ income: number; expense: number; balance: number; count: number; categories: CategoryStat[] }> {
    return request(`/api/reports/summary${toQuery({ date_from: dateFrom, date_to: dateTo, member })}`);
  },
  reportUrl(dateFrom?: string, dateTo?: string, member?: string): string {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (member) params.set("member", member);
    return `${BASE_URL}/api/reports/pdf${params.toString() ? `?${params}` : ""}`;
  },
  reportTxtUrl(dateFrom?: string, dateTo?: string, member?: string): string {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (member) params.set("member", member);
    return `${BASE_URL}/api/reports/txt${params.toString() ? `?${params}` : ""}`;
  },

  // Family
  getFamily(): Promise<Family | null> {
    return request<Family | null>("/api/family").catch(() => null as Family | null);
  },
  createFamily(name: string): Promise<Family> {
    return request("/api/family/create", { method: "POST", body: JSON.stringify({ name }) });
  },
  joinFamily(invite_code: string): Promise<Family> {
    return request("/api/family/join", { method: "POST", body: JSON.stringify({ invite_code }) });
  },
  leaveFamily(): Promise<void> {
    return request("/api/family/leave", { method: "POST" });
  },
  listFamilyMembers(): Promise<FamilyMember[]> {
    return request("/api/family/members");
  },
};
