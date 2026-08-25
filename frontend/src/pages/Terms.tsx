import { Link } from "react-router-dom";

export function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <Link to="/" className="legal-back">← Back to Pennywise</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: August 25, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Pennywise ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Pennywise is a personal finance tracking application that allows users to record income and expenses,
          set budgets, view financial statistics, and export/import data. The Service is provided "as is"
          and may be modified or discontinued at any time.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          To use the Service, you must create an account with a valid email address and password.
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activities that occur under your account.
        </p>

        <h2>4. User Data</h2>
        <p>
          You retain ownership of all financial data you enter into the Service. We do not sell, share,
          or access your data except as necessary to provide the Service. Each user's data is isolated
          and cannot be accessed by other users.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to other users' data</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Use automated tools to access the Service without permission</li>
        </ul>

        <h2>6. Intellectual Property</h2>
        <p>
          The Service, including its design, code, and branding, is owned by Pennywise.
          You may not copy, modify, or distribute any part of the Service without prior written consent.
        </p>

        <h2>7. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          IN NO EVENT SHALL PENNYWISE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Continued use of the Service after
          changes constitutes acceptance of the new Terms.
        </p>

        <h2>10. Contact</h2>
        <p>
          If you have questions about these Terms, please contact us at support@pennywise.app.
        </p>
      </div>
    </div>
  );
}
