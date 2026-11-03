import { applyActionCode, checkActionCode, getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import "./VerifyEmailPage.css";

const verificationMessages = {
  loading: "Confirming your email address...",
  success: "Your email has been verified.",
  missing: "This verification link is incomplete.",
  expired: "This verification link has expired or was already used.",
  error: "We could not verify this email address.",
};

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const actionCode = searchParams.get("oobCode");
    if (!actionCode) {
      setStatus("missing");
      return undefined;
    }

    let isCurrent = true;
    const verifyEmail = async () => {
      try {
        const verificationAuth = getAuth();
        await checkActionCode(verificationAuth, actionCode);
        await applyActionCode(verificationAuth, actionCode);
        if (isCurrent) setStatus("success");
      } catch (error) {
        console.error("Email verification failed:", error);
        if (isCurrent) {
          setStatus(error?.code === "auth/invalid-action-code" ? "expired" : "error");
        }
      }
    };

    void verifyEmail();
    return () => {
      isCurrent = false;
    };
  }, [searchParams]);

  const isSuccess = status === "success";

  if (status === "loading") {
    return <LoadingScreen label="Confirming your email address..." />;
  }

  return (
    <main className="verify-email-page">
      <section className="verify-email-panel" aria-live="polite">
        <div className={`verify-email-icon${isSuccess ? " is-success" : ""}`}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {isSuccess ? "check" : status === "loading" ? "mail" : "priority_high"}
          </span>
        </div>
        <p className="verify-email-eyebrow">Gemstone Code</p>
        <h1>{isSuccess ? "Email verified" : "Verify your email"}</h1>
        <p className="verify-email-message">{verificationMessages[status]}</p>
        {isSuccess && (
          <Link className="verify-email-button" to="/login">
            Continue to login
          </Link>
        )}
        {!isSuccess && status !== "loading" && (
          <Link className="verify-email-link" to="/login">
            Return to login
          </Link>
        )}
      </section>
    </main>
  );
}
