import "./DashboardPage.css";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";

const GUIDE_IMG_URL =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80";

// Placeholder trend data — swap for real gem points history when available.
const gemPointsTrend = [38, 52, 34, 68, 48, 76, 58];

// Builds SVG coordinates for a smooth-ish line chart from an array of values.
const CHART_W = 700;
const CHART_H = 140;
const CHART_PAD_Y = 12;

function buildChartGeometry(data) {
  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = CHART_W / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y =
      CHART_H -
      CHART_PAD_Y -
      ((v - min) / range) * (CHART_H - CHART_PAD_Y * 2);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M${points[0].x.toFixed(1)},${CHART_H} ` +
    points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L${points[points.length - 1].x.toFixed(1)},${CHART_H} Z`;

  return { points, linePath, areaPath };
}

export default function DashboardPage() {
  const navigate = useNavigate();

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

          {/* ── Wallet & Gem Points ──────────────────────────── */}
          <div className="db-col-7 glass-card-emerald db-wallet db-animate">
            <div className="db-wallet-top">
              <div className="db-wallet-main">
                <div className="db-wallet-icon-row">
                  <div className="db-wallet-icon-wrap">
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "var(--primary)", fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                    >
                      account_balance_wallet
                    </span>
                  </div>
                  <span className="db-wallet-label">Wallet &amp; Gem Points</span>
                </div>
                <div className="db-wallet-values">
                  <div className="db-wallet-value-block">
                    <p className="db-wallet-sublabel">Wallet Balance</p>
                    <p className="db-wallet-amount">12,450</p>
                  </div>
                  <div className="db-wallet-value-block">
                    <p className="db-wallet-sublabel">Gem Points</p>
                    <p className="db-wallet-amount">8,320</p>
                  </div>
                </div>
              </div>
              <div className="db-wallet-side">
                <p className="db-wallet-est-label">ESTIMATED VALUE</p>
                <p className="db-wallet-est-val">$1,245.00</p>
                <button className="db-exchange-btn">
                  Manage
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Quick Stats (compact) ─────────────────────────── */}
          <div className="db-col-5 db-animate db-animate-delay-1">
            <div className="db-stats-grid">
              <div className="glass-card db-stat-mini">
                <div className="db-stat-mini-icon-wrap">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    group
                  </span>
                </div>
                <div>
                  <p className="db-stat-mini-label">Direct Referrals</p>
                  <p className="db-stat-mini-value">24</p>
                </div>
              </div>
              <div className="glass-card db-stat-mini">
                <div className="db-stat-mini-icon-wrap muted">
                  <span className="material-symbols-outlined">qr_code_2</span>
                </div>
                <div>
                  <p className="db-stat-mini-label">Purchase Codes</p>
                  <p className="db-stat-mini-value">05</p>
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

          {/* ── Gem Points Graph + Transaction Logs ───────────── */}
          <div className="db-col-7 db-animate db-animate-delay-2">
            <div className="glass-card db-graph-card">
              <div className="db-graph-header">
                <h3 className="db-graph-title">Gem Points Trend</h3>
                <span className="db-graph-period">Last 7 Days</span>
              </div>
              <div className="db-graph-placeholder">
                <svg
                  className="db-graph-svg"
                  viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="gemLineAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(89, 222, 155, 0.35)" />
                      <stop offset="100%" stopColor="rgba(89, 222, 155, 0)" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const { points, linePath, areaPath } = buildChartGeometry(gemPointsTrend);
                    return (
                      <>
                        <path className="db-graph-area" d={areaPath} fill="url(#gemLineAreaFill)" />
                        <path className="db-graph-line" d={linePath} fill="none" />
                        {points.map((p, i) => (
                          <circle
                            key={i}
                            className="db-graph-dot"
                            cx={p.x}
                            cy={p.y}
                            r="4"
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
            <button
              className="db-tx-logs-btn"
              onClick={() => navigate("/purchase-codes")}
            >
              <span className="material-symbols-outlined">receipt_long</span>
              View Transaction Logs
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          {/* ── Insights & Alerts ─────────────────────────────── */}
          <div className="db-col-5 db-animate db-animate-delay-3">
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