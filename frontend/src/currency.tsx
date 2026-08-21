import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const POPULAR = ["USD", "EUR", "UAH", "GBP", "PLN", "CZK"];

export const CURRENCIES: string[] = [
  ...POPULAR,
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD",
  "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK",
  "DJF", "DKK", "DOP", "DZD",
  "EGP", "ERN", "ETB", "EUR",
  "FJD", "FKP",
  "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD",
  "HKD", "HNL", "HRK", "HTG", "HUF",
  "IDR", "ILS", "INR", "IQD", "IRR", "ISK",
  "JMD", "JOD", "JPY",
  "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD",
  "LAK", "LBP", "LKR", "LRD", "LSL", "LYD",
  "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR",
  "MWK", "MXN", "MYR", "MZN",
  "NAD", "NGN", "NIO", "NOK", "NPR", "NZD",
  "OMR",
  "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG",
  "QAR",
  "RON", "RSD", "RUB", "RWF",
  "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD",
  "SSP", "STN", "SVC", "SYP", "SZL",
  "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS",
  "UAH", "UGX", "USD", "UYU", "UZS",
  "VES", "VND", "VUV",
  "WST",
  "XAF", "XCD", "XOF", "XPF",
  "YER",
  "ZAR", "ZMW", "ZWL",
];

const STORAGE_KEY = "pennywise-currency";

function detectCurrency(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && CURRENCIES.includes(saved)) return saved;
  const locale = navigator.language || "en-US";
  const region = locale.split("-")[1]?.toUpperCase();
  if (region) {
    try {
      const display = new Intl.DisplayNames([locale], { type: "currency" });
      for (const code of POPULAR) {
        void display.of(code);
      }
      const guess = new Intl.NumberFormat(locale, {
        style: "currency",
        currencyDisplay: "code",
      })
        .resolvedOptions().currency;
      if (guess && CURRENCIES.includes(guess)) return guess;
    } catch {
      /* fall through */
    }
  }
  return "USD";
}

function currentLocale(): string {
  return localStorage.getItem("pennywise-lang") === "uk" ? "uk-UA" : "en-US";
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  formatMoney: (amount: number) => string;
  currencyName: (code: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(detectCurrency);

  useEffect(() => {
    document.documentElement.dataset.currency = currency;
  }, [currency]);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const formatMoney = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(currentLocale(), {
        style: "currency",
        currency,
      }).format(amount),
    [currency],
  );

  const currencyName = useCallback(
    (code: string) => {
      try {
        return (
          new Intl.DisplayNames([currentLocale()], { type: "currency" }).of(
            code,
          ) ?? code
        );
      } catch {
        return code;
      }
    },
    [],
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, formatMoney, currencyName }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
