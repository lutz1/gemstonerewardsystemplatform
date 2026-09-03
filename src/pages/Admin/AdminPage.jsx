import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import {
  MdAccountBalanceWallet,
  MdArrowForward,
  MdCheckCircle,
  MdClose,
  MdGroup,
  MdLocalFireDepartment,
  MdPayments,
  MdPendingActions,
  MdTrendingUp,
  MdWorkspacePremium,
} from "react-icons/md";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import GemValueChart from "../../components/GemValueChart/GemValueChart";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import "./AdminPage.css";

function formatPeso(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH")}`;
}

const emptyDashboard = {
  totalSales: 0,
  totalGemValueAccumulated: 0,
  activeUsers: 0,
  userCount: 0,
  pendingApprovals: 0,
  purchaseTotalsByTier: [],
  activities: [],
  // Each point: { label: "Mon", amount: 1234 } — GEM value redeemed/spent
  // on that day. Powers the burn-rate panel below.
  gemBurnRate: [],
};

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [showSalesDetails, setShowSalesDetails] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const getAdminDashboard = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "getAdminDashboard",
        );
        const result = await getAdminDashboard();
        setDashboard({ ...emptyDashboard, ...(result.data || {}) });
      } catch (error) {
        console.error("Failed to load admin dashboard:", error);
        setDashboard(emptyDashboard);
      }
    };

    void loadDashboard();
  }, []);

  const {
    totalSales,
    totalGemValueAccumulated,
    activeUsers,
    userCount,
    // Renamed at the destructure level only — the backend function still
    // returns this under the `pendingApprovals` key, so the field name in
    // emptyDashboard/result.data stays untouched. This is just the label
    // used from here down in the component.
    pendingApprovals: pendingWithdrawals,
    purchaseTotalsByTier,
    activities,
    gemBurnRate,
  } = dashboard;

  const maxBurn = gemBurnRate.length
    ? Math.max(...gemBurnRate.map((point) => point.amount))
    : 0;
  const currentBurnRate = gemBurnRate.length
    ? gemBurnRate.reduce((sum, point) => sum + point.amount, 0) /
      gemBurnRate.length
    : 0;

  return (
    <div className="admin-root">
      <TopBar
        userName="Admin"
        userRole="Administrator"
        profilePath="/admin/profile"
      />
      <main className="admin-main">
        <section className="admin-header admin-dashboard-heading">
          <p className="admin-eyebrow">Administration</p>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">
            A quick view of your platform activity and sales performance.
          </p>
        </section>

        <section className="admin-summary-grid" aria-label="Platform summary">
          <article className="admin-summary-card admin-summary-card--accent">
            <div className="admin-summary-icon">
              <MdPayments />
            </div>
            <div>
              <p>Total sales</p>
              <strong>{formatPeso(totalSales)}</strong>
              <span>
                <MdTrendingUp /> 12.4% this month
              </span>
            </div>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-icon">
              <MdGroup />
            </div>
            <div>
              <p>Active users</p>
              <strong>{activeUsers}</strong>
              <span>{userCount} registered accounts</span>
            </div>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-icon">
              <MdWorkspacePremium />
            </div>
            <div>
              <p>GEM value accumulated</p>
              <strong>{formatPeso(totalGemValueAccumulated)}</strong>
              <span>Total value earned across all members</span>
            </div>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-icon">
              <MdAccountBalanceWallet />
            </div>
            <div>
              <p>Pending withdrawals</p>
              <strong>{pendingWithdrawals}</strong>
              <span>Awaiting your review</span>
            </div>
          </article>
        </section>

        <section className="admin-dashboard-grid">
          <div className="admin-dashboard-column">
            <section className="admin-dashboard-panel admin-sales-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="admin-panel-eyebrow">Performance</p>
                  <h2>Sales summary</h2>
                </div>
                <button type="button" onClick={() => setShowSalesDetails(true)}>
                  View details <MdArrowForward />
                </button>
              </div>
              <div className="admin-sales-total">
                <strong>{formatPeso(totalSales)}</strong>
                <span>
                  <MdTrendingUp /> 12.4% vs last month
                </span>
              </div>
              <div className="admin-sales-bars">
                {purchaseTotalsByTier.map((tier) => (
                  <div className="admin-sales-bar-row" key={tier.tier}>
                    <div>
                      <span>{tier.tier}</span>
                      <small>{tier.count} codes</small>
                    </div>
                    <div className="admin-sales-track">
                      <span
                        style={{
                          width: `${totalSales ? (tier.total / totalSales) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <strong>{formatPeso(tier.total)}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="admin-dashboard-panel admin-activity-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="admin-panel-eyebrow">Live feed</p>
                  <h2>Activity logs</h2>
                </div>
                <span className="admin-live-indicator">Live</span>
              </div>
              <div className="admin-activity-list">
                {activities.map(({ title, detail, time, tone, id }) => {
                  const Icon =
                    tone === "amber" ? MdPendingActions : MdCheckCircle;
                  return (
                    <div className="admin-activity-row" key={id}>
                      <div className={`admin-activity-icon ${tone}`}>
                        <Icon />
                      </div>
                      <div>
                        <strong>{title}</strong>
                        <p>{detail}</p>
                      </div>
                      <time>{time}</time>
                    </div>
                  );
                })}
                {activities.length === 0 && (
                  <p className="admin-users-empty">No activity recorded yet.</p>
                )}
              </div>
            </section>
          </div>
          <div className="admin-dashboard-column">
            <GemValueChart />
            <section className="admin-dashboard-panel admin-burn-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="admin-panel-eyebrow">GEM panel</p>
                  <h2>GEM burn rate</h2>
                </div>
                <MdLocalFireDepartment className="admin-heading-icon" />
              </div>
              <div className="admin-burn-summary">
                <strong>{formatPeso(currentBurnRate)}</strong>
                <span>GEM value redeemed per day, 7-day average</span>
              </div>
              <div
                className="admin-burn-chart"
                role="img"
                aria-label="GEM burn rate over recent days"
              >
                {gemBurnRate.map((point) => (
                  <div className="admin-burn-bar" key={point.label}>
                    <span
                      style={{
                        height: `${maxBurn ? (point.amount / maxBurn) * 100 : 0}%`,
                      }}
                    />
                    <small>{point.label}</small>
                  </div>
                ))}
                {gemBurnRate.length === 0 && (
                  <p className="admin-users-empty">No burn rate data yet.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>

      {showSalesDetails && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Sales details"
          onClick={() => setShowSalesDetails(false)}
        >
          <div
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2>Sales details</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowSalesDetails(false)}
                aria-label="Close"
              >
                <MdClose />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-sales-total">
                <strong>{formatPeso(totalSales)}</strong>
                <span>
                  <MdTrendingUp /> 12.4% vs last month
                </span>
              </div>
              <div className="admin-sales-bars">
                {purchaseTotalsByTier.map((tier) => (
                  <div className="admin-sales-bar-row" key={tier.tier}>
                    <div>
                      <span>{tier.tier}</span>
                      <small>{tier.count} codes</small>
                    </div>
                    <div className="admin-sales-track">
                      <span
                        style={{
                          width: `${totalSales ? (tier.total / totalSales) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <strong>{formatPeso(tier.total)}</strong>
                  </div>
                ))}
                {purchaseTotalsByTier.length === 0 && (
                  <p className="admin-users-empty">
                    No sales data recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeItem="dashboard" variant="admin" />
    </div>
  );
}
