import { useEffect, useState } from "react";
import { CURRENCIES, fetchAnyRate, useCurrency } from "../currency";
import { useI18n } from "../i18n";

function format(amount: number, code: string): string {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: code,
  }).format(amount);
}

export function CurrencyConverter() {
  const { t } = useI18n();
  const { baseCurrency, currency, currencyName } = useCurrency();

  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(baseCurrency);
  const [to, setTo] = useState(currency === baseCurrency ? "EUR" : currency);
  const [rate, setRate] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFrom(baseCurrency), [baseCurrency]);

  useEffect(() => {
    let cancelled = false;
    setRate(null);
    setFailed(false);
    fetchAnyRate(from, to)
      .then((r) => {
        if (!cancelled) setRate(r);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const value = parseFloat(amount.replace(",", "."));
  const result =
    Number.isFinite(value) && rate !== null ? format(value * rate, to) : null;

  return (
    <div className="card converter">
      <h2>{t("converterTitle")}</h2>

      <div className="converter-row">
        <input
          type="number"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={t("convertAmount")}
        />
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title={currencyName(from)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          aria-label={t("swap")}
          title={t("swap")}
        >
          ⇄
        </button>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title={currencyName(to)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="converter-result">
        {failed ? (
          <span className="form-error">{t("ratesUnavailable")}</span>
        ) : rate === null ? (
          <span className="rate-badge loading">{t("rateLoading")}</span>
        ) : (
          <>
            <span className="converted">{result}</span>
            <span className="rate-hint">
              1 {from} = {rate.toPrecision(6)} {to}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
