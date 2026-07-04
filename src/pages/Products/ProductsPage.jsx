import { useNavigate } from "react-router-dom";
import "./ProductsPage.css";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { packages, calcTotal, formatCurrency } from "../../utils/PackagesData";

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
                  Choose the code package that matches your networking tier.
                </p>
              </div>
            </div>

            {/* Packages grid */}
            <section className="prod-packages-grid">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  className="prod-glass-panel prod-package-card"
                  onClick={() =>
                    navigate(`/purchase-codes/package/${pkg.id}`, {
                      state: { package: pkg },
                    })
                  }
                >
                  <div className="prod-package-header">
                    <span className={`prod-tier-dot ${pkg.tierColor}`} />
                    <span className="prod-package-tier">{pkg.tier}</span>
                  </div>
                  <p className="prod-package-name">{pkg.name}</p>
                  <div className="prod-package-rows">
                    <div className="prod-package-row">
                      <span>Quantity</span>
                      <span>{pkg.quantity} codes</span>
                    </div>
                    <div className="prod-package-row">
                      <span>Price</span>
                      <span>{formatCurrency(pkg.price)} / code</span>
                    </div>
                    <div className="prod-package-row prod-package-total">
                      <span>Total</span>
                      <span>{formatCurrency(calcTotal(pkg))}</span>
                    </div>
                  </div>
                  <span className="prod-package-cta">
                    View Package
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </span>
                </button>
              ))}
            </section>
          </div>

          {/* Footer */}
          <footer className="prod-footer">
            <div className="prod-footer-inner">
              <p className="prod-footer-copy">© 2024 Gemstone Code. All rights reserved.</p>
              <div className="prod-footer-links">
                <a className="prod-footer-link" href="#">Privacy Policy</a>
                <a className="prod-footer-link" href="#">Terms of Service</a>
                <a className="prod-footer-link" href="#">Help Center</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
      <BottomNav activeItem="products" />
    </div>
  );
}