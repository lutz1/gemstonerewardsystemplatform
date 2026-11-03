import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
import { app, auth } from "../../../firebase";
import "./SellerLogin.css";

function getLoginErrorMessage(error) {
  if (
    error?.code === "auth/invalid-credential"
    || error?.code === "auth/wrong-password"
    || error?.code === "auth/user-not-found"
  ) {
    return "Seller ID or password is incorrect.";
  }
  if (error?.code === "auth/too-many-requests") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (error?.code === "auth/network-request-failed") {
    return "Connection problem. Check your internet and try again.";
  }
  return error?.message || "Unable to verify your seller account. Please try again.";
}

export default function SellerLogin({ onSuccess }) {
  const [sellerId, setSellerId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const user = auth.currentUser;
    if (!user?.email) {
      setErrorMessage("Please sign in to your main account before continuing.");
      return;
    }

    const enteredSellerId = sellerId.trim().toUpperCase();
    if (!enteredSellerId || !password) {
      setErrorMessage("Enter your Seller ID and main account password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const getMpinStatus = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getMpinStatus",
      );
      const { data } = await getMpinStatus();
      const accountSellerId = typeof data?.sellerId === "string"
        ? data.sellerId.trim().toUpperCase()
        : "";

      if (data?.seller !== true || !accountSellerId || enteredSellerId !== accountSellerId) {
        setErrorMessage("Seller ID or password is incorrect.");
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      onSuccess();
    } catch (error) {
      globalThis.console.error("Could not verify Seller Center credentials.", error);
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="seller-login">
      <section className="seller-login-content" aria-labelledby="seller-login-title">
        <div className="seller-login-card">
          <div className="seller-login-icon-wrap">
            <span className="seller-login-icon material-symbols-outlined" aria-hidden="true">
              storefront
            </span>
          </div>

          <p className="seller-login-eyebrow">SECURE SELLER ACCESS</p>
          <h1 id="seller-login-title">Sign in to your shop</h1>
          <p className="seller-login-description">
            Enter your seller credentials to continue managing your shop and products.
          </p>

          <form className="seller-login-form" onSubmit={handleSubmit}>
            {errorMessage && (
              <p className="seller-login-error" role="alert">
                {errorMessage}
              </p>
            )}

            <label htmlFor="seller-login-id">Seller ID</label>
            <input
              id="seller-login-id"
              name="sellerId"
              type="text"
              autoComplete="username"
              placeholder="#SLR-0001"
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
              disabled={isSubmitting}
              required
            />

            <label htmlFor="seller-login-password">Password</label>
            <div className="seller-login-password-wrap">
              <input
                id="seller-login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                className="seller-login-password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={isSubmitting}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            <button
              className="seller-login-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Continue to Seller Center"}
              {!isSubmitting && (
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <p className="seller-login-security-note">
            <span className="material-symbols-outlined" aria-hidden="true">lock</span>
            <span>Your data is encrypted and protected with secure login</span>
          </p>

          <div className="seller-login-tip" role="note">
            <span className="material-symbols-outlined" aria-hidden="true">lightbulb</span>
            <span>
              Tip: Use your seller ID provided during onboarding. Need help? <a href="#support">Contact support.</a>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
