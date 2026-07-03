import { Link } from "react-router-dom";
import "./MenuDrawer.css";

const navItems = [
  { key: "dashboard", icon: "dashboard",    label: "Dashboard",      to: "/dashboard" },
  { key: "referrals", icon: "group",        label: "Direct Referral",to: "/direct-referrals" },
  { key: "codes",     icon: "qr_code_2",    label: "Purchase Codes", to: "/purchase-codes" },
  { key: "history",   icon: "receipt_long", label: "Transactions",   to: "/transactions" },
];

export default function MenuDrawer({ isOpen, onClose, activeItem }) {
  return (
    <>
      <div
        className={`md-overlay${isOpen ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`md-drawer${isOpen ? " open" : ""}`}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="md-header">
          <span className="md-logo">Gemstone Code</span>
          <button className="md-close-btn" onClick={onClose} aria-label="Close menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="md-nav">
          {navItems.map((item) => {
            const isActive = item.key === activeItem;
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`md-nav-item${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
              >
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="md-footer">
          <nav className="md-footer-links">
            <Link to="/privacy" className="md-footer-link" onClick={onClose}>
              <span className="material-symbols-outlined">privacy_tip</span>
              Privacy
            </Link>
            <Link to="/terms" className="md-footer-link" onClick={onClose}>
              <span className="material-symbols-outlined">gavel</span>
              Terms
            </Link>
            <Link to="/help" className="md-footer-link" onClick={onClose}>
              <span className="material-symbols-outlined">help_outline</span>
              Help
            </Link>
          </nav>
          <p className="md-footer-copy">© 2024 Gemstone Code. All rights reserved.</p>
        </div>
      </aside>
    </>
  );
}