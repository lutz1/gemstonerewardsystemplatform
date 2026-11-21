import logo from "../../../../assets/app_logo_final.png";
import "./SellerTopbar.css";

export default function SellerTopbar({ storeName, sellerName, initials, onProfileClick }) {
  return (
    <header className="seller-topbar">
      <div className="seller-topbar-inner">
        <div className="seller-topbar-brand">
          <img src={logo} alt="" />
          <div>
            <span className="seller-topbar-brand-label">Seller Center</span>
            <strong>{storeName}</strong>
          </div>
        </div>

        <div className="seller-topbar-actions">
          <button type="button" className="seller-topbar-action" aria-label="Notifications">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          </button>
          <button type="button" className="seller-topbar-profile" onClick={onProfileClick}>
            <span className="seller-topbar-avatar">{initials}</span>
            <span className="seller-topbar-profile-copy">
              <strong>{sellerName}</strong>
              <small>Premium seller</small>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
