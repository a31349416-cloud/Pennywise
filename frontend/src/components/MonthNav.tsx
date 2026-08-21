import { useI18n } from "../i18n";

interface Props {
  monthKey: string;
  onChange: (key: string) => void;
}

export function MonthNav({ monthKey, onChange }: Props) {
  const { lang } = useI18n();
  const [y, m] = monthKey.split("-").map(Number);

  function shift(delta: number): void {
    const d = new Date(y, m - 1 + delta, 1);
    onChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const label = new Date(y, m - 1, 1).toLocaleDateString(
    lang === "uk" ? "uk-UA" : "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="month-nav card">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="◀"
        title="◀"
      >
        ◀
      </button>
      <span className="month-label">{label}</span>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={monthKey >= currentKey()}
        aria-label="▶"
        title="▶"
      >
        ▶
      </button>
    </div>
  );
}

function currentKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
