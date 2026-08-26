export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  account_id?: number | null;
  member?: string | null;
  created_at: string;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  account_id?: number | null;
  member?: string | null;
}

export interface TransactionUpdate {
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string | null;
  date?: string;
  account_id?: number | null;
  member?: string | null;
}

export interface TransactionFilters {
  type?: TransactionType | "";
  category?: string;
  date_from?: string;
  date_to?: string;
  account_id?: string;
  member?: string;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export interface CategoryStat {
  category: string;
  total: number;
}

export interface MonthlyStat {
  month: string;
  income: number;
  expense: number;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  spent: number;
}

export interface User {
  id: number;
  email: string;
  family_id?: number | null;
  created_at: string;
}

export interface Family {
  id: number;
  name: string;
  invite_code: string;
  owner_id: number;
  created_at: string;
  member_count: number;
}

export interface FamilyMember {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  icon: string;
  created_at: string;
}

export interface AccountInput {
  name: string;
  type: string;
  balance?: number;
  currency?: string;
  icon?: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface TagInput {
  name: string;
  color: string;
}

export interface Recurring {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  frequency: string;
  day_of_month: number | null;
  next_date: string;
  active: boolean;
  created_at: string;
}

export interface RecurringInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  frequency: string;
  day_of_month?: number | null;
  next_date: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target: number;
  current: number;
  deadline: string | null;
  created_at: string;
}

export interface GoalInput {
  name: string;
  target: number;
  deadline?: string | null;
}

export interface Reminder {
  id: number;
  title: string;
  amount: number;
  remind_date: string;
  repeat: string;
  active: boolean;
  created_at: string;
}

export interface ReminderInput {
  title: string;
  amount?: number;
  remind_date: string;
  repeat?: string;
}

export interface SharedAccess {
  id: number;
  shared_with_email: string;
  permission: string;
  created_at: string;
}

export interface CategoryTrend {
  month: string;
  total: number;
}
