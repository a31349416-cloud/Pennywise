import { useI18n } from "../i18n";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

const FEATURES = [
  { icon: "💰", en: "Track income & expenses", uk: "Облік доходів і витрат" },
  { icon: "📊", en: "Visual charts & statistics", uk: "Візуальні графіки та статистика" },
  { icon: "🎯", en: "Set monthly budgets", uk: "Встановлюйте бюджети на місяць" },
  { icon: "💱", en: "Multi-currency support", uk: "Підтримка багатьох валют" },
  { icon: "📱", en: "Works on any device", uk: "Працює на будь-якому пристрої" },
  { icon: "🔒", en: "Your data is private & secure", uk: "Ваші дані приватні та захищені" },
];

const PLANS = [
  {
    name: { en: "Free", uk: "Безкоштовний" },
    price: { en: "$0", uk: "0 ₴" },
    period: { en: "forever", uk: "назавжди" },
    features: {
      en: [
        "Unlimited transactions",
        "Monthly budgets",
        "CSV export/import",
        "Multi-currency",
        "Charts & statistics",
      ],
      uk: [
        "Необмежені транзакції",
        "Бюджети на місяць",
        "Експорт/імпорт CSV",
        "Багато валют",
        "Графіки та статистика",
      ],
    },
    highlighted: true,
  },
  {
    name: { en: "Pro", uk: "Про" },
    price: { en: "$4", uk: "149 ₴" },
    period: { en: "/month", uk: "/місяць" },
    features: {
      en: [
        "Everything in Free",
        "Recurring transactions",
        "Savings goals",
        "Priority support",
        "Data backup & restore",
      ],
      uk: [
        "Все з Безкоштовного",
        "Повторювані транзакції",
        "Цілі заощаджень",
        "Пріоритетна підтримка",
        "Бекап та відновлення даних",
      ],
    },
    highlighted: false,
  },
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
            <a href="#features">{lang === "uk" ? "Фічі" : "Features"}</a>
            <a href="#pricing">{lang === "uk" ? "Ціни" : "Pricing"}</a>
            <Link to="/app" className="btn-ghost">{t("login")}</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <h1>
          <span className="logo">¢</span> Pennywise
        </h1>
        <p className="hero-tagline">{t("tagline")}</p>
        <p className="hero-sub">
          {lang === "uk"
            ? "Простий та потужний трекер особистих фінансів. Контролюйте кожну копійку."
            : "Simple and powerful personal finance tracker. Control every penny."}
        </p>
        <div className="hero-actions">
          <Link to="/app" className="btn-primary btn-lg">
            {lang === "uk" ? "Почати безкоштовно" : "Get started free"}
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
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name.en}
              className={`pricing-card ${plan.highlighted ? "highlighted" : ""}`}
            >
              <h3>{lang === "uk" ? plan.name.uk : plan.name.en}</h3>
              <div className="pricing-price">
                {lang === "uk" ? plan.price.uk : plan.price.en}
                <span>{lang === "uk" ? plan.period.uk : plan.period.en}</span>
              </div>
              <ul>
                {(lang === "uk" ? plan.features.uk : plan.features.en).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link to="/app" className="btn-primary" style={{ width: "100%", textAlign: "center" }}>
                {lang === "uk" ? "Почати" : "Get started"}
              </Link>
            </div>
          ))}
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
