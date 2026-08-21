import { useEffect, useMemo, useRef, useState } from "react";
import { CURRENCIES, useCurrency } from "../currency";
import { useI18n } from "../i18n";

const POPULAR = ["USD", "EUR", "UAH", "GBP", "PLN", "CZK"];

export function CurrencySelect() {
  const { t } = useI18n();
  const { currency, setCurrency, currencyName } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const popular = POPULAR.map((code) => ({ code, name: currencyName(code) }));
  const rest = useMemo(
    () =>
      CURRENCIES.filter((c) => !POPULAR.includes(c))
        .map((code) => ({ code, name: currencyName(code) }))
        .filter(
          ({ code, name }) =>
            query === "" ||
            code.toLowerCase().includes(query.toLowerCase()) ||
            name.toLowerCase().includes(query.toLowerCase()),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query],
  );

  return (
    <div className="currency-wrap" ref={rootRef}>
      <button
        type="button"
        className="currency-button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        title={currencyName(currency)}
      >
        {currency}
      </button>

      {open && (
        <div className="currency-menu card">
          <input
            autoFocus
            type="text"
            className="currency-search"
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul>
            {query === "" && (
              <>
                <li className="currency-group">{t("popular")}</li>
                {popular.map(({ code, name }) => (
                  <li key={code}>
                    <button
                      type="button"
                      className={code === currency ? "active" : ""}
                      onClick={() => {
                        setCurrency(code);
                        setOpen(false);
                      }}
                    >
                      <b>{code}</b> {name}
                    </button>
                  </li>
                ))}
                <li className="currency-group">{t("allCurrencies")}</li>
              </>
            )}
            {rest.length === 0 && query !== "" && (
              <li className="currency-group">{t("nothingFound")}</li>
            )}
            {rest.map(({ code, name }) => (
              <li key={code}>
                <button
                  type="button"
                  className={code === currency ? "active" : ""}
                  onClick={() => {
                    setCurrency(code);
                    setOpen(false);
                  }}
                >
                  <b>{code}</b> {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
