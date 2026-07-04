import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import "./ProductsPage.css";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { getPackageById, calcTotal, formatCurrency } from "../../utils/PackagesData";

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
            <div className="prod-page-header">
              <div>
                <p className="prod-page-eyebrow">Package detail</p>
                <h2 className="prod-page-title">{pkg.name}</h2>
                <p className="prod-page-sub">
                  Review the package details below and continue to the QR checkout flow.
                </p>
              </div>
              <button className="prod-secondary-btn" type="button" onClick={() => navigate("/products")}>
                Back to Products
              </button>
            </div>

            <section className="prod-glass-panel prod-detail-card">
              <div className="prod-detail-header">
                <div className="prod-detail-tier-row">
                  <span className={`prod-tier-dot ${pkg.tierColor}`} />
                  <span className="prod-package-tier">{pkg.tier}</span>
                </div>
                <span className="prod-detail-price">{formatCurrency(total)}</span>
              </div>

              <div className="prod-detail-body">
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Package</span>
                  <span className="prod-detail-value">{pkg.name}</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Quantity</span>
                  <span className="prod-detail-value">{pkg.quantity} codes</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Unit price</span>
                  <span className="prod-detail-value">{formatCurrency(pkg.price)} / code</span>
                </div>
                <div className="prod-detail-row prod-detail-total">
                  <span className="prod-detail-label">Total</span>
                  <span className="prod-detail-value">{formatCurrency(total)}</span>
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
                  Continue to QR Payment
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