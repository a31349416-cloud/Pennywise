import { useI18n } from "../i18n";
import type { Theme } from "../useTheme";

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={t("toggleTheme")}
      title={theme === "dark" ? t("lightMode") : t("darkMode")}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
