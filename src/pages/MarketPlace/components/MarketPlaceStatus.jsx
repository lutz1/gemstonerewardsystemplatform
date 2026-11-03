import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../../firebase";
import "./MarketPlaceStatus.css";

function formatStatus(status) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatSubmittedDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MarketPlaceStatus({
  onBack,
  onStartApplication,
  initialApplication = null,
}) {
  const [application, setApplication] = useState(initialApplication);
  const [isLoading, setIsLoading] = useState(!initialApplication);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (initialApplication) {
      setApplication(initialApplication);
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    const getSellerApplicationStatus = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getSellerApplicationStatus",
    );

    getSellerApplicationStatus()
      .then(({ data }) => {
        if (!isMounted) return;
        setApplication(data?.application || null);
      })
      .catch((error) => {
        if (!isMounted) return;
        globalThis.console.error("Could not load seller application status.", error);
        setErrorMessage(
          error.message || "Unable to load your seller application. Please try again.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialApplication, retryCount]);

  const hasSubmittedApplication = Boolean(application);
  const reapplicationAvailableAt = application?.status === "rejected"
    && application.rejectedAt
    ? Date.parse(application.rejectedAt) + (24 * 60 * 60 * 1000)
    : null;
  const canReapply = Number.isFinite(reapplicationAvailableAt)
    && now >= reapplicationAvailableAt;

  useEffect(() => {
    if (!Number.isFinite(reapplicationAvailableAt) || now >= reapplicationAvailableAt) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setNow(Date.now()),
      reapplicationAvailableAt - now,
    );
    return () => window.clearTimeout(timer);
  }, [now, reapplicationAvailableAt]);

  const identityDocuments = application?.identity
    ? [
        ["Front of ID", application.identity.idFrontSubmitted],
        ["Back of ID", application.identity.idBackSubmitted],
        ["Selfie with ID", application.identity.selfieSubmitted],
      ]
    : [];

  return (
    <div className="marketplace-status-root">
      <header className="marketplace-status-header">
        <button
          type="button"
          aria-label="Back to seller information"
          onClick={onBack}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <h1>Seller Application</h1>
        <span />
      </header>

      <main className="marketplace-status-content">
        {isLoading ? (
          <section className="marketplace-status-message" role="status">
            <span className="marketplace-status-spinner" aria-hidden="true" />
            <h2>Loading your application</h2>
            <p>Please wait while we retrieve your latest submission.</p>
          </section>
        ) : errorMessage ? (
          <section className="marketplace-status-message" role="alert">
            <span className="material-symbols-outlined marketplace-status-message-icon" aria-hidden="true">
              error
            </span>
            <h2>Unable to load application</h2>
            <p>{errorMessage}</p>
            <button
              className="marketplace-status-primary"
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
          </section>
        ) : hasSubmittedApplication ? (
          <>
            <section className="marketplace-status-summary">
              <span className="material-symbols-outlined" aria-hidden="true">
                fact_check
              </span>
              <p className="marketplace-status-eyebrow">APPLICATION STATUS</p>
              <h2>{application.store.name || "Seller application"}</h2>
              <span
                className={`marketplace-status-badge marketplace-status-${application.status}`}
              >
                {formatStatus(application.status)}
              </span>
              <p className="marketplace-status-submitted">
                Submitted {formatSubmittedDate(application.submittedAt)}
              </p>
              <p className="marketplace-status-reference">
                Reference: {application.applicationId}
              </p>
            </section>

            {application.status === "rejected" && (
              <section className="marketplace-status-reapplication" aria-live="polite">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {canReapply ? "event_available" : "schedule"}
                </span>
                <div>
                  <h3>Reapply to become a seller</h3>
                  {application.rejectionReason && (
                    <p className="marketplace-status-rejection-reason">
                      <strong>Reason:</strong> {application.rejectionReason}
                    </p>
                  )}
                  {Number.isFinite(reapplicationAvailableAt) ? (
                    canReapply ? (
                      <p>You may now submit a new seller application.</p>
                    ) : (
                      <p>
                        You may submit a new application starting{" "}
                        <strong>
                          {new Date(reapplicationAvailableAt).toLocaleString("en-PH", {
                            dateStyle: "long",
                            timeStyle: "short",
                            timeZone: "Asia/Manila",
                          })} Philippine time
                        </strong>
                        .
                      </p>
                    )
                  ) : (
                    <p>
                      We couldn’t determine when you may reapply. Please contact support
                      for assistance.
                    </p>
                  )}
                  {Number.isFinite(reapplicationAvailableAt) && (
                    <button
                      className="marketplace-status-primary"
                      type="button"
                      disabled={!canReapply}
                      onClick={onStartApplication}
                    >
                      Submit a new application
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="marketplace-status-card">
              <h3>Seller information</h3>
              <dl>
                <div><dt>Name</dt><dd>{application.seller.name || "Not provided"}</dd></div>
                <div><dt>Email</dt><dd>{application.seller.email || "Not provided"}</dd></div>
                <div><dt>Mobile number</dt><dd>{application.seller.mobileNumber || "Not provided"}</dd></div>
                <div><dt>Address</dt><dd>{application.seller.address || "Not provided"}</dd></div>
              </dl>
            </section>

            <section className="marketplace-status-card">
              <h3>Store information</h3>
              <dl>
                <div><dt>Store name</dt><dd>{application.store.name || "Not provided"}</dd></div>
                <div><dt>Seller type</dt><dd>{formatStatus(application.store.sellerType || "Not provided")}</dd></div>
                <div><dt>Category</dt><dd>{formatStatus(application.store.productCategory || "Not provided")}</dd></div>
                <div><dt>Business type</dt><dd>{formatStatus(application.businessType || "Not provided")}</dd></div>
                <div><dt>Description</dt><dd>{application.store.description || "Not provided"}</dd></div>
              </dl>
            </section>

            <section className="marketplace-status-card">
              <h3>Identity verification</h3>
              <dl>
                <div><dt>Government ID</dt><dd>{formatStatus(application.identity.idType || "Not provided")}</dd></div>
                {identityDocuments.map(([label, submitted]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{submitted ? "Submitted" : "Not provided"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        ) : (
          <section className="marketplace-status-message">
            <span className="material-symbols-outlined marketplace-status-message-icon" aria-hidden="true">
              storefront
            </span>
            <h2>No application submitted yet</h2>
            <p>Start your seller application when you are ready.</p>
            <button
              className="marketplace-status-primary"
              type="button"
              onClick={onStartApplication}
            >
              Start application
            </button>
          </section>
        )}

        <button
          className="marketplace-status-back-link"
          type="button"
          onClick={onBack}
        >
          Back to seller information
        </button>
      </main>
    </div>
  );
}
