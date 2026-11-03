import { useEffect, useRef, useState } from "react";
import sellerSplashBackground from "../../../assets/sellersplashbg.jpg";
import "./SellerSplashScreen.css";

const sellerFeatures = [
  {
    icon: "storefront",
    title: "Manage Shop",
    description: "Inventory & settings",
  },
  {
    icon: "inventory_2",
    title: "Showcase Products",
    description: "List & highlight items",
  },
  {
    icon: "assignment",
    title: "Track Orders",
    description: "Monitor & fulfill",
  },
];

export default function SellerSplashScreen({ onBack, onGetStarted }) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(loadingTimer.current), []);

  const handleGetStarted = () => {
    if (isLoading) return;

    setIsLoading(true);
    loadingTimer.current = window.setTimeout(onGetStarted, 650);
  };

  return (
    <main className="seller-splash">
      <button
        className="seller-splash-back"
        type="button"
        aria-label="Back to Marketplace"
        onClick={onBack}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_back
        </span>
      </button>
      <section className="seller-splash-art" aria-hidden="true">
        <img className="seller-splash-background" src={sellerSplashBackground} alt="" />
        <div className="seller-splash-art-icon">
          <span className="material-symbols-outlined">storefront</span>
        </div>
      </section>

      <section className="seller-splash-content" aria-labelledby="seller-splash-title">
        <div className="seller-splash-card">
          <h1 id="seller-splash-title">
            Welcome to
            <br />
            Seller Center
          </h1>
          <p className="seller-splash-description">
            Your home for managing your shop, showcasing products, and staying
            connected with the Gemstone Marketplace community.
          </p>

          <ul className="seller-splash-features" aria-label="Seller Center features">
            {sellerFeatures.map((feature) => (
              <li className="seller-splash-feature" key={feature.title}>
                <span className="seller-splash-feature-icon">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {feature.icon}
                  </span>
                </span>
                <strong>{feature.title}</strong>
                <span>{feature.description}</span>
              </li>
            ))}
          </ul>

          <button
            className="seller-splash-primary"
            type="button"
            disabled={isLoading}
            aria-busy={isLoading}
            onClick={handleGetStarted}
          >
            {isLoading ? (
              <>
                <span className="seller-splash-spinner" aria-hidden="true" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </div>

        <aside className="seller-splash-note">
          <span className="material-symbols-outlined" aria-hidden="true">
            tips_and_updates
          </span>
          <p>
            <strong>Tip:</strong> Start by checking your seller messages to
            connect with buyers faster. More tools rolling out soon.
          </p>
        </aside>
      </section>
    </main>
  );
}
