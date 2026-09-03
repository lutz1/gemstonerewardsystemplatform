import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import {
  MdArrowForward,
  MdCheckCircle,
  MdGroup,
  MdPayments,
  MdPendingActions,
  MdReceiptLong,
  MdTrendingUp
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
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
  totalCodes: 0,
  activeUsers: 0,
  userCount: 0,
  pendingApprovals: 0,
  purchaseTotalsByTier: [],
  activities: [],
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(emptyDashboard);

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
    totalCodes,
    activeUsers,
    userCount,
    pendingApprovals,
    purchaseTotalsByTier,
    activities,
  } = dashboard;

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
              <MdReceiptLong />
            </div>
            <div>
              <p>Codes sold</p>
              <strong>{totalCodes}</strong>
              <span>Across all membership tiers</span>
            </div>
          </article>
          <article className="admin-summary-card">
            <div className="admin-summary-icon">
              <MdPendingActions />
            </div>
            <div>
              <p>Pending approvals</p>
              <strong>{pendingApprovals}</strong>
              <span>Requires your review</span>
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
                <button
                  type="button"
                  onClick={() => navigate("/purchase-codes")}
                >
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
                  const Icon = tone === "amber" ? MdPendingActions : MdCheckCircle;
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
            <section className="admin-dashboard-panel admin-review-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="admin-panel-eyebrow">Action needed</p>
                  <h2>Pending approvals</h2>
                </div>
                <MdPendingActions className="admin-heading-icon" />
              </div>
              <div className="admin-review-count">
                <strong>{pendingApprovals}</strong>
                <span>purchase requests are waiting for review</span>
              </div>
              <button type="button" className="admin-review-button">
                Review requests <MdArrowForward />
              </button>
            </section>
          </div>
        </section>
      </main>
      <BottomNav activeItem="dashboard" variant="admin" />
    </div>
  );
}
