import { useI18n } from "../i18n";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

const FEATURES = [
  { icon: "💱", en: "Multi-currency support", uk: "Підтримка багатьох валют" },
  { icon: "📊", en: "Budget tracking", uk: "Відстеження бюджетів" },
  { icon: "🎯", en: "Savings goals", uk: "Цілі заощаджень" },
  { icon: "🔁", en: "Recurring transactions", uk: "Повторювані транзакції" },
  { icon: "🏦", en: "Multiple accounts", uk: "Кілька рахунків" },
  { icon: "🔔", en: "Reminders", uk: "Нагадування" },
  { icon: "📈", en: "Financial reports", uk: "Фінансові звіти" },
  { icon: "👥", en: "Shared access", uk: "Спільний доступ" },
  { icon: "📉", en: "Category trends", uk: "Тренди по категоріях" },
];

const FREE_FEATURES_EN = [
  "Unlimited transactions",
  "Multi-currency support",
  "Budget tracking",
  "Savings goals",
  "Recurring transactions",
  "Multiple accounts",
  "Reminders",
  "Financial reports",
  "Shared access",
  "Category trends",
  "CSV export & import",
  "Charts & statistics",
];

const FREE_FEATURES_UK = [
  "Необмежені транзакції",
  "Підтримка багатьох валют",
  "Відстеження бюджетів",
  "Цілі заощаджень",
  "Повторювані транзакції",
  "Кілька рахунків",
  "Нагадування",
  "Фінансові звіти",
  "Спільний доступ",
  "Тренди по категоріях",
  "Експорт та імпорт CSV",
  "Графіки та статистика",
];

export function Landing() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  if (user) return <Navigate to="/app" replace />;

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <span className="logo">¢</span>
          <span className="landing-brand">Pennywise</span>
          <div className="landing-nav-links">
            <a href="#features">{lang === "uk" ? "Можливості" : "Features"}</a>
            <a href="#pricing">{lang === "uk" ? "Ціни" : "Pricing"}</a>
            <Link to="/login" className="btn-ghost">{t("login")}</Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <h1>
          <span className="logo">¢</span> Pennywise
        </h1>
        <p className="hero-tagline">
          {lang === "uk"
            ? "Контролюйте кожну копійку."
            : "Every penny accounted for."}
        </p>
        <p className="hero-sub">
          {lang === "uk"
            ? "Простий та потужний трекер особистих фінансів. Слідкуйте за бюджетами, цілями заощаджень та рахунками — все в одному місці."
            : "A simple yet powerful personal finance tracker. Track budgets, savings goals, multiple accounts, and more — all in one place."}
        </p>
        <div className="hero-actions">
          <Link to="/login" className="landing-cta">
            {lang === "uk" ? "Почати безкоштовно" : "Get Started Free"}
          </Link>
          <a href="#features" className="btn-ghost btn-lg">
            {lang === "uk" ? "Дізнатися більше" : "Learn more"}
          </a>
        </div>
      </section>

      <section id="features" className="landing-features">
        <h2>{lang === "uk" ? "Можливості" : "Features"}</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.en} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <p>{lang === "uk" ? f.uk : f.en}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="landing-pricing">
        <h2>{lang === "uk" ? "Ціни" : "Pricing"}</h2>
        <div className="pricing-single">
          <div className="pricing-card highlighted">
            <h3>{lang === "uk" ? "Безкоштовний" : "Free"}</h3>
            <div className="pricing-price">
              $0
              <span>{lang === "uk" ? " назавжди" : " forever"}</span>
            </div>
            <ul>
              {(lang === "uk" ? FREE_FEATURES_UK : FREE_FEATURES_EN).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link to="/login" className="btn-primary" style={{ width: "100%", textAlign: "center" }}>
              {lang === "uk" ? "Почати" : "Get started"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          © {new Date().getFullYear()} Pennywise. {lang === "uk" ? "Усі права захищені." : "All rights reserved."}
        </p>
        <div className="landing-footer-links">
          <Link to="/terms">{lang === "uk" ? "Умови використання" : "Terms of Service"}</Link>
          <Link to="/privacy">{lang === "uk" ? "Політика конфіденційності" : "Privacy Policy"}</Link>
        </div>
      </footer>
    </div>
  );
}
