import { Link } from "react-router-dom";
import "./PrivacyPage.css";

export function PrivacyContent() {
  return (
    <article className="privacy-document">
      <p className="privacy-eyebrow">GEMSTONE ADVERTISEMENT MARKETING</p>
      <h1>PRIVACY POLICY</h1>
      <p className="privacy-updated">Effective Date: September 20, 2026</p>

      <p>
        Gemstone Advertisement Marketing ("GAM") respects your privacy and is
        committed to protecting your personal information.
      </p>

      <section>
        <h2>1. INFORMATION WE COLLECT</h2>
        <p>
          We may collect information such as your name, contact details,
          account information, identification information when required,
          transaction records, and other information necessary to provide our
          services.
        </p>
      </section>

      <section>
        <h2>2. HOW WE USE YOUR INFORMATION</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Create and manage your account;</li>
          <li>Process purchases and transactions;</li>
          <li>Verify accounts;</li>
          <li>Provide rewards, services, and customer support;</li>
          <li>Maintain and secure our system;</li>
          <li>Prevent fraud and unauthorized activity; and</li>
          <li>Comply with applicable laws and regulations.</li>
        </ul>
      </section>

      <section>
        <h2>3. INFORMATION SHARING</h2>
        <p>
          We do not sell your personal information. We may share necessary
          information with authorized service providers, payment or delivery
          providers, government authorities, or other parties when legally
          permitted or required.
        </p>
      </section>

      <section>
        <h2>4. DATA SECURITY</h2>
        <p>
          We use reasonable security measures to protect your personal
          information from unauthorized access, loss, misuse, or disclosure.
        </p>
      </section>

      <section>
        <h2>5. YOUR RIGHTS</h2>
        <p>
          Subject to applicable law, you may have the right to access, correct,
          object to, or request the appropriate handling of your personal
          information.
        </p>
      </section>

      <section>
        <h2>6. CONTACT US</h2>
        <p>For privacy concerns, contact:</p>
        <p>Email: gems021072@gmail.com</p>
        <p>Contact: 09515065406</p>
        <p>Address: Apokon Tagum City Davao Del Norte</p>
      </section>

      <p>
        By using our platform, you acknowledge that you have read and
        understood this Privacy Policy.
      </p>
      <p className="privacy-updated">Last Updated: September 20, 2026</p>
    </article>
  );
}

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-shell">
        <Link className="privacy-back-link" to="/login">
          Back to Login
        </Link>

        <PrivacyContent />
      </div>
    </main>
  );
}