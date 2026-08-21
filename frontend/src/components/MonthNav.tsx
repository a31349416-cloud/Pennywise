import { currentMonthKey, shiftMonthKey } from "../months";
import { useI18n } from "../i18n";

interface Props {
  monthKey: string;
  onChange: (key: string) => void;
}

export function MonthNav({ monthKey, onChange }: Props) {
  const { lang } = useI18n();
  const [y, m] = monthKey.split("-").map(Number);

  const label = new Date(y, m - 1, 1).toLocaleDateString(
    lang === "uk" ? "uk-UA" : "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="month-nav card">
      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(monthKey, -1))}
        aria-label="◀"
        title="◀"
      >
        ◀
      </button>
      <span className="month-label">{label}</span>
      <button
        type="button"
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        disabled={monthKey >= currentMonthKey()}
        aria-label="▶"
        title="▶"
      >
        ▶
      </button>
    </div>
  );
}
