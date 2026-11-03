import appLogo from "../../assets/app_logo.png";
import "./LoadingScreen.css";

/**
 * Shared full-screen loading state. Drop this in wherever a page is
 * waiting on an async fetch (Firebase, an API call, etc.) — don't build a
 * one-off spinner per page; import this instead so every page's loading
 * state looks and feels the same.
 *
 * Props:
 * - label: text shown under the spinner (default "Loading...")
 */
export default function LoadingScreen({ label = "Loading..." }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true">
          <img src={appLogo} alt="" />
        </div>
        <p className="loading-label">{label}</p>
      </div>
    </div>
  );
}
