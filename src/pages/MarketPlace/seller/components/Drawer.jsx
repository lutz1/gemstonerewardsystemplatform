import { useEffect } from "react";
import Icon from "./Icon";

// Reusable slide-over (default) or centered dialog (variant="dialog").
export default function Drawer({ open, title, subtitle, onClose, footer, variant = "drawer", children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`sl-overlay ${variant === "dialog" ? "is-dialog" : ""}`} onMouseDown={onClose}>
      <aside
        className={`sl-drawer ${variant === "dialog" ? "is-dialog" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="sl-drawer__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="sl-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="sl-drawer__body">{children}</div>
        {footer && <footer className="sl-drawer__foot">{footer}</footer>}
      </aside>
    </div>
  );
}