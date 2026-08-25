import { useEffect, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { CategoryTrend } from "../types";

interface Props {
  onChanged: () => void;
}

export function CategoryTrends({ onChanged: _onChanged }: Props) {
  const { t, monthLabel, categoryLabel } = useI18n();
  const { formatMoney } = useCurrency();
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [trend, setTrend] = useState<CategoryTrend[]>([]);

  useEffect(() => {
    api
      .listCategories("expense")
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) {
      setTrend([]);
      return;
    }
    api
      .categoryTrend(selected)
      .then(setTrend)
      .catch(() => {});
  }, [selected]);

  const max = trend.length > 0 ? Math.max(...trend.map((d) => d.total), 1) : 1;

  return (
    <section className="card category-trends">
      <h2>{t("categoryTrends")}</h2>

      <select
        className="trend-category-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="" disabled>
          {t("selectCategory")}
        </option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>

      {!selected ? (
        <p className="empty">{t("selectCategory")}</p>
      ) : trend.length === 0 ? (
        <p className="empty">{t("noDataYet")}</p>
      ) : (
        <div className="bars">
          {trend.map((d) => (
            <div
              key={d.month}
              className="bar-group"
              title={`${monthLabel(d.month)}: ${formatMoney(d.total)}`}
            >
              <div className="bar-pair">
                <div
                  className="bar expense"
                  style={{ height: `${(d.total / max) * 100}%` }}
                />
              </div>
              <span className="bar-label">{monthLabel(d.month)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
