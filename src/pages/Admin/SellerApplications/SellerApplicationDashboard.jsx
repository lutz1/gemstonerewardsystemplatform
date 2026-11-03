import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link } from "react-router-dom";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import merchantIcon from "../../../assets/merchanticon.png";
import { app } from "../../../firebase";
import "./SellerApplicationDashboard.css";

function getApplicationGroup(status) {
  if (status === "approved" || status === "active_seller") return "approved";
  if (
    status === "pending_review"
    || status === "under_review"
    || status === "needs_additional_documents"
  ) {
    return "pending";
  }
  return "other";
}

function getChartDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getApplicationsChart(applications, range) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - range + 1);
  const counts = new Map();
  applications.forEach((application) => {
    const submittedAt = application.submittedAt ? new Date(application.submittedAt) : null;
    if (!submittedAt || Number.isNaN(submittedAt.getTime())) return;
    const key = getChartDateKey(submittedAt);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from({ length: range }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      count: counts.get(getChartDateKey(date)) || 0,
    };
  });
}

function formatChartDate(date) {
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export default function SellerApplicationDashboard() {
  const [applications, setApplications] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [chartRange, setChartRange] = useState(30);
  const [notice, setNotice] = useState("");

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
        if (!isMounted) return;
        setApplications(
          Array.isArray(data?.applications) ? data.applications : [],
        );
        setPendingCount(
          Number.isSafeInteger(data?.pendingCount) && data.pendingCount >= 0
            ? data.pendingCount
            : 0,
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        globalThis.console.error("Could not load seller applications.", error);
        setErrorMessage(
          error.message || "Unable to load seller applications. Please try again.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  if (isLoading) {
    return <LoadingScreen label="Loading seller applications..." />;
  }

  const approvedCount = applications.filter(
    (application) => getApplicationGroup(application.status) === "approved",
  ).length;
  const chartData = getApplicationsChart(applications, chartRange);
  const chartMaximum = Math.max(
    4,
    Math.ceil(Math.max(...chartData.map((point) => point.count)) / 4) * 4,
  );
  const chartPoints = chartData.map((point, index) => ({
    ...point,
    x: 38 + (index * 350) / Math.max(chartData.length - 1, 1),
    y: 132 - (point.count / chartMaximum) * 108,
  }));
  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const chartArea = `38,132 ${chartLine} 388,132`;
  return (
    <div className="admin-root seller-applications-root">
      <header className="seller-applications-topbar">
        <div className="seller-applications-header-actions">
          <Link
            className="seller-applications-back-link"
            to="/admin/dashboard"
            aria-label="Back to Admin Dashboard"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_left
            </span>
          </Link>
          <Link
            className="seller-applications-header-notifications"
            to="/admin/notifications"
            aria-label="Notifications, 1 new notification"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              notifications
            </span>
            <span className="seller-applications-notification-badge" aria-hidden="true">
              1
            </span>
          </Link>
        </div>
        <div className="seller-applications-hero">
          <div className="seller-applications-hero-copy">
            <h1>Seller Application<br />Management</h1>
            <Link
              className="seller-applications-dashboard-link"
              to="/admin/dashboard"
            >
              Admin Dashboard
            </Link>
          </div>
          <div className="seller-applications-hero-art" aria-hidden="true">
            <img className="seller-applications-store-icon" src={merchantIcon} alt="" />
            <span className="material-symbols-outlined seller-applications-verified-icon">
              verified
            </span>
          </div>
        </div>
      </header>

      <main className="seller-applications-main">
        <section className="seller-applications-stats" aria-label="Application summary">
          <div className="is-selected">
            <span className="material-symbols-outlined">description</span>
            <strong>{applications.length}</strong>
            <small>Total Applications</small>
          </div>
          <div>
            <span className="material-symbols-outlined">check_circle</span>
            <strong>{approvedCount}</strong>
            <small>Approved</small>
          </div>
          <div id="pending-applications-summary">
            <span className="material-symbols-outlined">cancel</span>
            <strong>{pendingCount}</strong>
            <small>Pending</small>
          </div>
        </section>

        <section className="seller-applications-overview" id="applications-overview">
          <div className="seller-applications-overview-heading">
            <h2>Applications Overview</h2>
            <label>
              <span className="visually-hidden">Chart date range</span>
              <select
                value={chartRange}
                onChange={(event) => setChartRange(Number(event.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </label>
          </div>
          <div className="seller-applications-chart">
            <div className="seller-applications-chart-axis" aria-hidden="true">
              {[chartMaximum, chartMaximum * 0.75, chartMaximum * 0.5, chartMaximum * 0.25, 0]
                .map((value, index) => (
                  <span key={index}>{Math.round(value)}</span>
                ))}
            </div>
            <svg
              viewBox="0 0 420 166"
              role="img"
              aria-label={`Seller applications submitted in the last ${chartRange} days`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="seller-applications-chart-fill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#1762d5" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#1762d5" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[24, 51, 78, 105, 132].map((y) => (
                <line
                  key={y}
                  x1="38"
                  y1={y}
                  x2="388"
                  y2={y}
                  className="seller-applications-chart-gridline"
                />
              ))}
              <polygon points={chartArea} className="seller-applications-chart-area" />
              <polyline points={chartLine} className="seller-applications-chart-line" />
              {chartPoints
                .filter((_, index) => index % Math.max(1, Math.floor(chartRange / 10)) === 0)
                .map((point) => (
                  <circle
                    key={point.date.toISOString()}
                    cx={point.x}
                    cy={point.y}
                    r="3.5"
                    className="seller-applications-chart-point"
                  />
                ))}
            </svg>
          </div>
          <div className="seller-applications-chart-labels" aria-hidden="true">
            <span>{formatChartDate(chartData[0].date)}</span>
            <span>{formatChartDate(chartData[Math.floor(chartData.length / 2)].date)}</span>
            <span>{formatChartDate(chartData[chartData.length - 1].date)}</span>
          </div>
        </section>

        <nav className="seller-applications-quick-actions" aria-label="Admin shortcuts">
          <Link to="/admin/seller-applications/list">
            <span className="material-symbols-outlined">description</span>
            <span>Applications</span>
          </Link>
          <Link to="/admin/seller-applications/sellers">
            <span className="material-symbols-outlined">groups</span>
            <span>Seller Management</span>
          </Link>
          <a href="#pending-applications-summary">
            <span className="material-symbols-outlined">task_alt</span>
            <span>Approval Queue</span>
          </a>
          <button
            type="button"
            onClick={() => setNotice("Reports are coming soon.")}
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span>Reports</span>
          </button>
          <Link to="/admin/settings">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>
        </nav>

        {notice && (
          <p className="seller-applications-notice" role="status">
            {notice}
            <button type="button" onClick={() => setNotice("")}>Dismiss</button>
          </p>
        )}

        {pendingCount > 0 && (
          <section className="seller-applications-review-banner" role="status">
            <span className="material-symbols-outlined">campaign</span>
            <span>
              <strong>{pendingCount} applications require review</strong>
              <small>Pending applications are included in the summary above</small>
            </span>
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_right
            </span>
          </section>
        )}

        {errorMessage && (
          <section className="seller-applications-state" role="alert">
            <h2>Unable to load applications</h2>
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
          </section>
        )}
      </main>
      <nav className="seller-applications-bottom-nav" aria-label="Admin navigation">
        <Link className="is-active" to="/admin/seller-applications">
          <span className="material-symbols-outlined">home</span>
          <small>Dashboard</small>
        </Link>
        <Link to="/admin/seller-applications/list">
          <span className="material-symbols-outlined">description</span>
          <small>Applications</small>
          {pendingCount > 0 && (
            <span className="seller-applications-nav-badge" aria-label={`${pendingCount} applications pending`}>
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </Link>
        <Link to="/admin/seller-applications/sellers">
          <span className="material-symbols-outlined">groups</span>
          <small>Sellers</small>
        </Link>
        <button
          type="button"
          onClick={() => document.getElementById("applications-overview")?.scrollIntoView({
            behavior: "smooth",
          })}
        >
          <span className="material-symbols-outlined">bar_chart</span>
          <small>Reports</small>
        </button>
        <Link to="/admin/settings">
          <span className="material-symbols-outlined">more_horiz</span>
          <small>More</small>
        </Link>
      </nav>
    </div>
  );
}
