import { useState } from "react";
import logo from "../../../assets/app_logo_final.png";
import "./SellerLandingPage.css";

const sellerSteps = [
  {
    number: "01",
    icon: "person_add",
    title: "Get your seller profile ready",
    description: "Tell us about your shop and the gemstones you offer.",
  },
  {
    number: "02",
    icon: "fact_check",
    title: "Prepare your details",
    description: "Gather the documents that match your business type.",
  },
  {
    number: "03",
    icon: "diamond",
    title: "Showcase your collection",
    description: "Add product details and get ready to meet gemstone buyers.",
  },
];

const individualDocuments = [
  "Valid government-issued ID",
  "Proof of address and contact details",
  "Bank or payout account details",
];

const businessDocuments = [
  "Business registration (DTI or SEC, if applicable)",
  "BIR registration documents, if applicable",
  "Authorized representative’s valid government-issued ID",
];

const sellerBenefits = [
  {
    icon: "diamond",
    title: "Made for gemstones",
    description: "A marketplace experience centered on gemstones and the people behind them.",
  },
  {
    icon: "storefront",
    title: "Your shop, your story",
    description: "Build a recognizable home for your collection and share what makes it special.",
  },
  {
    icon: "groups",
    title: "A community to grow with",
    description: "Connect with gemstone enthusiasts and fellow independent sellers.",
  },
];

export default function SellerLandingPage({ onBack, onStartSellerJourney }) {
  const [notice, setNotice] = useState("");

  const showComingSoon = (feature) => {
    setNotice(`${feature} is coming soon.`);
  };

  return (
    <div className="seller-landing">
      <header className="seller-landing-header">
        <button
          className="seller-landing-back"
          type="button"
          aria-label="Back to marketplace"
          onClick={onBack}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <div className="seller-landing-brand" aria-label="Gemstone Marketplace">
          <img src={logo} alt="" />
          <span>Gemstone <strong>Marketplace</strong></span>
        </div>
        <button
          className="seller-landing-menu"
          type="button"
          aria-label="Seller menu"
          onClick={() => showComingSoon("Seller menu")}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
      </header>

      <main>
        <section className="seller-landing-hero" id="seller-home">
          <div className="seller-landing-hero-inner">
            <div className="seller-landing-hero-copy">
              <span className="seller-landing-eyebrow">
                <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                YOUR NEXT CHAPTER STARTS HERE
              </span>
              <h1>Bring your gemstones to a world of new buyers.</h1>
              <p className="seller-landing-tagline">
                Your craft deserves to be discovered. Grow your gemstone business with a
                marketplace made for your passion.
              </p>
              <button
                className="seller-landing-primary"
                type="button"
                onClick={onStartSellerJourney}
              >
                Start your seller journey
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
              <p className="seller-landing-offer">
                <span className="material-symbols-outlined" aria-hidden="true">redeem</span>
                Seller launch deals and perks are coming soon
              </p>
              <div className="seller-landing-hero-benefits" aria-label="Seller benefits">
                <span><span className="material-symbols-outlined" aria-hidden="true">public</span>Reach new buyers</span>
                <span><span className="material-symbols-outlined" aria-hidden="true">diamond</span>Showcase your gems</span>
                <span><span className="material-symbols-outlined" aria-hidden="true">trending_up</span>Grow your shop</span>
              </div>
            </div>
            <div className="seller-landing-gem-art" aria-hidden="true">
              <span className="seller-landing-orbit seller-landing-orbit-one" />
              <span className="seller-landing-orbit seller-landing-orbit-two" />
              <img src={logo} alt="" />
              <span className="seller-landing-art-label">A brighter place to grow</span>
            </div>
          </div>
          {notice && <p className="seller-landing-notice" role="status" aria-live="polite">{notice}</p>}
        </section>

        <section className="seller-landing-steps seller-landing-section" aria-labelledby="seller-steps-title">
          <div className="seller-landing-section-heading">
            <span className="seller-landing-kicker">GETTING STARTED</span>
            <h2 id="seller-steps-title">3 steps to start selling</h2>
            <p>A simple path from your first hello to your first listing.</p>
          </div>
          <div className="seller-landing-step-grid">
            {sellerSteps.map((step) => (
              <article className="seller-landing-step" key={step.number}>
                <div className="seller-landing-step-icon">
                  <span className="material-symbols-outlined" aria-hidden="true">{step.icon}</span>
                  <span>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="seller-landing-documents seller-landing-section" aria-labelledby="seller-documents-title">
          <div className="seller-landing-section-heading">
            <span className="seller-landing-kicker">BE READY</span>
            <h2 id="seller-documents-title">Documents to prepare</h2>
            <p>Requirements may vary depending on your seller and business type.</p>
          </div>
          <div className="seller-landing-document-grid">
            <article className="seller-landing-document-card">
              <div className="seller-landing-document-icon">
                <span className="material-symbols-outlined" aria-hidden="true">person</span>
              </div>
              <h3>Starting as an individual</h3>
              <ul>
                {individualDocuments.map((document) => (
                  <li key={document}>
                    <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                    {document}
                  </li>
                ))}
              </ul>
            </article>
            <article className="seller-landing-document-card">
              <div className="seller-landing-document-icon seller-landing-document-icon-business">
                <span className="material-symbols-outlined" aria-hidden="true">business</span>
              </div>
              <h3>Registering a business</h3>
              <ul>
                {businessDocuments.map((document) => (
                  <li key={document}>
                    <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                    {document}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <p className="seller-landing-document-note">
            This is a general preparation guide, not a final checklist. We’ll share the
            complete requirements when seller registration becomes available.
          </p>
        </section>

        <section className="seller-landing-why seller-landing-section" aria-labelledby="seller-why-title">
          <div className="seller-landing-section-heading">
            <span className="seller-landing-kicker">GEMSTONE MARKETPLACE</span>
            <h2 id="seller-why-title">Why sell with us?</h2>
            <p>Built around the craft, character, and community of gemstones.</p>
          </div>
          <div className="seller-landing-benefit-grid">
            {sellerBenefits.map((benefit) => (
              <article className="seller-landing-benefit-card" key={benefit.title}>
                <span className="material-symbols-outlined" aria-hidden="true">{benefit.icon}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
          <div className="seller-landing-community">
            <span className="material-symbols-outlined" aria-hidden="true">volunteer_activism</span>
            <p>Every gemstone has a story. We’re creating a place where yours can shine.</p>
          </div>
        </section>
      </main>

      <footer className="seller-landing-footer">
        <div className="seller-landing-footer-inner">
          <div className="seller-landing-footer-brand">
            <img src={logo} alt="" />
            <div>
              <strong>Gemstone Marketplace</strong>
              <span>Where every stone finds its story.</span>
            </div>
          </div>
          <div className="seller-landing-footer-links">
            <div>
              <h2>Customer service</h2>
              <button type="button" onClick={() => showComingSoon("Help center")}>Help center</button>
              <button type="button" onClick={() => showComingSoon("Contact support")}>Contact support</button>
            </div>
            <div>
              <h2>Community</h2>
              <button type="button" onClick={() => showComingSoon("Seller community group")}>Seller community group</button>
              <button type="button" onClick={() => showComingSoon("Seller stories")}>Seller stories</button>
            </div>
          </div>
          <p className="seller-landing-copyright">© {new Date().getFullYear()} Gemstone Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
