import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import bgImage from "../../assets/login_bg.png";
import bgImageLandscape from "../../assets/login_bg_landscape.jpeg";
import { app } from "../../firebase";
import { PrivacyContent } from "../Privacy/PrivacyPage";
import { TermsContent } from "../Terms/TermsPage";
import "./LoginPage.css";

const BG_IMAGE = bgImage;
const BG_IMAGE_LANDSCAPE = bgImageLandscape;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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

  useEffect(() => {
    if (!showTerms && !showPrivacy) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setShowTerms(false);
      setShowPrivacy(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showPrivacy, showTerms]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!loginIdentifier || !password) {
      setError("Credentials incomplete. Please fill in all fields.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions to continue.");
      return;
    }
    setLoading(true);
    try {
      let email = loginIdentifier.trim();
      if (!email.includes("@")) {
        const resolveUsername = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "resolveUsername",
        );
        const result = await resolveUsername({ username: email });
        email = result.data?.email || "";
      }
      if (!email) {
        throw new Error("Invalid username or password.");
      }
      await login(email, password);
      const recordTermsAcceptance = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "recordTermsAcceptance",
      );
      try {
        await recordTermsAcceptance({ termsVersion: "2026-09-20" });
      } catch (acceptanceError) {
        await logout();
        throw acceptanceError;
      }
      navigate("/pin-verification");
    } catch (err) {
      const errorCode = err?.code || "";
      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/user-not-found"
      ) {
        setError("Invalid username/email or password.");
      } else {
        setError(err?.message || "Authentication failed. Please try again.");
      }
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
          <h1 className="lp-title">Gemstone</h1>
          <p className="lp-subtitle">Advertisement Marketing</p>
        </header>

        <div className="lp-card">
          <div className="lp-card-heading">
            <h2>Login to Your Account</h2>
            <p>Enter your credentials to continue.</p>
          </div>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="lp-error">{error}</p>}

            <div className="lp-field">
              <label className="lp-field-label" htmlFor="login-identifier">
                Email or Username
              </label>
              <div className="lp-input-wrap">
                <span
                  className="lp-input-icon material-symbols-outlined"
                  aria-hidden="true"
                >
                  mail
                </span>
                <input
                  id="login-identifier"
                  type="text"
                  className="lp-input"
                  placeholder="e.g. name@company.com or USERNAME"
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
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

            <div className="lp-terms-consent">
              <input
                id="terms-consent"
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <label htmlFor="terms-consent">
                I agree to the{" "}
              </label>
              <button
                className="lp-inline-terms"
                type="button"
                onClick={() => setShowTerms(true)}
              >
                Terms &amp; Conditions
              </button>
            </div>

            <button
              type="submit"
              className="lp-submit-btn"
              disabled={loading || !termsAccepted}
            >
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

        </div>

        <footer className="lp-footer-links">
          <button
            className="lp-legal-button"
            type="button"
            onClick={() => setShowPrivacy(true)}
          >
            Privacy
          </button>
          <span className="lp-footer-sep" aria-hidden="true">
            ·
          </span>
          <button
            className="lp-legal-button"
            type="button"
            onClick={() => setShowTerms(true)}
          >
            Terms
          </button>
          <span className="lp-footer-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/help">Help</Link>
        </footer>
      </main>

      {showTerms && (
        <div
          className="lp-terms-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowTerms(false);
          }}
        >
          <section
            className="lp-terms-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-terms-title"
          >
            <div className="lp-terms-modal-header">
              <div>
                <p className="lp-terms-modal-eyebrow">Gemstone Advertisement Marketing</p>
                <h2 id="lp-terms-title">Terms and Conditions</h2>
              </div>
              <button
                className="lp-terms-close"
                type="button"
                aria-label="Close terms and conditions"
                onClick={() => setShowTerms(false)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <div className="lp-terms-modal-content">
              <TermsContent />
            </div>
          </section>
        </div>
      )}

      {showPrivacy && (
        <div
          className="lp-privacy-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowPrivacy(false);
          }}
        >
          <section
            className="lp-privacy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-privacy-title"
          >
            <div className="lp-privacy-modal-header">
              <div>
                <p className="lp-privacy-modal-eyebrow">Gemstone Advertisement Marketing</p>
                <h2 id="lp-privacy-title">Privacy Policy</h2>
              </div>
              <button
                className="lp-privacy-close"
                type="button"
                aria-label="Close privacy policy"
                onClick={() => setShowPrivacy(false)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <div className="lp-privacy-modal-content">
              <PrivacyContent />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
