import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./BottomNav.css";

const memberNavItems = [
  { key: "dashboard", icon: "dashboard", label: "Dashboard", to: "/dashboard" },
  { key: "products", icon: "inventory_2", label: "Products", to: "/products" },
  { key: "codes", icon: "qr_code_2", label: "Codes", to: "/purchase-codes" },
  { key: "profile", icon: "person", label: "Profile", to: "/profile" },
];

const adminNavItems = [
  {
    key: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
    to: "/admin/dashboard",
  },
  { key: "users", icon: "group", label: "User", to: "/admin/users" },
  { key: "profile", icon: "person", label: "Profile", to: "/admin/profile" },
  {
    key: "settings",
    icon: "settings",
    label: "Settings",
    to: "/admin/settings",
  },
];

// How much shorter the visual viewport has to be than the layout viewport
// before we treat it as "the keyboard is open". Mobile browsers also shrink
// the visual viewport by a smaller amount when the URL bar hides/shows on
// scroll, so this needs to be comfortably above that (usually well under
// 100px) and comfortably below a real keyboard (usually 250px+).
const KEYBOARD_HEIGHT_THRESHOLD = 150;

function isEditableElement(element) {
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || element.isContentEditable;
}

export default function BottomNav({ activeItem, variant = "member" }) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const navItems = variant === "admin" ? adminNavItems : memberNavItems;
  // The last known layout-viewport height while nothing was focused. Some
  // mobile browsers resize window.innerHeight along with the keyboard
  // itself, so comparing against a *live* window.innerHeight can make the
  // diff never clear the threshold (the keyboard shrinks both numbers
  // together). Comparing against a frozen pre-keyboard baseline instead
  // keeps the diff meaningful regardless of whether the browser resizes
  // the layout viewport or not.
  const baselineHeightRef = useRef(
    typeof window !== "undefined" ? window.innerHeight : 0,
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    // The keyboard opening/closing fires a burst of resize/scroll events in
    // quick succession, each with a slightly different height, and each one
    // used to trigger its own setState — that rapid on/off/on was the
    // flicker. Coalescing everything into a single check per animation
    // frame means we only ever update state once things have settled.
    let frame = null;
    // Guards the "did a keyboard actually show up" re-check that runs
    // after focusing a field — see handleFocusIn below.
    let fallbackTimer = null;

    const measureKeyboardState = () => {
      const editableFocused = isEditableElement(document.activeElement);

      // Only refresh the baseline while nothing is focused — that's the
      // one moment we can be sure the keyboard is closed, so it's safe
      // to treat the current height as "no keyboard" going forward.
      // This also keeps the baseline correct across browser-chrome
      // changes (URL bar show/hide) and orientation changes, since
      // those happen while nothing is focused.
      if (!editableFocused) {
        baselineHeightRef.current = window.innerHeight;
      }

      const heightDiff = baselineHeightRef.current - viewport.height;
      // Require an actual text field to be focused too, so a browser
      // chrome change (URL bar show/hide) can't be mistaken for a
      // keyboard just because the viewport height moved.
      return (
        heightDiff > KEYBOARD_HEIGHT_THRESHOLD &&
        viewport.offsetTop >= 0 &&
        editableFocused
      );
    };

    const updateKeyboardState = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const keyboardVisible = measureKeyboardState();
        setIsKeyboardOpen((prevState) =>
          prevState === keyboardVisible ? prevState : keyboardVisible,
        );
      });
    };

    const handleFocusIn = (event) => {
      if (!isEditableElement(event.target)) return;

      // Hide the bar the instant a field is focused, rather than waiting
      // for visualViewport to report a resize. Those resize events only
      // start arriving once the keyboard animation is already underway
      // (sometimes not until it finishes), and since the bar is
      // `position: fixed; bottom: 0`, it would otherwise ride up in real
      // time with the shrinking viewport during the animation and only
      // snap into "hidden" at the very end. Hiding on focus means the
      // slide-away happens before the keyboard shows at all.
      setIsKeyboardOpen(true);

      // Not every focus opens an on-screen keyboard (external/Bluetooth
      // keyboards, some tablet setups). Re-measure once a real keyboard
      // animation would have finished, and undo the hide if the viewport
      // never actually shrank.
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(() => {
        fallbackTimer = null;
        const keyboardVisible = measureKeyboardState();
        setIsKeyboardOpen((prevState) =>
          prevState === keyboardVisible ? prevState : keyboardVisible,
        );
      }, 400);
    };

    const handleFocusOut = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      updateKeyboardState();
    };

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState, { passive: true });
    viewport.addEventListener("scroll", updateKeyboardState, { passive: true });
    document.addEventListener("focusin", handleFocusIn, true);
    // Catches the moment a field loses focus, so the nav can reappear
    // promptly instead of waiting on the next viewport event.
    document.addEventListener("focusout", handleFocusOut, true);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
    };
  }, []);

  return (
    <nav
      className={`bn-bar${isKeyboardOpen ? " is-hidden" : ""}`}
      aria-label="Main navigation"
      aria-hidden={isKeyboardOpen}
    >
      {navItems.map((item) => {
        const isActive = item.key === activeItem;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={`bn-item${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            tabIndex={isKeyboardOpen ? -1 : undefined}
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
