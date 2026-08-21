import { useEffect, useState } from "react";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import { CurrencyConverter } from "./CurrencyConverter";

export function RateBar() {
  const { t } = useI18n();
  const {
    currency,
    baseCurrency,
    rate,
    rateSource,
    refreshAutoRate,
    setManualRate,
  } = useCurrency();

  const [draft, setDraft] = useState(String(rate));

  useEffect(() => {
    setDraft(String(rate));
  }, [rate, currency]);

  function commitManual() {
    const value = parseFloat(draft.replace(",", "."));
    if (Number.isFinite(value) && value > 0) {
      setManualRate(value);
    } else {
      setDraft(String(rate));
    }
  }

  // The records currency is switched in the header. The rate bar only
  // appears when the display currency is deliberately different.
  if (currency === baseCurrency) return <CurrencyConverter />;

  const badge =
    rateSource === "auto"
      ? { cls: "auto", text: `✓ ${t("autoRate")}` }
      : rateSource === "loading"
        ? { cls: "loading", text: t("rateLoading") }
        : rateSource === "offline"
          ? { cls: "offline", text: t("offlineHint") }
          : null;

  return (
    <>
      <div className="rate-bar card">
        <span className="rate-block">
          {baseCurrency} → {currency}
        </span>

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
            onBlur={commitManual}
            onKeyDown={(e) => e.key === "Enter" && commitManual()}
          />
        </label>

        <button type="button" className="btn-ghost" onClick={commitManual}>
          {t("manualRate")}
        </button>

        {badge && <span className={`rate-badge ${badge.cls}`}>{badge.text}</span>}

        {(rateSource === "manual" || rateSource === "offline") && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              refreshAutoRate();
            }}
          >
            ⟳ {t("useAuto")}
          </button>
        )}

        {rateSource === "manual" && (
          <span className="rate-hint">{t("manualPinned")}</span>
        )}
      </div>

      <CurrencyConverter />
    </>
  );
}
