import { useEffect, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link, useLocation, useParams } from "react-router-dom";
import LoadingScreen from "../../../../components/LoadingScreen/LoadingScreen";
import { app } from "../../../../firebase";
import "./SellerApplicationDetailsPage.css";

function formatStatus(status) {
  if (!status) return "Not provided";
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DetailRow({ label, value }) {
  return (
    <div className="seller-application-details-row">
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

const detailTabs = [
  { id: "overview", label: "Store Overview", icon: "storefront" },
  { id: "documents", label: "Documents", icon: "folder_open" },
  { id: "compliance", label: "Compliance", icon: "verified_user" },
];

export default function SellerApplicationDetailsPage() {
  const { userId, applicationId } = useParams();
  const location = useLocation();
  const stateApplication = location.state?.application;
  const [application, setApplication] = useState(stateApplication || null);
  const [isLoading, setIsLoading] = useState(!stateApplication);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(null);
  const [hasConfirmedDocumentReview, setHasConfirmedDocumentReview] = useState(false);
  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [isRejectionReasonOpen, setIsRejectionReasonOpen] = useState(false);
  const [isRejectConfirmationOpen, setIsRejectConfirmationOpen] = useState(false);
  const [rejectionReasonError, setRejectionReasonError] = useState("");
  const [requestInfoError, setRequestInfoError] = useState("");
  const [requestInfoMessage, setRequestInfoMessage] = useState("");
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [reviewFields, setReviewFields] = useState(() => ({
    verificationStatus: stateApplication?.adminReview?.verificationStatus || "pending",
    reviewNotes: stateApplication?.adminReview?.reviewNotes || "",
    rejectionReason: stateApplication?.adminReview?.rejectionReason || "",
    sellerRatingStatus: stateApplication?.adminReview?.sellerRatingStatus || "not_rated",
    riskLevel: stateApplication?.adminReview?.riskLevel || "low",
  }));

  useEffect(() => {
    if (stateApplication) {
      setApplication(stateApplication);
      setIsLoading(false);
      setErrorMessage("");
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    const getAdminSellerApplications = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getAdminSellerApplications",
    );

    getAdminSellerApplications()
      .then(({ data }) => {
        if (!isMounted) return;
        const foundApplication = Array.isArray(data?.applications)
          ? data.applications.find((item) =>
              item.userId === userId && item.applicationId === applicationId)
          : null;
        if (foundApplication) {
          setApplication(foundApplication);
        } else {
          setErrorMessage("This seller application could not be found.");
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        globalThis.console.error("Could not load seller application details.", error);
        setErrorMessage(
          error.message || "Unable to load seller application details.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applicationId, retryCount, stateApplication, userId]);

  useEffect(() => {
    if (!application) return;
    setReviewFields({
      verificationStatus: application.adminReview?.verificationStatus || "pending",
      reviewNotes: application.adminReview?.reviewNotes || "",
      rejectionReason: application.adminReview?.rejectionReason || "",
      sellerRatingStatus: application.adminReview?.sellerRatingStatus || "not_rated",
      riskLevel: application.adminReview?.riskLevel || "low",
    });
  }, [application]);

  const documents = useMemo(() => {
    if (!application) return [];
    const identity = application.identity || {};
    const submittedDocuments = [
      {
        id: "id-front",
        label: "Government ID — front",
        submitted: Boolean(identity.idFrontSubmitted),
        requested: true,
      },
      {
        id: "id-back",
        label: "Government ID — back",
        submitted: Boolean(identity.idBackSubmitted),
        requested: true,
      },
      {
        id: "selfie",
        label: "Selfie with ID",
        submitted: Boolean(identity.selfieSubmitted),
        requested: false,
      },
    ];
    if (application.businessType === "registered") {
      submittedDocuments.push({
        id: "business-certificate",
        label: "Business certificate",
        submitted: Boolean(application.business?.certificateSubmitted),
        requested: true,
      });
    }
    return submittedDocuments;
  }, [application]);
  const missingRequiredDocuments = documents.filter(
    (document) => document.requested && !document.submitted,
  );

  async function updateApplication(status, review = reviewFields, requestInfo = null) {
    if (!application || isSaving) return false;
    const applicationUserId = application.userId || userId;
    const applicationDocumentId = application.applicationId || applicationId;
    const applicationDocumentPath = application.applicationPath
      || (applicationUserId && applicationDocumentId
        ? `sellerApplications/${applicationUserId}/applications/${applicationDocumentId}`
        : "");
    if (!applicationUserId || !applicationDocumentId || !applicationDocumentPath) {
      setActionMessage("Application details are incomplete. Return to the application list, refresh it, and reopen this application.");
      setActionError(true);
      return false;
    }

    setIsSaving(true);
    setActionMessage("");
    setActionError(false);
    try {
      const updateAdminSellerApplication = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "updateAdminSellerApplication",
      );
      const { data } = await updateAdminSellerApplication({
        userId: applicationUserId,
        applicationId: applicationDocumentId,
        applicationPath: applicationDocumentPath,
        status,
        adminReview: review,
        ...(requestInfo ? { requestInfo } : {}),
      });
      setApplication((current) => ({
        ...current,
        status: data.status,
        adminReview: { ...current.adminReview, ...data.adminReview },
      }));
      setActionMessage(data.sellerId
        ? `Application approved. Seller ID: ${data.sellerId}.`
        : data.messageSent
          ? (data.status === "rejected"
            ? "Application rejected and message sent to the seller."
            : "In-app message sent to the seller.")
          : `Application updated to ${formatStatus(data.status)}.`);
      return true;
    } catch (error) {
      globalThis.console.error("Could not update seller application.", error);
      const message = error.message || "Unable to update this application.";
      setActionMessage(message);
      if (requestInfo) setRequestInfoError(message);
      setActionError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function openRequestInfo() {
    setRequestInfoError("");
    setRequestInfoMessage("");
    setSelectedRequirements(
      documents.filter((document) => document.requested && !document.submitted)
        .map((document) => document.id),
    );
    setIsRequestInfoOpen(true);
  }

  async function sendRequestInfo(event) {
    event.preventDefault();
    if (selectedRequirements.length === 0) {
      setRequestInfoError("Select at least one missing requirement to request.");
      return;
    }

    const wasQueued = await updateApplication(
      "needs_additional_documents",
      { ...reviewFields, verificationStatus: "additional_documents_required" },
      { requestedItems: selectedRequirements, message: requestInfoMessage.trim() },
    );
    if (!wasQueued) {
      return;
    }
    setIsRequestInfoOpen(false);
    setRequestInfoMessage("");
  }

  function openRejectionReason() {
    setRejectionReasonError("");
    setReviewFields((current) => ({
      ...current,
      rejectionReason: current.rejectionReason || "",
    }));
    setIsRejectionReasonOpen(true);
  }

  function continueToRejectConfirmation(event) {
    event.preventDefault();
    const rejectionReason = reviewFields.rejectionReason.trim();
    if (!rejectionReason) {
      setRejectionReasonError("Enter a reason before continuing.");
      return;
    }

    setRejectionReasonError("");
    setIsRejectionReasonOpen(false);
    setIsRejectConfirmationOpen(true);
  }

  async function confirmRejection() {
    const wasRejected = await updateApplication("rejected", {
      ...reviewFields,
      rejectionReason: reviewFields.rejectionReason.trim(),
    });
    if (wasRejected) {
      setIsRejectConfirmationOpen(false);
      setIsRejectionReasonOpen(false);
    }
  }

  async function confirmApproval() {
    if (!hasConfirmedDocumentReview || missingRequiredDocuments.length > 0) return;
    const wasApproved = await updateApplication("approved", {
      ...reviewFields,
      verificationStatus: "verified",
    });
    if (wasApproved) {
      setApprovalDialog("success");
    }
  }

  if (isLoading) return <LoadingScreen label="Loading application details..." />;

  const business = application?.business || {};
  const activeTabDetails = detailTabs.find((tab) => tab.id === activeTab);

  return (
    <div className="seller-application-details-root">
      <header className="seller-application-details-header">
        <Link
          to="/admin/seller-applications/list"
          aria-label="Back to applications"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_left
          </span>
        </Link>
        <h1>Application Details</h1>
        <span aria-hidden="true" />
      </header>

      <main className="seller-application-details-content">
        {errorMessage ? (
          <section className="seller-application-details-state" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <h2>Unable to load application</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try again
            </button>
            <Link to="/admin/seller-applications/list">Back to applications</Link>
          </section>
        ) : application && (
          <>
            <section className="seller-application-details-summary">
              <div className="seller-application-details-store-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  storefront
                </span>
              </div>
              <div className="seller-application-details-summary-copy">
                <h2>
                  {application.store?.name || "Unnamed Store"}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    verified
                  </span>
                </h2>
                <p>{application.seller?.email || "Email unavailable"}</p>
                {application.seller?.mobileNumber && <small>{application.seller.mobileNumber}</small>}
              </div>
              <span className={`seller-application-details-status is-${application.status || "pending_review"}`}>
                {formatStatus(application.status || "pending_review")}
              </span>
            </section>

            <section className="seller-application-details-reference">
              <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
              <span>{formatDate(application.submittedAt)}</span>
              <strong>#{application.applicationId}</strong>
            </section>

            <nav className="seller-application-details-tabs" aria-label="Application sections">
              {detailTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "is-active" : ""}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === "documents" && ` (${documents.filter((document) => document.submitted).length})`}
                </button>
              ))}
            </nav>

            <div className="seller-application-details-section-heading">
              <span className="material-symbols-outlined" aria-hidden="true">
                {activeTabDetails.icon}
              </span>
              <h2>{activeTabDetails.label}</h2>
              {activeTab === "overview" && (
                <span className="seller-application-details-registration">
                  {business.registrationType
                    ? formatStatus(business.registrationType)
                    : "Individual"}
                </span>
              )}
            </div>

            {activeTab === "overview" && (
              <>
                <section className="seller-application-details-card">
                  <h2>Business Profile</h2>
                  <div className="seller-application-details-fields">
                    <div className="seller-application-details-field is-wide">
                      <span>Primary Category</span>
                      <strong>{application.store?.productCategory || "Not provided"}</strong>
                    </div>
                    <div className="seller-application-details-field">
                      <span>Business Name</span>
                      <strong>{business.name || application.store?.name || "Not provided"}</strong>
                    </div>
                    <div className="seller-application-details-field">
                      <span>Registration Number</span>
                      <strong>{business.registrationNumber || "Not provided"}</strong>
                    </div>
                    <div className="seller-application-details-field is-wide">
                      <span>Tax ID / EIN</span>
                      <strong>{business.taxIdentificationNumber || "Not provided"}</strong>
                    </div>
                    <div className="seller-application-details-field is-wide">
                      <span>Registered Operating Address</span>
                      <strong>{business.address || application.seller?.address || "Not provided"}</strong>
                    </div>
                    <div className="seller-application-details-field is-wide">
                      <span>Store Description</span>
                      <strong>{application.store?.description || "Not provided"}</strong>
                    </div>
                  </div>
                </section>

                <section className="seller-application-details-card">
                  <h2>Seller Information</h2>
                  <dl>
                    <DetailRow label="Name" value={application.seller?.name} />
                    <DetailRow label="Email" value={application.seller?.email} />
                    <DetailRow label="Mobile" value={application.seller?.mobileNumber} />
                    <DetailRow label="Date of birth" value={formatDate(application.seller?.dateOfBirth)} />
                    <DetailRow label="Gender" value={formatStatus(application.seller?.gender)} />
                    <DetailRow label="Address" value={application.seller?.address} />
                  </dl>
                </section>

              </>
            )}

            {activeTab === "documents" && (
              <section className="seller-application-details-card">
                <h2>Submitted Documents ({documents.filter((document) => document.submitted).length}/{documents.length})</h2>
                <div className="seller-application-details-document-list">
                  {documents.map((document) => (
                    <div key={document.label}>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {document.submitted ? "task_alt" : "description"}
                      </span>
                      <span>{document.label}</span>
                      <strong className={document.submitted ? "is-submitted" : ""}>
                        {document.submitted ? "Submitted" : "Missing"}
                      </strong>
                    </div>
                  ))}
                  {application.identity?.idType && (
                    <div>
                      <span className="material-symbols-outlined" aria-hidden="true">badge</span>
                      <span>Government ID type</span>
                      <strong>{formatStatus(application.identity.idType)}</strong>
                    </div>
                  )}
                  {application.identity?.idNumber && (
                    <div>
                      <span className="material-symbols-outlined" aria-hidden="true">tag</span>
                      <span>Government ID number</span>
                      <strong>{application.identity.idNumber}</strong>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "compliance" && (
              <>
                <section className="seller-application-details-card">
                  <h2>Compliance & Verification</h2>
                  <dl>
                    <DetailRow label="Business type" value={formatStatus(application.businessType)} />
                    <DetailRow label="Registration type" value={formatStatus(business.registrationType)} />
                    <DetailRow label="Tax ID / EIN" value={business.taxIdentificationNumber} />
                    <DetailRow label="Signature" value={application.signature?.fullName} />
                    <DetailRow label="Date signed" value={application.signature?.date} />
                  </dl>
                  <div className="seller-application-details-declarations">
                    <h3>Seller declarations</h3>
                    {[
                      ["Accurate application information", application.declarations?.accurate],
                      ["Product policy", application.declarations?.productPolicy],
                      ["Platform policies", application.declarations?.platformPolicies],
                      ["Enforcement policy", application.declarations?.enforcement],
                      ["Privacy consent", application.declarations?.privacyConsent],
                    ].map(([label, accepted]) => (
                      <p key={label}>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {accepted ? "check_circle" : "cancel"}
                        </span>
                        {label}
                      </p>
                    ))}
                  </div>
                </section>

              </>
            )}

            {actionMessage && (
              <p
                className={`seller-application-details-action-message${actionError ? " is-error" : ""}`}
                role={actionError ? "alert" : "status"}
              >
                {actionMessage}
              </p>
            )}

            <section className="seller-application-details-actions" aria-label="Application actions">
              {application.status === "pending_review" && (
                <button
                  className="is-secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => updateApplication("under_review")}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">rate_review</span>
                  Start Review
                </button>
              )}
              {["under_review", "needs_additional_documents"].includes(application.status) && (
                <button
                  className="is-primary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setActionMessage("");
                    setActionError(false);
                    setHasConfirmedDocumentReview(false);
                    setApprovalDialog("confirm");
                  }}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                  Approve Application
                </button>
              )}
              {["pending_review", "under_review", "needs_additional_documents"].includes(application.status) && (
                <div className="seller-application-details-action-row">
                  <button
                    className="is-info"
                    type="button"
                    disabled={isSaving}
                    onClick={openRequestInfo}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">info</span>
                    Request Info
                  </button>
                  {application.status !== "pending_review" && (
                    <button
                      className="is-danger"
                      type="button"
                      disabled={isSaving}
                      onClick={openRejectionReason}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">cancel</span>
                      Reject
                    </button>
                  )}
                </div>
              )}
              {application.status === "approved" && (
                <button
                  className="is-primary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => updateApplication("active_seller")}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
                  Activate Seller
                </button>
              )}
              {isSaving && (
                <span className="seller-application-details-saving" role="status">
                  Saving application update...
                </span>
              )}
            </section>
          </>
        )}
      </main>
      {approvalDialog && (
        <div
          className="seller-application-approve-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setApprovalDialog(null);
            }
          }}
        >
          <section
            className={`seller-application-approve-dialog${approvalDialog === "success"
              ? " is-success"
              : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-application-approve-title"
          >
            {approvalDialog === "success" ? (
              <>
                <svg
                  className="seller-application-approve-checkmark"
                  viewBox="0 0 64 64"
                  role="img"
                  aria-label="Success"
                >
                  <circle className="seller-application-approve-checkmark-circle" cx="32" cy="32" r="28" />
                  <path className="seller-application-approve-checkmark-tick" d="m18 33 9 9 19-20" />
                </svg>
                <p className="seller-application-approve-eyebrow">APPROVAL COMPLETE</p>
                <h2 id="seller-application-approve-title">Seller application approved</h2>
                <p className="seller-application-approve-description">
                  {application.store?.name || "This store"} is approved, and the seller
                  account is now active.
                </p>
                <button
                  className="seller-application-approve-confirm"
                  type="button"
                  onClick={() => setApprovalDialog(null)}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <span className="seller-application-approve-icon material-symbols-outlined" aria-hidden="true">
                  verified_user
                </span>
                <p className="seller-application-approve-eyebrow">CONFIRM APPROVAL</p>
                <h2 id="seller-application-approve-title">Approve this application?</h2>
                <p className="seller-application-approve-description">
                  Approving <strong>{application.store?.name || "this store"}</strong>{" "}
                  will activate the seller account.
                </p>
                {missingRequiredDocuments.length > 0 ? (
                  <div className="seller-application-approve-missing" role="alert">
                    <strong>Required documents are missing:</strong>
                    <ul>
                      {missingRequiredDocuments.map((document) => (
                        <li key={document.id}>{document.label}</li>
                      ))}
                    </ul>
                    <span>Request the missing documents before approving.</span>
                  </div>
                ) : (
                  <label className="seller-application-approve-review">
                    <input
                      type="checkbox"
                      checked={hasConfirmedDocumentReview}
                      onChange={(event) => {
                        setHasConfirmedDocumentReview(event.target.checked);
                      }}
                    />
                    <span>
                      I reviewed the Documents tab and verified the submitted documents.
                    </span>
                  </label>
                )}
                {actionError && actionMessage && (
                  <p className="seller-application-approve-error" role="alert">
                    {actionMessage}
                  </p>
                )}
                <div className="seller-application-approve-actions">
                  <button
                    className="is-cancel"
                    type="button"
                    disabled={isSaving}
                    onClick={() => setApprovalDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="is-confirm"
                    type="button"
                    disabled={
                      isSaving
                      || !hasConfirmedDocumentReview
                      || missingRequiredDocuments.length > 0
                    }
                    onClick={() => void confirmApproval()}
                  >
                    {isSaving ? "Approving..." : "Confirm Approval"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {isRequestInfoOpen && (
        <div
          className="seller-application-request-info-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setIsRequestInfoOpen(false);
            }
          }}
        >
          <form
            className="seller-application-request-info-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-application-request-info-title"
            onSubmit={sendRequestInfo}
          >
            <header>
              <div>
                <p>SELLER FOLLOW-UP</p>
                <h2 id="seller-application-request-info-title">Request missing information</h2>
              </div>
              <button
                type="button"
                aria-label="Close request information"
                disabled={isSaving}
                onClick={() => setIsRequestInfoOpen(false)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>
            <p className="seller-application-request-info-recipient">
              In-app message for <strong>{application.seller?.name || "the seller"}</strong>
            </p>
            <fieldset>
              <legend>Select missing requirements</legend>
              {documents.map((document) => (
                <label key={document.id}>
                  <input
                    type="checkbox"
                    checked={selectedRequirements.includes(document.id)}
                    onChange={(event) => {
                      setSelectedRequirements((selected) => (
                        event.target.checked
                          ? [...selected, document.id]
                          : selected.filter((item) => item !== document.id)
                      ));
                    }}
                  />
                  <span>{document.label}</span>
                  <small>{document.submitted ? "Submitted" : "Not submitted"}</small>
                </label>
              ))}
            </fieldset>
            <label className="seller-application-request-info-message">
              <span>Message to seller</span>
              <textarea
                rows="4"
                maxLength={1500}
                value={requestInfoMessage}
                onChange={(event) => setRequestInfoMessage(event.target.value)}
                placeholder="Add instructions or explain what the seller needs to provide."
              />
            </label>
            {requestInfoError && (
              <p className="seller-application-request-info-error" role="alert">
                {requestInfoError}
              </p>
            )}
            <p className="seller-application-request-info-note">
              This message will appear in the seller’s Marketplace Messages inbox.
            </p>
            <div className="seller-application-request-info-actions">
              <button
                className="is-cancel"
                type="button"
                disabled={isSaving}
                onClick={() => setIsRequestInfoOpen(false)}
              >
                Cancel
              </button>
              <button className="is-send" type="submit" disabled={isSaving}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {isSaving ? "progress_activity" : "mail"}
                </span>
                {isSaving ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      )}
      {isRejectionReasonOpen && (
        <div
          className="seller-application-reject-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setIsRejectionReasonOpen(false);
            }
          }}
        >
          <form
            className="seller-application-reject-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-application-rejection-title"
            onSubmit={continueToRejectConfirmation}
          >
            <header>
              <div>
                <p>APPLICATION DECISION</p>
                <h2 id="seller-application-rejection-title">Reason for rejection</h2>
              </div>
              <button
                type="button"
                aria-label="Close rejection reason"
                disabled={isSaving}
                onClick={() => setIsRejectionReasonOpen(false)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>
            <label className="seller-application-reject-reason">
              <span>Explain why this application is being rejected</span>
              <textarea
                maxLength={1000}
                rows="4"
                value={reviewFields.rejectionReason}
                onChange={(event) => {
                  setReviewFields((current) => ({
                    ...current,
                    rejectionReason: event.target.value,
                  }));
                  if (rejectionReasonError) setRejectionReasonError("");
                }}
                placeholder="Provide a clear reason for the seller."
                aria-invalid={Boolean(rejectionReasonError)}
                aria-describedby={rejectionReasonError
                  ? "seller-application-rejection-error"
                  : undefined}
              />
              {rejectionReasonError && (
                <small id="seller-application-rejection-error" role="alert">
                  {rejectionReasonError}
                </small>
              )}
            </label>
            <div className="seller-application-reject-actions">
              <button
                className="is-cancel"
                type="button"
                disabled={isSaving}
                onClick={() => setIsRejectionReasonOpen(false)}
              >
                Cancel
              </button>
              <button className="is-continue" type="submit" disabled={isSaving}>
                Continue
              </button>
            </div>
          </form>
        </div>
      )}
      {isRejectConfirmationOpen && (
        <div
          className="seller-application-reject-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setIsRejectConfirmationOpen(false);
            }
          }}
        >
          <section
            className="seller-application-reject-dialog seller-application-reject-confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-application-reject-confirmation-title"
          >
            <header>
              <div>
                <p>CONFIRM DECISION</p>
                <h2 id="seller-application-reject-confirmation-title">Reject this application?</h2>
              </div>
            </header>
            <p>
              This will reject <strong>{application.store?.name || "this seller application"}</strong>.
            </p>
            <div className="seller-application-reject-confirmation-reason">
              <strong>Reason</strong>
              <p>{reviewFields.rejectionReason.trim()}</p>
            </div>
            <div className="seller-application-reject-actions">
              <button
                className="is-cancel"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsRejectConfirmationOpen(false);
                  setIsRejectionReasonOpen(true);
                }}
              >
                Back
              </button>
              <button
                className="is-reject"
                type="button"
                disabled={isSaving}
                onClick={() => void confirmRejection()}
              >
                {isSaving ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
