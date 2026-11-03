import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import {
    MdAccountBalanceWallet,
    MdAdd,
    MdArrowForward,
    MdCheckCircle,
    MdClose,
    MdDiamond,
    MdGroup,
    MdHistory,
    MdLocalFireDepartment,
    MdPayments,
    MdPendingActions,
    MdStorefront,
    MdTrendingUp,
    MdWorkspacePremium,
} from "react-icons/md";
import { Link } from "react-router-dom";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import GemValueChart from "../../components/GemValueChart/GemValueChart";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import PumpValueModal from "./PumpValueModal";
import PumpValueHistoryModal from "./PumpValueHistoryModal";
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
  gemPond: 0,
  // Each point: { label: "Mon", amount: 1234 } — GEM value redeemed/spent
  // on that day. Powers the burn-rate panel below.
  gemBurnRate: [],
};

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [showSalesDetails, setShowSalesDetails] = useState(false);
  const [showPumpValueModal, setShowPumpValueModal] = useState(false);
  const [showPumpHistoryModal, setShowPumpHistoryModal] = useState(false);
  const [gemValueRefreshKey, setGemValueRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSellerApplications, setPendingSellerApplications] = useState(null);

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
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const getAdminSellerApplications = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getAdminSellerApplications",
    );

    getAdminSellerApplications()
      .then(({ data }) => {
        if (!isMounted) return;
        const count = data?.pendingCount;
        setPendingSellerApplications(
          Number.isSafeInteger(count) && count >= 0 ? count : 0,
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Failed to load pending seller application count:", error);
        setPendingSellerApplications(-1);
      });

    return () => {
      isMounted = false;
    };
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
    gemPond,
    totalGemBurn,
    gemBurnRate,
  } = dashboard;

  const maxBurn = gemBurnRate.length
    ? Math.max(...gemBurnRate.map((point) => point.amount))
    : 0;
  const currentBurnRate = gemBurnRate.length
    ? gemBurnRate.reduce((sum, point) => sum + point.amount, 0) /
      gemBurnRate.length
    : 0;

  if (isLoading) {
    return <LoadingScreen label="Loading dashboard..." />;
  }

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
          <Link
            className="admin-summary-card admin-withdrawal-summary-card"
            to="/admin/withdrawals"
            aria-label={`Review ${pendingWithdrawals} pending withdrawal requests`}
          >
            <div className="admin-summary-icon">
              <MdAccountBalanceWallet />
            </div>
            <div>
              <p>Pending withdrawals</p>
              <strong>{pendingWithdrawals}</strong>
              <span>Awaiting your review <MdArrowForward /></span>
            </div>
          </Link>
          <Link
            className="admin-summary-card admin-withdrawal-summary-card admin-seller-applications-summary-card"
            to="/admin/seller-applications"
            aria-label={
              pendingSellerApplications === null
                ? "Manage seller applications"
                : pendingSellerApplications < 0
                  ? "Manage seller applications; count unavailable"
                  : `Manage seller applications; ${pendingSellerApplications} awaiting review`
            }
          >
            <div className="admin-summary-icon">
              <MdStorefront />
            </div>
            <div className="admin-seller-applications-summary-copy">
              <p>Seller's Application Management</p>
              <strong>
                {pendingSellerApplications === null
                  ? "—"
                  : pendingSellerApplications < 0
                    ? "!"
                    : pendingSellerApplications}
              </strong>
              <span>
                {pendingSellerApplications < 0
                  ? "Count unavailable"
                  : "Awaiting review"}
                <MdArrowForward />
              </span>
            </div>
            {pendingSellerApplications > 0 && (
              <span className="admin-seller-applications-badge" aria-hidden="true">
                {pendingSellerApplications > 99
                  ? "99+"
                  : pendingSellerApplications}
              </span>
            )}
          </Link>
        </section>

        <section className="admin-gem-chart-row" aria-label="GEM value">
          <GemValueChart refreshKey={gemValueRefreshKey} variant="admin" />
        </section>

        <section className="admin-pond-burn-row" aria-label="GEM pool and burn summary">
          <section className="admin-dashboard-panel admin-pond-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-panel-eyebrow">GEM pond</p>
                <h2>GEM Pond</h2>
              </div>
              <div className="admin-pond-actions">
                <button
                  className="admin-pond-history-button"
                  type="button"
                  onClick={() => setShowPumpHistoryModal(true)}
                  aria-label="View GEM Pond pump history"
                  title="Pump history"
                >
                  <MdHistory />
                </button>
                <button
                  className="admin-pond-pump-button"
                  type="button"
                  onClick={() => setShowPumpValueModal(true)}
                >
                  <MdAdd /> Pump value
                </button>
                <MdDiamond className="admin-heading-icon" />
              </div>
            </div>
            <div className="admin-pond-content">
              <strong className="admin-pond-total">
                {`₱${Number(gemPond ?? 0).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              </strong>
              <span className="admin-pond-copy">Value available in the GEM Pond</span>
            </div>
          </section>

          <section className="admin-dashboard-panel admin-burn-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-panel-eyebrow">GEM panel</p>
                <h2>GEM burn rate</h2>
              </div>
              <MdLocalFireDepartment className="admin-heading-icon" />
            </div>
            <div className="admin-burn-panel-layout">
              <section className="admin-burn-detail">
                <div className="admin-burn-summary">
                  <strong>{Number(totalGemBurn ?? 0).toLocaleString("en-PH")} GEM</strong>
                  <span>Total GEM Burn · {formatPeso(currentBurnRate)} value per day average</span>
                </div>
                <div className="admin-burn-chart" role="img" aria-label="GEM burn rate over recent days">
                  {gemBurnRate.map((point) => (
                    <div className="admin-burn-bar" key={point.label}>
                      <span style={{ height: `${maxBurn ? (point.amount / maxBurn) * 100 : 0}%` }} />
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
        </section>
      </main>

      {showPumpValueModal && (
        <PumpValueModal
          currentPond={gemPond}
          onClose={() => setShowPumpValueModal(false)}
          onPumped={(amount) => {
            if (Number.isFinite(amount) && amount > 0) {
              setDashboard((current) => ({
                ...current,
                gemPond: Number(current.gemPond ?? 0) + amount,
                totalGemPump: Number(current.totalGemPump ?? 0) + amount,
              }));
              setGemValueRefreshKey((key) => key + 1);
            }
            setShowPumpValueModal(false);
          }}
        />
      )}

      {showPumpHistoryModal && (
        <PumpValueHistoryModal
          onClose={() => setShowPumpHistoryModal(false)}
        />
      )}

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
