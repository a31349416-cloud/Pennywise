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
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  rate: number;
  setRate: (value: number) => void;
  formatMoney: (amount: number) => string;
  currencyName: (code: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function rateKey(display: string): string {
  return `pennywise-rate-${display}`;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(detectCurrency);
  const [baseCurrency, setBaseState] = useState<string>(() => {
    const saved = localStorage.getItem("pennywise-base");
    if (saved && CURRENCIES.includes(saved)) return saved;
    return "USD";
  });
  const [rate, setRateState] = useState<number>(1);

  useEffect(() => {
    const saved = parseFloat(localStorage.getItem(rateKey(currency)) ?? "");
    setRateState(Number.isFinite(saved) && saved > 0 ? saved : 1);
  }, [currency]);

  useEffect(() => {
    document.documentElement.dataset.currency = currency;
  }, [currency]);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const setBaseCurrency = useCallback((code: string) => {
    setBaseState(code);
    localStorage.setItem("pennywise-base", code);
  }, []);

  const setRate = useCallback(
    (value: number) => {
      setRateState(value);
      localStorage.setItem(rateKey(currency), String(value));
    },
    [currency],
  );

  const formatMoney = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(currentLocale(), {
        style: "currency",
        currency,
      }).format(amount * rate),
    [currency, rate],
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
      value={{
        currency,
        setCurrency,
        baseCurrency,
        setBaseCurrency,
        rate,
        setRate,
        formatMoney,
        currencyName,
      }}
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
