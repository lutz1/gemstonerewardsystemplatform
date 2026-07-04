import { Link } from "react-router-dom";
import "./BottomNav.css";

const navItems = [
  { key: "dashboard", icon: "dashboard",    label: "Dashboard",  to: "/dashboard" },
  { key: "products", icon: "inventory_2",  label: "Products",  to: "/products" },
  { key: "codes",     icon: "qr_code_2",    label: "Codes",      to: "/purchase-codes" },
  { key: "profile",   icon: "person",       label: "Profile",    to: "/profile" },
];

export default function BottomNav({ activeItem }) {
  return (
    <nav className="bn-bar" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = item.key === activeItem;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`bn-item${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className="material-symbols-outlined bn-icon"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="bn-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}