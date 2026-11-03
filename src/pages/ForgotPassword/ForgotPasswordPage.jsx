import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../../firebase";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSending(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setIsSent(true);
    } catch (resetError) {
      if (resetError?.code === "auth/invalid-email") {
        setError("Enter a valid email address and try again.");
      } else if (resetError?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a while and try again.");
      } else if (resetError?.code === "auth/network-request-failed") {
        setError("Check your internet connection and try again.");
      } else {
        setError("Unable to send the reset email. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="forgot-password">
      <div className="forgot-password__background" aria-hidden="true" />
      <section className="forgot-password__card" aria-labelledby="forgot-password-title">
        <Link className="forgot-password__back" to="/login">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Back to login
        </Link>

        <div className="forgot-password__icon" aria-hidden="true">
          <span className="material-symbols-outlined">lock_reset</span>
        </div>
        <p className="forgot-password__eyebrow">Account recovery</p>
        <h1 id="forgot-password-title">Forgot your password?</h1>

        {isSent ? (
          <div className="forgot-password__status" role="status">
            <p>If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a password reset link.</p>
            <p>Check your inbox and follow the instructions to reset your password.</p>
            <Link className="forgot-password__submit" to="/login">Return to login</Link>
          </div>
        ) : (
          <>
            <p className="forgot-password__description">
              Enter the email address associated with your account and we&apos;ll send you a reset link.
            </p>
            <form className="forgot-password__form" onSubmit={handleSubmit}>
              <label htmlFor="forgot-password-email">Email address</label>
              <div className="forgot-password__input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                <input
                  id="forgot-password-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isSending}
                />
              </div>
              {error && <p className="forgot-password__error" role="alert">{error}</p>}
              <button
                className="forgot-password__submit"
                type="submit"
                disabled={isSending || !email.trim()}
              >
                {isSending ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
