import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bgImage from "../../../assets/images/login_bg.png";
import bgImageLandscape from "../../../assets/images/login_bg_landscape.jpeg";
import { useAuth } from "../../../context/AuthContext";
import "./LoginPage.css";

const BG_IMAGE = bgImage;
const BG_IMAGE_LANDSCAPE = bgImageLandscape;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bgRef = useRef(null);

  // Lock background to initial viewport height — prevents iOS zoom on keyboard open
  useEffect(() => {
    const lockHeight = () => {
      if (bgRef.current) {
        // Capture initial height ONCE and never update it
        bgRef.current.style.height = window.innerHeight + "px";
      }
    };
    lockHeight();
    // Do NOT add resize listener — that would defeat the purpose
  }, []); // empty deps = runs once on mount only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Credentials incomplete. Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/pin-verification");
    } catch (err) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root">
      {/* Background — ref locks height to initial viewport, never updates on keyboard/scroll */}
      <div ref={bgRef} className="lp-bg" aria-hidden="true">
        <picture>
          <source media="(min-width: 768px)" srcSet={BG_IMAGE_LANDSCAPE} />
          <img src={BG_IMAGE} alt="" className="lp-bg-img" />
        </picture>
        <div className="lp-bg-gradient" />
        <div className="lp-bg-grid" />
      </div>

      <main className="lp-main">
        <header className="lp-header">
          <h1 className="lp-title">Gemstone Code</h1>
          <p className="lp-subtitle">Mining &amp; Exchange Platform</p>
        </header>

        <div className="lp-card">
          <div className="lp-card-heading">
            <h2>Secure Access</h2>
            <p>Enter your mining credentials to continue.</p>
          </div>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="lp-error">{error}</p>}

            <div className="lp-field">
              <label className="lp-field-label" htmlFor="email">
                Email
              </label>
              <div className="lp-input-wrap">
                <span
                  className="lp-input-icon material-symbols-outlined"
                  aria-hidden="true"
                >
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  className="lp-input"
                  placeholder="e.g. name@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="lp-field">
              <div className="lp-field-row">
                <label className="lp-field-label" htmlFor="password">
                  Password
                </label>
                <Link className="lp-forgot" to="/forgot-password">
                  Forgot Password?
                </Link>
              </div>
              <div className="lp-input-wrap">
                <span
                  className="lp-input-icon material-symbols-outlined"
                  aria-hidden="true"
                >
                  lock
                </span>
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className="lp-input has-right"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="lp-eye-btn"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                >
                  <span className="material-symbols-outlined">
                    {showPw ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button type="submit" className="lp-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="lp-spin material-symbols-outlined">
                    sync
                  </span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>LOGIN</span>
                  <span className="lp-btn-icon material-symbols-outlined">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="lp-card-footer">
            <p>
              New to the network?{" "}
              <Link to="/register">Apply for Membership</Link>
            </p>
          </div>
        </div>

        <footer className="lp-footer-links">
          <Link to="/privacy">Privacy</Link>
          <span className="lp-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/terms">Terms</Link>
          <span className="lp-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/help">Help</Link>
        </footer>
      </main>
    </div>
  );
}
