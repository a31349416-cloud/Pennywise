import { Link } from "react-router-dom";

export function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <Link to="/" className="legal-back">← Back to Pennywise</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: August 25, 2026</p>

        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy explains how Pennywise ("we", "our", or "the Service") collects,
          uses, and protects your personal information when you use our personal finance tracking application.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>Account Information</h3>
        <p>When you register, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Password (stored securely using bcrypt hashing)</li>
        </ul>

        <h3>Financial Data</h3>
        <p>You may enter the following financial information:</p>
        <ul>
          <li>Transaction records (income and expenses)</li>
          <li>Budget limits by category</li>
          <li>Notes and descriptions</li>
        </ul>

        <h3>Usage Data</h3>
        <p>We may collect anonymized usage statistics to improve the Service.</p>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To authenticate your account</li>
          <li>To display your financial data and statistics</li>
          <li>To improve the Service</li>
        </ul>

        <h2>4. Data Storage and Security</h2>
        <p>
          Your data is stored securely and each user's data is fully isolated.
          We use industry-standard security practices including:
        </p>
        <ul>
          <li>Bcrypt password hashing</li>
          <li>JWT-based authentication</li>
          <li>User data isolation (multi-tenancy)</li>
          <li>HTTPS encryption for all communications</li>
        </ul>

        <h2>5. Data Sharing</h2>
        <p>
          We do NOT sell, trade, or share your personal or financial data with any third parties.
          Your data is exclusively yours.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. You may request deletion
          of your account and all associated data at any time.
        </p>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Export your data in CSV format</li>
          <li>Delete your account and all associated data</li>
          <li>Withdraw consent at any time</li>
        </ul>

        <h2>8. GDPR Compliance</h2>
        <p>
          If you are located in the European Economic Area (EEA), you have additional rights
          under the General Data Protection Regulation (GDPR), including the right to
          data portability and the right to lodge a complaint with a supervisory authority.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not intended for users under the age of 16. We do not knowingly
          collect personal information from children.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any
          significant changes by posting the new policy on this page.
        </p>

        <h2>11. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at
          support@pennywise.app.
        </p>
      </div>
    </div>
  );
}
