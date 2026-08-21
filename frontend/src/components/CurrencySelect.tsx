import { CURRENCIES, useCurrency } from "../currency";

const POPULAR = ["USD", "EUR", "UAH", "GBP", "PLN", "CZK"];

export function CurrencySelect() {
  const { currency, setCurrency, currencyName } = useCurrency();
  const rest = CURRENCIES.filter((c) => !POPULAR.includes(c));

  return (
    <select
      className="currency-select"
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      aria-label={currencyName(currency)}
      title={currencyName(currency)}
    >
      <optgroup label="Popular">
        {POPULAR.map((code) => (
          <option key={code} value={code}>
            {code} — {currencyName(code)}
          </option>
        ))}
      </optgroup>
      <optgroup label="All currencies">
        {rest.map((code) => (
          <option key={code} value={code}>
            {code} — {currencyName(code)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
