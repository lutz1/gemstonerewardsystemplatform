import {
    MdArrowForward,
    MdCheckCircle,
    MdGroup,
    MdPayments,
    MdPendingActions,
    MdPersonAdd,
    MdReceiptLong,
    MdTrendingUp,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
    formatPeso,
    pendingApprovals,
    purchaseTotalsByTier,
    users,
} from "../../../utils/AdminMockData";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import GemValueChart from "../../components/GemValueChart/GemValueChart";
import TopBar from "../../components/TopBar/TopBar";
import "./AdminPage.css";

export default function AdminPage() {
  const navigate = useNavigate();
  const totalSales = purchaseTotalsByTier.reduce(
    (total, tier) => total + tier.total,
    0,
  );
  const totalCodes = purchaseTotalsByTier.reduce(
    (total, tier) => total + tier.count,
    0,
  );
  const activeUsers = users.filter((user) => user.status === "active").length;

  const activityItems = [
    {
      icon: MdPersonAdd,
      title: "New member registered",
      detail: "Sophia Tan joined the platform",
      time: "2h ago",
      tone: "green",
    },
    {
      icon: MdCheckCircle,
      title: "Purchase approved",
      detail: "PA-1042 · Marcus Villareal",
      time: "4h ago",
      tone: "green",
    },
    {
      icon: MdPendingActions,
      title: "Approval awaiting review",
      detail: `${pendingApprovals.length} purchase requests pending`,
      time: "Today",
      tone: "amber",
    },
    {
      icon: MdReceiptLong,
      title: "Purchase code generated",
      detail: "Diamond package · 31 codes issued",
      time: "Yesterday",
      tone: "blue",
    },
  ];

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
              <span>{users.length} registered accounts</span>
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
              <strong>{pendingApprovals.length}</strong>
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
                        style={{ width: `${(tier.total / totalSales) * 100}%` }}
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
                {activityItems.map(
                  ({ icon: Icon, title, detail, time, tone }) => (
                    <div className="admin-activity-row" key={title}>
                      <div className={`admin-activity-icon ${tone}`}>
                        <Icon />
                      </div>
                      <div>
                        <strong>{title}</strong>
                        <p>{detail}</p>
                      </div>
                      <time>{time}</time>
                    </div>
                  ),
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
                <strong>{pendingApprovals.length}</strong>
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
