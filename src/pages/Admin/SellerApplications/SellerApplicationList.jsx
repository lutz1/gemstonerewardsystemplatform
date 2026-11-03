import { useEffect, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link } from "react-router-dom";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import { app } from "../../../firebase";
import "./SellerApplicationList.css";

const statusLabels = {
  pending_review: "Pending",
  under_review: "Under Review",
  needs_additional_documents: "Additional Info Needed",
  approved: "Approved",
  active_seller: "Approved",
  rejected: "Rejected",
};

const statusFilters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "additional_info_needed", label: "Additional Info Needed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function getApplicationGroup(status) {
  if (["pending_review", "under_review"].includes(status)) return "pending";
  if (status === "needs_additional_documents") return "additional_info_needed";
  if (["approved", "active_seller"].includes(status)) return "approved";
  if (status === "rejected") return "rejected";
  return "other";
}

function getStatusLabel(status) {
  if (statusLabels[status]) return statusLabels[status];
  if (typeof status !== "string" || !status.trim()) return "Unknown";
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatSubmittedAt(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStoreIcon(application) {
  const category = `${application.store?.productCategory || ""} ${application.store?.name || ""}`.toLowerCase();
  if (category.includes("fashion") || category.includes("cloth") || category.includes("beauty")) {
    return "shopping_bag";
  }
  if (category.includes("home") || category.includes("house")) return "home";
  if (category.includes("food") || category.includes("plant") || category.includes("garden")) {
    return "eco";
  }
  return "shopping_cart";
}

function ApplicationDetails({ application, onClose }) {
  const status = getStatusLabel(application.status);
  return (
    <div className="seller-application-list-modal-backdrop" onMouseDown={onClose}>
      <section
        className="seller-application-list-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-application-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="seller-application-list-modal-heading">
          <div>
            <p>SELLER APPLICATION</p>
            <h2 id="seller-application-details-title">
              {application.store?.name || "Application details"}
            </h2>
          </div>
          <button type="button" aria-label="Close application details" onClick={onClose}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <span className={`seller-application-list-status is-${getApplicationGroup(application.status)}`}>
          {status}
        </span>
        <dl className="seller-application-list-details">
          <div><dt>Seller</dt><dd>{application.seller?.name || "Not provided"}</dd></div>
          <div><dt>Email</dt><dd>{application.seller?.email || "Not provided"}</dd></div>
          <div><dt>Mobile</dt><dd>{application.seller?.mobileNumber || "Not provided"}</dd></div>
          <div><dt>Store</dt><dd>{application.store?.name || "Not provided"}</dd></div>
          <div><dt>Category</dt><dd>{application.store?.productCategory || "Not provided"}</dd></div>
          <div><dt>Submitted</dt><dd>{formatSubmittedAt(application.submittedAt)}</dd></div>
          {application.adminReview?.reviewNotes && (
            <div><dt>Review notes</dt><dd>{application.adminReview.reviewNotes}</dd></div>
          )}
          {application.status === "rejected" && (
            <div>
              <dt>Rejection reason</dt>
              <dd>{application.adminReview?.rejectionReason || "No reason provided"}</dd>
            </div>
          )}
        </dl>
        <button className="seller-application-list-close-button" type="button" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}

export default function SellerApplicationList() {
  const [applications, setApplications] = useState([]);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    const getAdminSellerApplications = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getAdminSellerApplications",
    );

    getAdminSellerApplications()
      .then(({ data }) => {
        if (isMounted) {
          setApplications(Array.isArray(data?.applications) ? data.applications : []);
          setPendingApplicationsCount(
            Number.isSafeInteger(data?.pendingCount) && data.pendingCount >= 0
              ? data.pendingCount
              : 0,
          );
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        globalThis.console.error("Could not load seller applications.", error);
        setErrorMessage(error.message || "Unable to load seller applications.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const counts = useMemo(() => applications.reduce((result, application) => {
    result.all += 1;
    result[getApplicationGroup(application.status)] += 1;
    return result;
  }, {
    all: 0,
    pending: 0,
    additional_info_needed: 0,
    approved: 0,
    rejected: 0,
    other: 0,
  }), [applications]);

  const visibleApplications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesFilter = activeFilter === "all"
        || getApplicationGroup(application.status) === activeFilter;
      const searchText = [
        application.store?.name,
        application.seller?.name,
        application.seller?.email,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesFilter && (!normalizedQuery || searchText.includes(normalizedQuery));
    });
  }, [activeFilter, applications, searchQuery]);

  if (isLoading) return <LoadingScreen label="Loading seller applications..." />;

  return (
    <div className="seller-application-list-root">
      <header className="seller-application-list-header">
        <Link to="/admin/seller-applications" aria-label="Back to seller application dashboard">
          <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        </Link>
        <h1>Applications</h1>
        <button
          type="button"
          aria-label={isSearchOpen ? "Close search" : "Search applications"}
          aria-expanded={isSearchOpen}
          onClick={() => {
            setIsSearchOpen((open) => !open);
            if (isSearchOpen) setSearchQuery("");
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {isSearchOpen ? "close" : "search"}
          </span>
        </button>
      </header>

      {isSearchOpen && (
        <div className="seller-application-list-search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            autoFocus
            placeholder="Search applications"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search applications"
          />
        </div>
      )}

      <main className="seller-application-list-content">
        <div className="seller-application-list-filters" role="tablist" aria-label="Filter applications">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.value}
              className={activeFilter === filter.value ? "is-active" : ""}
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label} ({counts[filter.value]})
            </button>
          ))}
        </div>

        {errorMessage ? (
          <section className="seller-application-list-state" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <h2>Unable to load applications</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try again
            </button>
          </section>
        ) : visibleApplications.length ? (
          <div className="seller-application-list-cards">
            {visibleApplications.map((application) => {
              const status = getApplicationGroup(application.status);
              const actionLabel = ["pending", "additional_info_needed"].includes(status)
                ? "Review"
                : status === "approved" ? "View Profile" : "View Reason";
              return (
                <article className="seller-application-list-card" key={`${application.userId}-${application.applicationId}`}>
                  <div className={`seller-application-list-store-icon is-${status}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {getStoreIcon(application)}
                    </span>
                  </div>
                  <div className="seller-application-list-card-content">
                    <div className="seller-application-list-card-heading">
                      <div>
                        <h2>{application.store?.name || "Unnamed Store"}</h2>
                        <p>{application.seller?.email || "Email unavailable"}</p>
                      </div>
                      <span className={`seller-application-list-status is-${status}`}>
                        {getStatusLabel(application.status)}
                      </span>
                    </div>
                    <p className="seller-application-list-date">
                      <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                      {formatSubmittedAt(application.submittedAt)}
                    </p>
                    <div className="seller-application-list-card-actions">
                      <Link
                        to={`/admin/seller-applications/${encodeURIComponent(application.userId)}/${encodeURIComponent(application.applicationId)}`}
                        state={{ application }}
                      >
                        View Details
                      </Link>
                      <button
                        className={status === "pending" ? "is-primary" : ""}
                        type="button"
                        onClick={() => setSelectedApplication(application)}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="seller-application-list-state">
            <span className="material-symbols-outlined" aria-hidden="true">content_paste_search</span>
            <h2>No applications found</h2>
            <p>Try a different status filter or search term.</p>
          </section>
        )}
      </main>

      <nav className="seller-application-list-bottom-nav" aria-label="Admin navigation">
        <Link to="/admin/seller-applications">
          <span className="material-symbols-outlined" aria-hidden="true">home</span>
          <small>Dashboard</small>
        </Link>
        <Link className="is-active" to="/admin/seller-applications/list" aria-current="page">
          <span className="material-symbols-outlined" aria-hidden="true">description</span>
          <small>Applications</small>
          {pendingApplicationsCount > 0 && (
            <span className="seller-application-list-nav-badge" aria-label={`${pendingApplicationsCount} applications pending`}>
              {pendingApplicationsCount > 99 ? "99+" : pendingApplicationsCount}
            </span>
          )}
        </Link>
        <Link to="/admin/seller-applications/sellers">
          <span className="material-symbols-outlined" aria-hidden="true">groups</span>
          <small>Sellers</small>
        </Link>
        <Link to="/admin/seller-applications/list">
          <span className="material-symbols-outlined" aria-hidden="true">bar_chart</span>
          <small>Reports</small>
        </Link>
        <Link to="/admin/settings">
          <span className="material-symbols-outlined" aria-hidden="true">more_horiz</span>
          <small>More</small>
        </Link>
      </nav>

      {selectedApplication && (
        <ApplicationDetails
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
}
