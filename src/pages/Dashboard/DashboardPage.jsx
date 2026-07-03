import "./DashboardPage.css";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";

const GEM_IMG_URL =
  "https://images.unsplash.com/photo-1551893665-f843f600794e?auto=format&fit=crop&w=80&q=80";
const GUIDE_IMG_URL =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80";

const transactions = [
  {
    id: 1,
    icon: "redeem",
    name: "Referral Bonus: Sarah J.",
    date: "Oct 24, 2023 • 14:20",
    amount: "+500 GEMS",
    status: "Completed",
    positive: true,
  },
  {
    id: 2,
    icon: "shopping_cart",
    name: "Code Purchase: Platinum Tier",
    date: "Oct 22, 2023 • 09:12",
    amount: "-1,200 GEMS",
    status: "Success",
    positive: false,
  },
  {
    id: 3,
    icon: "bolt",
    name: "Weekly Staking Earned",
    date: "Oct 20, 2023 • 23:59",
    amount: "+145 GEMS",
    status: "Auto-credit",
    positive: true,
  },
];

export default function DashboardPage() {
  return (
    <div className="db-root">

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar userName="Marcus" showNotifDot />

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="db-main">

        {/* Welcome */}
        <section className="db-welcome">
          <div className="db-welcome-inner">
            <div>
              <p className="db-eyebrow">Dashboard Overview</p>
              <h2 className="db-hello">Hello, Marcus</h2>
              <p className="db-welcome-sub">
                Welcome back to your executive portal. Your network expanded by{" "}
                <strong style={{ color: "var(--primary)" }}>4%</strong> this week.
              </p>
            </div>
          </div>
        </section>

        {/* Bento grid */}
        <div className="db-grid">

          {/* ── Gems Wallet ──────────────────────────────────── */}
          <div className="db-col-7 glass-card-emerald db-wallet db-animate">
            <div className="db-wallet-top">
              <div>
                <div className="db-wallet-icon-row">
                  <div className="db-wallet-icon-wrap">
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "var(--primary)", fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                    >
                      account_balance_wallet
                    </span>
                  </div>
                  <span className="db-wallet-label">Executive Gems Wallet</span>
                </div>
                <p className="db-wallet-amount">
                  12,450 <span className="db-gems-unit">GEMS</span>
                </p>
              </div>
              <div>
                <p className="db-wallet-est-label">ESTIMATED VALUE</p>
                <p className="db-wallet-est-val">$1,245.00</p>
              </div>
            </div>
            <div className="db-wallet-bottom">
              <div className="db-avatar-stack">
                <div className="db-avatar-stack-item">
                  <img src={GEM_IMG_URL} alt="" />
                </div>
                <div className="db-avatar-stack-item db-avatar-stack-icon">
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "var(--on-primary-container)", fontSize: 16 }}
                  >
                    trending_up
                  </span>
                </div>
              </div>
              <button className="db-exchange-btn">
                Exchange Gems
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* ── Quick Stats ───────────────────────────────────── */}
          <div className="db-col-5 db-animate db-animate-delay-1">
            <div className="db-stats-grid">
              <div className="glass-card db-stat-card">
                <div>
                  <span
                    className="material-symbols-outlined db-stat-icon"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    group
                  </span>
                  <p className="db-stat-sublabel">Direct Referrals</p>
                </div>
                <div>
                  <p className="db-stat-num">24</p>
                  <p className="db-stat-caption">Active Members</p>
                </div>
              </div>
              <div className="glass-card db-stat-card">
                <div>
                  <span className="material-symbols-outlined db-stat-icon">qr_code_2</span>
                  <p className="db-stat-sublabel">Purchase Codes</p>
                </div>
                <div>
                  <p className="db-stat-num">05</p>
                  <p className="db-stat-caption muted">Available now</p>
                </div>
              </div>
              <div className="glass-card db-referral-card">
                <div className="db-referral-inner">
                  <div className="db-referral-icon-wrap">
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "var(--primary)" }}
                    >
                      campaign
                    </span>
                  </div>
                  <div>
                    <p className="db-referral-title">Referral Hub</p>
                    <p className="db-referral-sub">Earn 500 Gems per sign-up</p>
                  </div>
                </div>
                <button className="db-chevron-btn" aria-label="Go to referral hub">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Transaction History ───────────────────────────── */}
          <div className="db-col-8 db-animate db-animate-delay-2">
            <div className="db-tx-header">
              <h3 className="db-tx-title">Transaction Activity</h3>
              <button className="db-tx-view-all">View All Ledger</button>
            </div>
            <div className="glass-card db-tx-list">
              {transactions.map((tx) => (
                <div className="db-tx-row" key={tx.id}>
                  <div className="db-tx-left">
                    <div className="db-tx-icon-wrap">
                      <span
                        className="material-symbols-outlined"
                        style={{ color: "var(--primary)" }}
                      >
                        {tx.icon}
                      </span>
                    </div>
                    <div>
                      <p className="db-tx-name">{tx.name}</p>
                      <p className="db-tx-date">{tx.date}</p>
                    </div>
                  </div>
                  <div className="db-tx-right">
                    <p className={`db-tx-amount${tx.positive ? "" : " negative"}`}>
                      {tx.amount}
                    </p>
                    <p className="db-tx-status">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Insights & Alerts ─────────────────────────────── */}
          <div className="db-col-4 db-animate db-animate-delay-3">
            <h3 className="db-insights-title">Insights &amp; Alerts</h3>
            <div className="glass-card db-insights-card" style={{ marginBottom: 24 }}>
              <div className="db-insights-glow" />
              <div className="db-insights-body">
                <div className="db-insight-row">
                  <span className="material-symbols-outlined db-insight-icon warn">
                    error_outline
                  </span>
                  <div>
                    <p className="db-insight-heading">Membership Renewal</p>
                    <p className="db-insight-text">
                      Your Executive status expires in 12 days. Renew now for early-bird bonus.
                    </p>
                    <button className="db-renew-btn">Renew Status</button>
                  </div>
                </div>
                <div className="db-insight-row">
                  <span className="material-symbols-outlined db-insight-icon info">
                    trending_up
                  </span>
                  <div>
                    <p className="db-insight-heading">Market Insight</p>
                    <p className="db-insight-text">
                      Gem value increased by 0.4% in the last 24 hours. High network volume detected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="db-img-card">
              <img src={GUIDE_IMG_URL} alt="Executive Network Guide 2024" />
              <div className="db-img-overlay" />
              <div className="db-img-text">
                <p className="db-img-eyebrow">New Resource</p>
                <p className="db-img-heading">Executive Network Guide 2024</p>
              </div>
            </div>
          </div>

        </div>
      </main>
      <BottomNav activeItem="dashboard" />
    </div>
  );
}