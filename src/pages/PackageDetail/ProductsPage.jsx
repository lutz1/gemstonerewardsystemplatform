import { MdArrowBack } from "react-icons/md";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import diamondCard from "../../assets/diamond_card_products.png";
import emeraldCard from "../../assets/emerald_card_products.png";
import sapphireCard from "../../assets/sapphire_card_products.png";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { calcTotal, formatCurrency, getPackageById } from "../../utils/PackagesData";
import "./ProductsPage.css";

const tierImages = {
  emerald: emeraldCard,
  sapphire: sapphireCard,
  diamond: diamondCard,
};

export default function PackageDetailPage() {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const location = useLocation();
  const pkg = location.state?.package ?? getPackageById(packageId);
  const total = pkg ? calcTotal(pkg) : 0;

  if (!pkg) {
    return (
      <div className="prod-root">
        <TopBar />
        <div className="prod-shell">
          <main className="prod-main">
            <div className="prod-content">
              <div className="prod-glass-panel prod-detail-card">
                <h2 className="prod-page-title">Package not found</h2>
                <p className="prod-page-sub">That package could not be loaded. Please return to the products screen.</p>
                <Link className="prod-primary-btn" to="/products">
                  Back to products
                </Link>
              </div>
            </div>
          </main>
        </div>
        <BottomNav activeItem="products" />
      </div>
    );
  }

  return (
    <div className="prod-root">
      <TopBar />

      <div className="prod-shell">
        <main className="prod-main">
          <div className="prod-content">
            <div className="prod-detail-top-nav">
              <button
                className="prod-back-link"
                type="button"
                onClick={() => navigate("/products")}
              >
                <MdArrowBack size={18} />
                Back
              </button>
            </div>
            <div className="prod-page-header">
              <div>
                <p className="prod-page-eyebrow">Package detail</p>
                <h2 className="prod-page-title">{pkg.name}</h2>
                <p className="prod-page-sub">
                  Review the package details below and continue to the QR checkout flow.
                </p>
              </div>
            </div>

            <section className="prod-glass-panel prod-detail-card">
              <div className="prod-detail-hero">
                <img
                  className="prod-detail-image"
                  src={tierImages[pkg.tierColor]}
                  alt={`${pkg.tier} membership`}
                />
                <div className="prod-detail-image-overlay" />
                <div className="prod-detail-hero-content">
                  <span className="prod-detail-tier-pill">{pkg.tier}</span>
                  <h2>{pkg.name}</h2>
                  <p>Membership access with rewards built for your network.</p>
                </div>
              </div>

              <div className="prod-detail-summary">
                <div className="prod-detail-price-block">
                  <span className="prod-detail-label">Membership price</span>
                  <strong className="prod-detail-price">{formatCurrency(total)}</strong>
                </div>
                <div className="prod-detail-gems-block">
                  <span className="prod-detail-label">Daily reward</span>
                  <strong>{pkg.dailyGems} GEMS</strong>
                </div>
              </div>

              <div className="prod-detail-body">
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Total GEM allocation</span>
                  <span className="prod-detail-value">{pkg.totalGems} GEMS</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Access level</span>
                  <span className="prod-detail-value">{pkg.tier} Membership</span>
                </div>
              </div>

              <div className="prod-detail-benefits">
                <h3>Membership benefits</h3>
                <div>
                  {(pkg.features || []).map((feature) => (
                    <span key={feature}>
                      <span className="material-symbols-outlined">check_circle</span>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="prod-detail-actions">
                <button
                  className="prod-primary-btn"
                  type="button"
                  onClick={() =>
                    navigate(`/purchase-codes/package/${pkg.id}/checkout`, {
                      state: { package: pkg },
                    })
                  }
                >
                  Proceed Purchase Review
                </button>
              </div>
            </section>
          </div>

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