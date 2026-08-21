import { useEffect, useState } from "react";
import { CURRENCIES, useCurrency } from "../currency";
import { useI18n } from "../i18n";

export function RateBar() {
  const { t } = useI18n();
  const {
    currency,
    baseCurrency,
    setBaseCurrency,
    rate,
    setRate,
    currencyName,
  } = useCurrency();

  const [draft, setDraft] = useState(String(rate));

  useEffect(() => {
    setDraft(String(rate));
  }, [rate, currency]);

  if (currency === baseCurrency) return null;

  function commit() {
    const value = parseFloat(draft.replace(",", "."));
    if (Number.isFinite(value) && value > 0) {
      setRate(value);
    } else {
      setDraft(String(rate));
    }
  }

  return (
    <div className="rate-bar card">
      <label className="rate-block">
        <span>{t("recordsCurrency")}</span>
        <select
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code} — {currencyName(code)}
            </option>
          ))}
        </select>
      </label>

      <span className="rate-arrow">→</span>

      <label className="rate-block">
        <span>
          1 {baseCurrency} = … {currency}
        </span>
        <input
          type="number"
          step="any"
          min="0.000001"
          placeholder={t("ratePlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      </label>

      <span className="rate-hint">{t("rateSaved")}</span>
    </div>
  );
}
