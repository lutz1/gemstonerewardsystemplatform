import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import { app } from "../../../firebase";
import "../AdminPage.css";
import "./WithdrawalRequestsPage.css";

const REQUESTS_PER_PAGE = 10;

function formatPeso(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "Date unavailable";
}

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const loadRequests = async () => {
    setIsLoading(true);
    setError("");
    try {
      const getWithdrawalRequests = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getWithdrawalRequests",
      );
      const { data } = await getWithdrawalRequests();
      setRequests(data?.requests || []);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load withdrawal requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, startDate, endDate]);

  const filteredRequests = requests.filter((withdrawal) => {
    const query = searchQuery.trim().toLowerCase();
    const searchableText = [
      withdrawal.referenceNo,
      withdrawal.userName,
      withdrawal.userEmail,
      withdrawal.userId,
      withdrawal.method,
      withdrawal.provider,
      withdrawal.accountName,
      withdrawal.details,
    ].filter(Boolean).join(" ").toLowerCase();
    const status = (withdrawal.status || "unknown").toLowerCase();
    const createdAt = new Date(withdrawal.createdAt || 0).getTime();
    const startTime = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity;
    const endTime = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;

    return (!query || searchableText.includes(query))
      && (statusFilter === "all" || status === statusFilter)
      && (!startDate || (Number.isFinite(createdAt) && createdAt >= startTime))
      && (!endDate || (Number.isFinite(createdAt) && createdAt <= endTime));
  });
  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / REQUESTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleRequests = filteredRequests.slice(
    (currentPage - 1) * REQUESTS_PER_PAGE,
    currentPage * REQUESTS_PER_PAGE,
  );
  const firstVisibleRequest = filteredRequests.length
    ? ((currentPage - 1) * REQUESTS_PER_PAGE) + 1
    : 0;
  const lastVisibleRequest = Math.min(currentPage * REQUESTS_PER_PAGE, filteredRequests.length);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const reviewRequest = async (withdrawal, decision) => {
    const isApproving = decision === "approved";
    const action = isApproving ? "approve" : "reject";
    const confirmation = isApproving
      ? withdrawal.walletDeducted === true
        ? `Approve ${withdrawal.referenceNo}? ${formatPeso(withdrawal.totalDeduction)} is already reserved and will not be deducted again.`
        : `Approve ${withdrawal.referenceNo}? ${formatPeso(withdrawal.totalDeduction)} will be deducted from the member's wallet.`
      : withdrawal.walletDeducted === true
        ? `Reject ${withdrawal.referenceNo}? ${formatPeso(withdrawal.totalDeduction)} will be refunded to the member's wallet.`
        : `Reject ${withdrawal.referenceNo}? No wallet deduction needs to be refunded.`;
    if (!window.confirm(confirmation)) return;

    setReviewingId(withdrawal.id);
    setError("");
    setNotice("");
    try {
      const reviewWithdrawalRequest = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "reviewWithdrawalRequest",
      );
      const { data } = await reviewWithdrawalRequest({ requestId: withdrawal.id, decision });
      if (data?.duplicate) {
        setNotice(`${withdrawal.referenceNo} was already ${data.status}. No new push was sent.`);
      } else if (data?.pushDeliveryFailed) {
        setNotice(`${withdrawal.referenceNo} was ${action}d, but FCM could not deliver a push. Ask the member to re-enable notifications.`);
      } else if (data?.pushTokensRegistered === false) {
        setNotice(`${withdrawal.referenceNo} was ${action}d, but the member has no registered web push token.`);
      } else if (data?.pushNotificationSent === false) {
        setNotice(`${withdrawal.referenceNo} was ${action}d, but FCM did not confirm push delivery.`);
      } else {
        setNotice(`${withdrawal.referenceNo} was ${action}d. FCM accepted the member push notification.`);
      }
      await loadRequests();
    } catch (reviewError) {
      setError(reviewError?.message || `Unable to ${action} this withdrawal request.`);
    } finally {
      setReviewingId("");
    }
  };

  return (
    <div className="admin-root admin-withdrawals-root">
      <TopBar
        userName="Admin"
        userRole="Administrator"
        profilePath="/admin/profile"
      />
      <main className="admin-main admin-withdrawals-main">
        <header className="admin-withdrawals-header">
          <div>
            <Link to="/admin/dashboard" className="admin-withdrawals-back">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              Dashboard
            </Link>
            <p className="admin-eyebrow">Administration</p>
            <h1 className="admin-title">Withdrawal Requests</h1>
            <p className="admin-subtitle">Review pending requests and view processed withdrawals.</p>
          </div>
          <button
            type="button"
            className="admin-withdrawals-refresh"
            onClick={() => void loadRequests()}
            disabled={isLoading || Boolean(reviewingId)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Refresh
          </button>
        </header>

        {notice && <p className="admin-withdrawals-notice" role="status">{notice}</p>}
        {error && <p className="admin-withdrawals-error" role="alert">{error}</p>}

        <section className="admin-withdrawal-filter-bar" aria-label="Filter withdrawal requests">
          <label className="admin-withdrawal-search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search reference, member, or destination"
              aria-label="Search withdrawal requests"
            />
          </label>
          <label className="admin-withdrawal-filter-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="admin-withdrawal-filter-field">
            <span>From</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="admin-withdrawal-filter-field">
            <span>To</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button
            type="button"
            className="admin-withdrawal-clear-filters"
            onClick={clearFilters}
            disabled={!searchQuery && statusFilter === "all" && !startDate && !endDate}
          >
            Clear
          </button>
        </section>
        <p className="admin-withdrawal-result-count" aria-live="polite">
          {filteredRequests.length
            ? `Showing ${firstVisibleRequest}-${lastVisibleRequest} of ${filteredRequests.length} requests`
            : "No matching requests"}
        </p>

        {isLoading ? (
          <p className="admin-withdrawals-state" role="status">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="admin-withdrawals-empty">
            <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
            <h2>No withdrawal requests</h2>
            <p>New withdrawal requests will appear here for review.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="admin-withdrawals-empty admin-withdrawals-no-matches">
            <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
            <h2>No matching requests</h2>
            <p>Try changing the search text or filters.</p>
          </div>
        ) : (
          <section className="admin-withdrawal-list" aria-label="Withdrawal requests">
            {visibleRequests.map((withdrawal) => {
              const status = withdrawal.status || "unknown";
              const statusLabel = status === "pending"
                ? "Pending approval"
                : status.charAt(0).toUpperCase() + status.slice(1);
              return (
              <details className="admin-withdrawal-item" key={withdrawal.id}>
                <summary className="admin-withdrawal-item-summary">
                  <div className="admin-withdrawal-summary-main">
                    <div className="admin-withdrawal-summary-heading">
                      <p className={`admin-withdrawal-status is-${status}`}>{statusLabel}</p>
                      <h2>{withdrawal.referenceNo}</h2>
                    </div>
                    <p className="admin-withdrawal-summary-member">
                      {withdrawal.userName || withdrawal.userEmail || withdrawal.userId}
                      <span>{withdrawal.method === "ewallet" ? "E-Wallet" : "Bank Transfer"} · {withdrawal.provider}</span>
                    </p>
                  </div>
                  <div className="admin-withdrawal-summary-meta">
                    <strong>{formatPeso(withdrawal.amount)}</strong>
                    <time>{formatDate(withdrawal.createdAt)}</time>
                  </div>
                  <span className="material-symbols-outlined admin-withdrawal-expand-icon" aria-hidden="true">
                    expand_more
                  </span>
                </summary>
                <div className="admin-withdrawal-expanded">
                  <dl className="admin-withdrawal-details">
                    <div><dt>Member</dt><dd>{withdrawal.userName || withdrawal.userEmail || withdrawal.userId}</dd></div>
                    <div><dt>Payment method</dt><dd>{withdrawal.method === "ewallet" ? "E-Wallet" : "Bank Transfer"} · {withdrawal.provider}</dd></div>
                    <div><dt>Account holder</dt><dd>{withdrawal.accountName}</dd></div>
                    <div><dt>Destination</dt><dd>{withdrawal.details}</dd></div>
                    <div><dt>Withdrawal amount</dt><dd>{formatPeso(withdrawal.amount)}</dd></div>
                    <div><dt>Service fee (8%)</dt><dd>{formatPeso(withdrawal.serviceFee)}</dd></div>
                    <div className="admin-withdrawal-total"><dt>Total wallet deduction</dt><dd>{formatPeso(withdrawal.totalDeduction)}</dd></div>
                  </dl>
                  {withdrawal.qrCode?.url && (
                    <a
                      className="admin-withdrawal-qr"
                      href={withdrawal.qrCode.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={withdrawal.qrCode.url} alt={`Payout QR for ${withdrawal.referenceNo}`} />
                      <span>View payout QR</span>
                    </a>
                  )}
                  {status === "pending" ? (
                    <div className="admin-withdrawal-actions">
                      <button
                        type="button"
                        className="admin-withdrawal-reject"
                        onClick={() => void reviewRequest(withdrawal, "rejected")}
                        disabled={Boolean(reviewingId)}
                      >
                        {reviewingId === withdrawal.id ? "Processing..." : "Reject"}
                      </button>
                      <button
                        type="button"
                        className="admin-withdrawal-approve"
                        onClick={() => void reviewRequest(withdrawal, "approved")}
                        disabled={Boolean(reviewingId)}
                      >
                        {reviewingId === withdrawal.id ? "Processing..." : "Approve"}
                      </button>
                    </div>
                  ) : withdrawal.reviewedAt ? (
                    <p className="admin-withdrawal-reviewed">Reviewed {formatDate(withdrawal.reviewedAt)}</p>
                  ) : null}
                </div>
              </details>
              );
            })}
          </section>
        )}
        {!isLoading && filteredRequests.length > 0 && (
          <nav className="admin-withdrawal-pagination" aria-label="Withdrawal request pages">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              Previous
            </button>
            <span>Page {currentPage} of {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={currentPage >= pageCount}
            >
              Next
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </nav>
        )}
      </main>
      <BottomNav activeItem="dashboard" variant="admin" />
    </div>
  );
}