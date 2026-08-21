import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { setApiErrorTranslator } from "./api";

export type Lang = "en" | "uk";

const dict = {
  en: {
    tagline: "Track every penny",
    addTransaction: "Add transaction",
    expense: "Expense",
    income: "Income",
    amount: "Amount",
    category: "Category",
    date: "Date",
    description: "Description",
    optionalNote: "Optional note",
    add: "Add",
    saving: "Saving...",
    invalidAmount: "Enter a valid amount",
    saveFailed: "Failed to save",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    budgets: "Budgets",
    monthlyLimit: "Monthly limit",
    setBudget: "Set limit",
    overBudget: "Over budget",
    noBudgets: "No budgets set.",
    budgetExists: "Limit for this category already exists",
    exportCsv: "Export CSV",
    importCsv: "Import CSV",
    importedResult: "Imported",
    skippedResult: "skipped",
    language: "Language",
    toggleTheme: "Toggle theme",
    lightMode: "Switch to light",
    darkMode: "Switch to dark",
    requestFailed: "Request failed",
    pageTitle: "Pennywise — Finance Tracker",
    recordsCurrency: "Records currency",
    ratePlaceholder: "Exchange rate",
    rateSaved: "Applied to all amounts",
    autoRate: "Auto rate",
    manualRate: "Manual",
    useAuto: "Use auto",
    offlineHint: "Auto unavailable — enter rate manually or use cached",
    rateLoading: "Fetching rate...",
    manualPinned: "Manual rate pinned for this currency",
    transactionDeleted: "Transaction deleted",
    undo: "Undo",
    newLabel: "new",
    searchPlaceholder: "Search…",
    savingsRate: "Savings rate",
    projectedSpend: "Projected month spend",
    projectedHint: "Based on your average daily spending this month",
    today: "Today",
    yesterday: "Yesterday",
    showMore: "Show more",
    balanceDynamics: "Balance dynamics",
    noResults: "Nothing matches these filters",
    noTransactionsHint: "Add your first transaction on the left — it will appear here.",
    hotkeyHint: "Press / to search, ← → to change month",
    converterTitle: "Quick convert",
    convertAmount: "Amount",
    swap: "Swap currencies",
    ratesUnavailable: "Rates unavailable offline",
    search: "Search...",
    popular: "Popular",
    allCurrencies: "All currencies",
    nothingFound: "Nothing found",
    transactions: "Transactions",
    allTypes: "All types",
    allCategories: "All categories",
    reset: "Reset",
    noTransactions: "No transactions yet. Add your first one!",
    deleteTransaction: "Delete transaction",
    balance: "Balance",
    monthlyActivity: "Monthly activity",
    byCategory: "By category",
    notEnoughData: "Not enough data yet.",
    noExpenses: "No expenses recorded.",
    backendError:
      "Failed to load data. Is the backend running on port 8000?",
  },
  uk: {
    tagline: "Обліковуй кожну копійку",
    addTransaction: "Додати транзакцію",
    expense: "Витрата",
    income: "Дохід",
    amount: "Сума",
    category: "Категорія",
    date: "Дата",
    description: "Опис",
    optionalNote: "Примітка (необов'язково)",
    add: "Додати",
    saving: "Збереження...",
    invalidAmount: "Введіть коректну суму",
    saveFailed: "Не вдалося зберегти",
    edit: "Редагувати",
    save: "Зберегти",
    cancel: "Скасувати",
    budgets: "Бюджети",
    monthlyLimit: "Ліміт на місяць",
    setBudget: "Встановити",
    overBudget: "Перевищено",
    noBudgets: "Ліміти не задано.",
    budgetExists: "Ліміт для цієї категорії вже існує",
    exportCsv: "Експорт CSV",
    importCsv: "Імпорт CSV",
    importedResult: "Імпортовано",
    skippedResult: "пропущено",
    language: "Мова",
    toggleTheme: "Змінити тему",
    lightMode: "Світла тема",
    darkMode: "Темна тема",
    requestFailed: "Помилка запиту",
    pageTitle: "Pennywise — Фінансовий трекер",
    recordsCurrency: "Валюта обліку",
    ratePlaceholder: "Обмінний курс",
    rateSaved: "Застосовується до всіх сум",
    autoRate: "Авто-курс",
    manualRate: "Вручну",
    useAuto: "Увімкнути авто",
    offlineHint: "Авто-курс недоступний — введіть вручну або використано кеш",
    rateLoading: "Отримуємо курс...",
    manualPinned: "Ручний курс закріплений для цієї валюти",
    transactionDeleted: "Транзакцію видалено",
    undo: "Скасувати",
    newLabel: "нове",
    searchPlaceholder: "Пошук…",
    savingsRate: "Рівень заощаджень",
    projectedSpend: "Прогноз витрат за місяць",
    projectedHint: "Розраховано за середніми щоденними витратами цього місяця",
    today: "Сьогодні",
    yesterday: "Вчора",
    showMore: "Показати ще",
    balanceDynamics: "Динаміка балансу",
    noResults: "Нічого не знайдено за цими фільтрами",
    noTransactionsHint: "Додайте першу транзакцію ліворуч — вона з'явиться тут.",
    hotkeyHint: "Натисніть / для пошуку, ← → для зміни місяця",
    converterTitle: "Швидка конвертація",
    convertAmount: "Сума",
    swap: "Поміняти валюти",
    ratesUnavailable: "Курси недоступні офлайн",
    search: "Пошук...",
    popular: "Популярні",
    allCurrencies: "Усі валюти",
    nothingFound: "Нічого не знайдено",
    transactions: "Транзакції",
    allTypes: "Усі типи",
    allCategories: "Усі категорії",
    reset: "Скинути",
    noTransactions: "Транзакцій ще немає. Додайте першу!",
    deleteTransaction: "Видалити транзакцію",
    balance: "Баланс",
    monthlyActivity: "Активність за місяцями",
    byCategory: "За категоріями",
    notEnoughData: "Недостатньо даних.",
    noExpenses: "Витрат не зафіксовано.",
    backendError:
      "Не вдалося завантажити дані. Чи запущений бекенд на порту 8000?",
  },
} as const;

export type TKey = keyof typeof dict.en;

const MONTHS: Record<Lang, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  uk: ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"],
};

const CATEGORY_LABELS: Record<Lang, Record<string, string>> = {
  en: {},
  uk: {
    Food: "Їжа",
    Transport: "Транспорт",
    Housing: "Житло",
    Entertainment: "Розваги",
    Health: "Здоров'я",
    Salary: "Зарплата",
    Other: "Інше",
    Shopping: "Покупки",
    Education: "Освіта",
    Bonus: "Бонус",
    Freelance: "Фріланс",
    Gift: "Подарунок",
    Investment: "Інвестиції",
    Sale: "Продаж",
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
  monthLabel: (month: string) => string;
  categoryLabel: (category: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "pennywise-lang";

function detectLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "uk") return saved;
  return navigator.language.toLowerCase().startsWith("uk") ? "uk" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict[lang].pageTitle;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback((key: TKey) => dict[lang][key], [lang]);

  const monthLabel = useCallback(
    (month: string) => {
      const [year, m] = month.split("-").map(Number);
      return `${MONTHS[lang][m - 1]} ${String(year).slice(2)}`;
    },
    [lang],
  );

  const categoryLabel = useCallback(
    (category: string) => CATEGORY_LABELS[lang][category] ?? category,
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, monthLabel, categoryLabel }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

setApiErrorTranslator((key) => dict[detectLang()][key]);
