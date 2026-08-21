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
const BASE_KEY = "pennywise-base";

export type RateSource = "loading" | "auto" | "manual" | "offline";

function detectCurrency(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && CURRENCIES.includes(saved)) return saved;
  const locale = navigator.language || "en-US";
  const region = locale.split("-")[1]?.toUpperCase();
  if (region) {
    try {
      const guess = new Intl.NumberFormat(locale, {
        style: "currency",
        currencyDisplay: "code",
      }).resolvedOptions().currency;
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

function manualKey(display: string): string {
  return `pennywise-rate-${display}`;
}

function cacheKey(display: string): string {
  return `pennywise-rate-cache-${display}`;
}

function manualPinKey(display: string): string {
  return `pennywise-rate-manual-${display}`;
}

/** Free no-key endpoints, tried in order. */
async function fetchAutoRate(base: string, target: string): Promise<number> {
  const res = await fetch(
    `https://open.er-api.com/v6/latest/${base}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error("er-api failed");
  const data = await res.json();
  const rate = data?.rates?.[target];
  if (typeof rate !== "number" || rate <= 0) throw new Error("no rate");
  return rate;
}

async function fetchFallbackRate(
  base: string,
  target: string,
): Promise<number> {
  const res = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error("cdn failed");
  const data = await res.json();
  const rate = data?.[base.toLowerCase()]?.[target.toLowerCase()];
  if (typeof rate !== "number" || rate <= 0) throw new Error("no rate");
  return rate;
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
  rate: number;
  rateSource: RateSource;
  refreshAutoRate: () => void;
  setManualRate: (value: number) => void;
  formatMoney: (amount: number) => string;
  currencyName: (code: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(detectCurrency);
  const [baseCurrency, setBaseState] = useState<string>(() => {
    const saved = localStorage.getItem(BASE_KEY);
    if (saved && CURRENCIES.includes(saved)) return saved;
    return "USD";
  });
  const [rate, setRateState] = useState<number>(1);
  const [rateSource, setRateSource] = useState<RateSource>("loading");
  const [fetchTick, setFetchTick] = useState(0);

  // Load initial rate for the current display currency.
  useEffect(() => {
    if (currency === baseCurrency) {
      setRateState(1);
      setRateSource("manual");
      return;
    }
    const pinned = localStorage.getItem(manualPinKey(currency)) === "1";
    const cachedRaw = localStorage.getItem(cacheKey(currency));
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (typeof cached.rate === "number" && cached.rate > 0) {
          setRateState(cached.rate);
          setRateSource("auto");
        }
      } catch {
        /* ignore */
      }
    } else {
      const manual = parseFloat(localStorage.getItem(manualKey(currency)) ?? "");
      if (Number.isFinite(manual) && manual > 0) {
        setRateState(manual);
        setRateSource(pinned ? "manual" : "loading");
      }
    }

    if (pinned) return;

    let cancelled = false;
    setRateSource("loading");
    (async () => {
      let fetched: number | null = null;
      try {
        fetched = await fetchAutoRate(baseCurrency, currency);
      } catch {
        try {
          fetched = await fetchFallbackRate(baseCurrency, currency);
        } catch {
          fetched = null;
        }
      }
      if (cancelled) return;
      if (fetched) {
        setRateState(fetched);
        setRateSource("auto");
        localStorage.setItem(
          cacheKey(currency),
          JSON.stringify({ rate: fetched, date: new Date().toISOString() }),
        );
      } else {
        const cachedRaw2 = localStorage.getItem(cacheKey(currency));
        setRateSource(cachedRaw2 ? "auto" : "offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currency, baseCurrency, fetchTick]);

  useEffect(() => {
    document.documentElement.dataset.currency = currency;
  }, [currency]);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const setBaseCurrency = useCallback((code: string) => {
    setBaseState(code);
    localStorage.setItem(BASE_KEY, code);
  }, []);

  const setManualRate = useCallback(
    (value: number) => {
      setRateState(value);
      setRateSource("manual");
      localStorage.setItem(manualKey(currency), String(value));
      localStorage.setItem(manualPinKey(currency), "1");
    },
    [currency],
  );

  const refreshAutoRate = useCallback(() => {
    localStorage.removeItem(manualPinKey(currency));
    setFetchTick((n) => n + 1);
  }, [currency]);

  const formatMoney = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(currentLocale(), {
        style: "currency",
        currency,
      }).format(amount * rate),
    [currency, rate],
  );

  const currencyName = useCallback((code: string) => {
    try {
      return (
        new Intl.DisplayNames([currentLocale()], { type: "currency" }).of(
          code,
        ) ?? code
      );
    } catch {
      return code;
    }
  }, []);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        baseCurrency,
        setBaseCurrency,
        rate,
        rateSource,
        refreshAutoRate,
        setManualRate,
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
