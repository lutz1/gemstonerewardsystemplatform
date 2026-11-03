import { Link } from "react-router-dom";
import "./TermsPage.css";

const sections = [
  [
    "1. MEMBER ACCOUNT",
    "Members must provide accurate information and are responsible for keeping their login credentials secure. Accounts must not be used for fraudulent or unauthorized activities.",
  ],
  [
    "2. PRODUCTS AND TRANSACTIONS",
    "Members must review product, package, price, payment, delivery, return, and refund information before completing a transaction.",
  ],
  [
    "3. REWARDS AND INCENTIVES",
    "Rewards, points, bonuses, or incentives are subject to the applicable program rules, eligibility requirements, and limitations. They should not be represented as guaranteed income unless legally supported.",
  ],
  [
    "4. REFERRALS AND SHARE LINKS",
    "Referral and share-link features must be used honestly and lawfully. Fake accounts, self-referrals, fraud, spam, misleading claims, and unauthorized activities are prohibited.",
  ],
  [
    "5. PROHIBITED ACTIVITIES",
    "Members must not use the platform for illegal activities, fraud, identity misuse, hacking, unauthorized access, or any activity that violates applicable laws.",
  ],
  [
    "6. ACCOUNT SUSPENSION",
    "GAM may suspend or terminate an account for violations of these Terms, fraudulent activity, security risks, or other legitimate grounds, subject to applicable law.",
  ],
  [
    "7. PLATFORM AVAILABILITY",
    "The platform may occasionally be unavailable due to maintenance, technical issues, system updates, or circumstances beyond our reasonable control.",
  ],
  [
    "8. PRIVACY",
    "Your personal information is handled according to our separate Privacy Policy.",
  ],
  [
    "9. GOVERNING LAW",
    "These Terms & Conditions are governed by the applicable laws of the Republic of the Philippines.",
  ],
];

export function TermsContent() {
  return (
    <article className="terms-document">
      <p className="terms-eyebrow">GEMSTONE ADVERTISEMENT MARKETING</p>
      <h1>TERMS &amp; CONDITIONS</h1>
      <p className="terms-effective">Effective Date: September 20, 2026</p>

      <p>
        By creating an account or using the Gemstone Advertisement Marketing
        platform, you agree to these Terms &amp; Conditions.
      </p>

      {sections.map(([title, text]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}

      <section>
        <h2>10. CONTACT US</h2>
        <p>Email: gems021072@gmail.com</p>
        <p>Contact: 09515065406</p>
        <p>Address: Apokon Tagum City Davao Del Norte</p>
      </section>

      <p>
        By clicking “I AGREE” or using the platform, you confirm that you have
        read, understood, and agreed to these Terms &amp; Conditions.
      </p>
      <p className="terms-effective">Last Updated: September 20, 2026</p>
    </article>
  );
}

export default function TermsPage() {
  return (
    <main className="terms-page">
      <div className="terms-shell">
        <Link className="terms-back-link" to="/login">
          Back to Login
        </Link>
        <TermsContent />
      </div>
    </main>
  );
}
