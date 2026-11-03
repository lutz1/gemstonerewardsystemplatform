import { useEffect, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link } from "react-router-dom";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import { app } from "../../../firebase";
import "./SellerManagementList.css";

function getSellerStatus(status) {
  return ["active", "suspended", "inactive"].includes(status) ? status : "active";
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SellerManagementList() {
  const [sellers, setSellers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [registrationStart, setRegistrationStart] = useState("");
  const [registrationEnd, setRegistrationEnd] = useState("");
  const [isRegistrationDateOpen, setIsRegistrationDateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [updatingSellerId, setUpdatingSellerId] = useState("");
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    const getAdminSellers = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getAdminSellers",
    );
    getAdminSellers()
      .then(({ data }) => {
        if (isMounted) {
          setSellers(Array.isArray(data?.sellers) ? data.sellers : []);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        globalThis.console.error("Could not load active sellers.", error);
        setErrorMessage(error.message || "Unable to load the seller list.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  useEffect(() => {
    let isMounted = true;
    const getAdminSellerApplications = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getAdminSellerApplications",
    );

    getAdminSellerApplications()
      .then(({ data }) => {
        if (!isMounted) return;
        setPendingApplicationsCount(
          Number.isSafeInteger(data?.pendingCount) && data.pendingCount >= 0
            ? data.pendingCount
            : 0,
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        globalThis.console.error("Could not load pending seller application count.", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => Array.from(new Set(
    sellers
      .map((seller) => seller.productCategory?.trim())
      .filter(Boolean),
  )).sort((first, second) => first.localeCompare(second)), [sellers]);

  const filteredSellers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return sellers.filter((seller) => {
      const matchesStatus = statusFilter === "all"
        || getSellerStatus(seller.status) === statusFilter;
      const matchesCategory = categoryFilter === "all"
        || seller.productCategory?.trim() === categoryFilter;
      const matchesSearch = !normalizedQuery || [
        seller.storeName,
        seller.id,
        seller.sellerId,
        seller.name,
        seller.email,
        seller.mobileNumber,
        seller.productCategory,
      ].some((value) => (
        typeof value === "string" && value.toLowerCase().includes(normalizedQuery)
      ));
      const registrationDate = seller.submittedAt
        ? new Date(seller.submittedAt).toISOString().slice(0, 10)
        : "";
      const matchesRegistrationDate = (!registrationStart || registrationDate >= registrationStart)
        && (!registrationEnd || registrationDate <= registrationEnd);
      return matchesStatus && matchesCategory && matchesSearch && matchesRegistrationDate;
    }).sort((first, second) => {
      const firstDate = first.submittedAt ? Date.parse(first.submittedAt) : null;
      const secondDate = second.submittedAt ? Date.parse(second.submittedAt) : null;
      if (firstDate === null && secondDate === null) {
        return (first.name || "").localeCompare(second.name || "");
      }
      if (firstDate === null) return 1;
      if (secondDate === null) return -1;
      return sortOrder === "newest" ? secondDate - firstDate : firstDate - secondDate;
    });
  }, [
    categoryFilter,
    registrationEnd,
    registrationStart,
    searchQuery,
    sellers,
    sortOrder,
    statusFilter,
  ]);
  const sellerCounts = useMemo(() => sellers.reduce((counts, seller) => {
    const sellerStatus = getSellerStatus(seller.status);
    if (sellerStatus === "suspended") {
      counts.suspended += 1;
    } else if (sellerStatus === "inactive") {
      counts.inactive += 1;
    } else {
      counts.active += 1;
    }
    return counts;
  }, { active: 0, suspended: 0, inactive: 0 }), [sellers]);

  async function updateSellerStatus(seller, status) {
    setStatusUpdateError("");
    setUpdatingSellerId(seller.id);
    try {
      const updateAdminSellerStatus = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "updateAdminSellerStatus",
      );
      await updateAdminSellerStatus({ userId: seller.id, status });
      setSellers((currentSellers) => currentSellers.map((currentSeller) => (
        currentSeller.id === seller.id ? { ...currentSeller, status } : currentSeller
      )));
    } catch (error) {
      globalThis.console.error("Could not update seller status.", error);
      setStatusUpdateError(error.message || "Unable to update the seller status.");
    } finally {
      setUpdatingSellerId("");
    }
  }

  if (isLoading) {
    return <LoadingScreen label="Loading seller management..." />;
  }

  return (
    <div className="seller-management-root">
      <header className="seller-management-header">
        <Link
          to="/admin/seller-applications"
          aria-label="Back to seller application dashboard"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_left
          </span>
        </Link>
        <h1>Seller Management</h1>
        <span aria-hidden="true" />
      </header>

      <main className="seller-management-content">
        <section className="seller-management-summary" aria-label="Seller status summary">
          <article className="seller-management-summary-card is-active">
            <div className="seller-management-summary-card-heading">
              <span className="material-symbols-outlined" aria-hidden="true">
                check_circle
              </span>
              <span className="seller-management-summary-tag">Active</span>
            </div>
            <p>ACTIVE</p>
            <strong>{sellerCounts.active.toLocaleString("en-PH")}</strong>
          </article>
          <article className="seller-management-summary-card is-suspended">
            <div className="seller-management-summary-card-heading">
              <span className="material-symbols-outlined" aria-hidden="true">
                block
              </span>
              <span className="seller-management-summary-tag">Alert</span>
            </div>
            <p>SUSPENDED</p>
            <strong>{sellerCounts.suspended.toLocaleString("en-PH")}</strong>
          </article>
          <article className="seller-management-summary-card is-inactive">
            <div className="seller-management-summary-card-heading">
              <span className="material-symbols-outlined" aria-hidden="true">
                schedule
              </span>
              <span className="seller-management-summary-tag">Dormant</span>
            </div>
            <p>INACTIVE</p>
            <strong>{sellerCounts.inactive.toLocaleString("en-PH")}</strong>
          </article>
        </section>

        <div className="seller-management-search-container">
          <label className="seller-management-search">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search store name, ID, seller email..."
              aria-label="Search store name, seller ID, or seller email"
            />
          </label>
          <button
            className={`seller-management-filter-button${isFilterOpen ? " is-open" : ""}${
              statusFilter !== "all" ? " has-filter" : ""
            }`}
            type="button"
            aria-label="Configure seller status filter"
            aria-expanded={isFilterOpen}
            aria-haspopup="true"
            onClick={() => setIsFilterOpen((open) => !open)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              tune
            </span>
          </button>
          {isFilterOpen && (
            <div className="seller-management-filter-menu" role="group" aria-label="Filter sellers by status">
              {[
                ["all", "All sellers"],
                ["active", "Active"],
                ["suspended", "Suspended"],
                ["inactive", "Inactive"],
              ].map(([value, label]) => (
                <label key={value} className="seller-management-filter-option">
                  <input
                    type="radio"
                    name="seller-status-filter"
                    value={value}
                    checked={statusFilter === value}
                    onChange={() => {
                      setStatusFilter(value);
                      setIsFilterOpen(false);
                    }}
                  />
                  <span>{label}</span>
                  {statusFilter === value && (
                    <span className="material-symbols-outlined" aria-hidden="true">
                      check
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="seller-management-filter-row" aria-label="Seller list filters">
          <label className="seller-management-select-filter">
            <span className="material-symbols-outlined" aria-hidden="true">sort</span>
            <span>Sort:</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort sellers by registration date"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
            <span className="material-symbols-outlined seller-management-filter-chevron" aria-hidden="true">
              expand_more
            </span>
          </label>

          <label className="seller-management-select-filter">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter sellers by category"
            >
              <option value="all">All</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <span className="material-symbols-outlined seller-management-filter-chevron" aria-hidden="true">
              expand_more
            </span>
          </label>

          <div className="seller-management-date-filter">
            <button
              className={registrationStart || registrationEnd ? "has-filter" : ""}
              type="button"
              aria-expanded={isRegistrationDateOpen}
              aria-haspopup="true"
              onClick={() => setIsRegistrationDateOpen((open) => !open)}
            >
              <span>Registration Date</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                calendar_month
              </span>
            </button>
            {isRegistrationDateOpen && (
              <div className="seller-management-date-menu">
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={registrationStart}
                    max={registrationEnd || undefined}
                    onChange={(event) => setRegistrationStart(event.target.value)}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={registrationEnd}
                    min={registrationStart || undefined}
                    onChange={(event) => setRegistrationEnd(event.target.value)}
                  />
                </label>
                {(registrationStart || registrationEnd) && (
                  <button
                    className="seller-management-date-clear"
                    type="button"
                    onClick={() => {
                      setRegistrationStart("");
                      setRegistrationEnd("");
                      setIsRegistrationDateOpen(false);
                    }}
                  >
                    Clear dates
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="seller-management-status-filters" role="group" aria-label="Filter by seller status">
          {[
            ["all", "All Sellers", sellers.length],
            ["active", "Active", sellerCounts.active],
            ["suspended", "Suspended", sellerCounts.suspended],
            ["inactive", "Inactive", sellerCounts.inactive],
          ].map(([status, label, count]) => (
            <button
              key={status}
              className={`seller-management-status-filter${statusFilter === status ? " is-selected" : ""} is-${status}`}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status !== "all" && <span className="seller-management-status-dot" aria-hidden="true" />}
              <span>{label}</span>
              <strong>{count.toLocaleString("en-PH")}</strong>
            </button>
          ))}
        </div>

        {errorMessage ? (
          <section className="seller-management-state" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <h2>Unable to load sellers</h2>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try again
            </button>
          </section>
        ) : filteredSellers.length ? (
          <section className="seller-management-list" aria-label="Seller accounts">
            {statusUpdateError && (
              <p className="seller-management-action-error" role="alert">
                {statusUpdateError}
              </p>
            )}
            {filteredSellers.map((seller) => {
              const sellerStatus = getSellerStatus(seller.status);
              return (
                <article className="seller-management-card" key={seller.id}>
                  <div className="seller-management-avatar" aria-hidden="true">
                    <span className="material-symbols-outlined">store</span>
                  </div>
                  <div className="seller-management-card-content">
                    <div className="seller-management-card-heading">
                      <div>
                        <h2>{seller.storeName || seller.name}</h2>
                        <p className="seller-management-id" title={seller.sellerId || seller.id}>
                          ID: {seller.sellerId || seller.id}
                        </p>
                      </div>
                      <span className={`seller-management-status is-${sellerStatus}`}>
                        <span aria-hidden="true" />
                        {sellerStatus}
                      </span>
                    </div>
                    <p className="seller-management-owner">{seller.name}</p>
                    <p className="seller-management-contact">{seller.email || "Email unavailable"}</p>
                    {seller.mobileNumber && <p className="seller-management-contact">{seller.mobileNumber}</p>}
                    <div className="seller-management-card-divider" />
                    <div className="seller-management-card-details">
                      {seller.productCategory ? (
                        <span className="seller-management-category">{seller.productCategory}</span>
                      ) : <span />}
                      <p className="seller-management-date">
                        Registered {formatDate(seller.submittedAt)}
                      </p>
                    </div>
                    <div className="seller-management-card-footer">
                      <label className={`seller-management-card-status is-${sellerStatus}`}>
                        <span className="seller-management-card-status-label">
                          Status: <strong>{sellerStatus}</strong>
                        </span>
                        <select
                          aria-label={`Change status for ${seller.storeName || seller.name}`}
                          value={sellerStatus}
                          disabled={updatingSellerId === seller.id}
                          onChange={(event) => updateSellerStatus(seller, event.target.value)}
                        >
                          <option value={sellerStatus}>
                            Status: {sellerStatus.charAt(0).toUpperCase() + sellerStatus.slice(1)}
                          </option>
                          {sellerStatus !== "active" && (
                            <option value="active">Action: Activate Seller</option>
                          )}
                          {sellerStatus !== "suspended" && (
                            <option value="suspended">Action: Suspend Seller</option>
                          )}
                          {sellerStatus !== "inactive" && (
                            <option value="inactive">Action: Deactivate Account</option>
                          )}
                        </select>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          expand_more
                        </span>
                      </label>
                      {seller.applicationId ? (
                        <Link
                          className="seller-management-application-link"
                          to={`/admin/seller-applications/${encodeURIComponent(seller.id)}/${encodeURIComponent(seller.applicationId)}`}
                        >
                          View Profile
                          <span className="material-symbols-outlined" aria-hidden="true">
                            arrow_forward
                          </span>
                        </Link>
                      ) : (
                        <span className="seller-management-no-profile">Profile unavailable</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="seller-management-state">
            <span className="material-symbols-outlined" aria-hidden="true">
              person_search
            </span>
            <h2>
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                || registrationStart || registrationEnd
                ? "No sellers found"
                : "No active sellers yet"}
            </h2>
            <p>
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                || registrationStart || registrationEnd
                ? "Try a different search or status filter."
                : "Sellers will appear here after their applications are approved."}
            </p>
          </section>
        )}
      </main>

      <nav className="seller-management-bottom-nav" aria-label="Admin navigation">
        <Link to="/admin/seller-applications">
          <span className="material-symbols-outlined" aria-hidden="true">home</span>
          <small>Dashboard</small>
        </Link>
        <Link to="/admin/seller-applications/list">
          <span className="material-symbols-outlined" aria-hidden="true">description</span>
          <small>Applications</small>
          {pendingApplicationsCount > 0 && (
            <span className="seller-management-applications-badge" aria-label={`${pendingApplicationsCount} applications pending`}>
              {pendingApplicationsCount > 99 ? "99+" : pendingApplicationsCount}
            </span>
          )}
        </Link>
        <Link
          className="is-active"
          to="/admin/seller-applications/sellers"
          aria-current="page"
        >
          <span className="material-symbols-outlined" aria-hidden="true">groups</span>
          <small>Sellers</small>
        </Link>
        <Link to="/admin/seller-applications#applications-overview">
          <span className="material-symbols-outlined" aria-hidden="true">bar_chart</span>
          <small>Reports</small>
        </Link>
        <Link to="/admin/settings">
          <span className="material-symbols-outlined" aria-hidden="true">more_horiz</span>
          <small>More</small>
        </Link>
      </nav>
    </div>
  );
}
