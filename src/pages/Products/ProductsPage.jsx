import { useNavigate } from "react-router-dom";
import diamondCard from "../../assets/diamond_card_products.png";
import emeraldCard from "../../assets/emerald_card_products.png";
import sapphireCard from "../../assets/sapphire_card_products.png";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { packages } from "../../utils/PackagesData";
import "./ProductsPage.css";

const tierImages = {
  emerald: emeraldCard,
  sapphire: sapphireCard,
  diamond: diamondCard,
};

const fallbackTierImages = [emeraldCard, sapphireCard, diamondCard];

function FeatureRow({ children }) {
  return (
    <span className="prod-feature-row">
      <span className="material-symbols-outlined">check_circle</span>
      {children}
    </span>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();

  return (
    <div className="prod-root">
      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar />

      <div className="prod-shell">
        <main className="prod-main">
          <div className="prod-content">
            {/* Page header */}
            <div className="prod-page-header">
              <div>
                <h2 className="prod-page-title">Products</h2>
                <p className="prod-page-sub">
                  Choose the membership tier that matches your networking goals.
                </p>
              </div>
            </div>

            {/* Packages grid */}
            <section className="prod-packages-grid">
              {packages.map((pkg, index) => (
                <button
                  key={pkg.id}
                  className="prod-glass-panel prod-package-card"
                  onClick={() =>
                    navigate(`/purchase-codes/package/${pkg.id}`, {
                      state: { package: pkg },
                    })
                  }
                >
                  <img
                    className="prod-package-image"
                    src={
                      tierImages[pkg.tierColor] ||
                      fallbackTierImages[index % fallbackTierImages.length]
                    }
                    alt=""
                  />
                  <span className="prod-package-vignette" />
                  <span className="prod-package-content">
                    <span className="prod-package-top-row">
                      <span className="prod-tier-tag">{pkg.tier}</span>
                      <span
                        className="prod-price-tag"
                        aria-label="Price configured by backend"
                      />
                    </span>
                    <span className="prod-package-bottom">
                      <span className="prod-package-membership">
                        MEMBERSHIP
                      </span>
                      <span className="prod-feature-list">
                        <FeatureRow>{pkg.totalGems} Total GEMS</FeatureRow>
                        <FeatureRow>
                          {pkg.dailyGems} GEMS Daily Rewards
                        </FeatureRow>
                        {Array.isArray(pkg.features) &&
                          pkg.features.map((feature) => (
                            <FeatureRow key={feature}>{feature}</FeatureRow>
                          ))}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </section>
          </div>

          {/* Footer */}
          <footer className="prod-footer">
            <div className="prod-footer-inner">
              <p className="prod-footer-copy">
                © 2024 Gemstone Code. All rights reserved.
              </p>
              <div className="prod-footer-links">
                <a className="prod-footer-link" href="#">
                  Privacy Policy
                </a>
                <a className="prod-footer-link" href="#">
                  Terms of Service
                </a>
                <a className="prod-footer-link" href="#">
                  Help Center
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
      <BottomNav activeItem="products" />
    </div>
  );
}
