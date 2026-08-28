import {
  MdAccountBalanceWallet,
  MdArrowForward,
  MdCampaign,
  MdChevronRight,
  MdDiamond,
  MdErrorOutline,
  MdGroup,
  MdQrCode,
  MdReceiptLong,
  MdSwapHoriz,
  MdTrendingUp,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import guideImage from "../../assets/bg_belowdashboard.png";
import GemValueChart from "../../components/GemValueChart/GemValueChart.jsx";
import TopBar from "../../components/TopBar/TopBar.jsx";
import "./DashboardPage.css";

const GUIDE_IMG = guideImage;

export default function Dashboard() {
  const navigate = useNavigate();

  // Kept even though the web version has no ScrollView/gesture
  // conflict to resolve — GemValueChart still calls this while the
  // user drags across the chart, in case a scrollable wrapper is
  // added around this page later.
  const handleScrubbingChange = () => {};

  return (
    <div className="dash-root">
      <TopBar userName="Marcus" showNotifDot />

      <div className="dash-content">
        {/* Welcome */}
        <div className="dash-welcome">
          <p className="dash-eyebrow">Dashboard Overview</p>
          <h1 className="dash-hello">Hello, Marcus</h1>
          <p className="dash-welcome-sub">
            Welcome back to your executive portal. Your network expanded by{" "}
            <span className="dash-highlight">4%</span> this week.
          </p>
        </div>

        {/* Wallet & Gem Points */}
        <div className="dash-wallet-card">
          {/* Decorative watermark, purely visual depth */}
          <MdDiamond className="dash-wallet-watermark" size={140} />

          <div className="dash-wallet-top">
            <div className="dash-wallet-icon-row">
              <div className="dash-wallet-icon-wrap">
                <MdAccountBalanceWallet
                  size={18}
                  color="var(--color-primary)"
                />
              </div>
              <span className="dash-wallet-label">Wallet & Gem Points</span>
            </div>
            <div className="dash-wallet-values">
              <div>
                <p className="dash-wallet-sublabel">Wallet Balance</p>
                <p className="dash-wallet-amount">12,450</p>
              </div>
              <div>
                <p className="dash-wallet-sublabel">Gem Points</p>
                <p className="dash-wallet-amount">8,320</p>
              </div>
            </div>
          </div>

          {/* Exchange: converts Gem Points into wallet balance -- also
              where top-up and withdraw live once those are built out. */}
          <button
            className="dash-exchange-btn"
            onClick={() => navigate("/exchange")}
          >
            <MdSwapHoriz size={18} color="var(--color-on-primary-container)" />
            <span>Exchange</span>
          </button>
        </div>

        {/* Quick stats */}
        <div className="dash-stats-row">
          <div className="dash-glass-card dash-stat-mini">
            <div className="dash-stat-mini-icon-wrap">
              <MdGroup size={20} color="var(--color-primary)" />
            </div>
            <div>
              <p className="dash-stat-mini-label">Direct Referrals</p>
              <p className="dash-stat-mini-value">24</p>
            </div>
          </div>
          <div className="dash-glass-card dash-stat-mini">
            <div className="dash-stat-mini-icon-wrap dash-stat-mini-icon-muted">
              <MdQrCode size={20} color="var(--color-secondary)" />
            </div>
            <div>
              <p className="dash-stat-mini-label">Purchase Codes</p>
              <p className="dash-stat-mini-value">05</p>
            </div>
          </div>
        </div>

        {/* Whole row navigates, not just the chevron -- Purchase Codes
            is where the referral link itself lives. */}
        <button
          className="dash-glass-card dash-referral-card"
          onClick={() => navigate("/purchase-codes")}
        >
          <div className="dash-referral-inner">
            <div className="dash-referral-icon-wrap">
              <MdCampaign size={20} color="var(--color-primary)" />
            </div>
            <div className="dash-referral-text">
              <p className="dash-referral-title">Referral Hub</p>
              <p className="dash-referral-sub">Earn 500 Gems per sign-up</p>
            </div>
          </div>
          <div className="dash-chevron-btn">
            <MdChevronRight size={22} color="var(--color-primary)" />
          </div>
        </button>

        {/* Gem value chart */}
        <GemValueChart onScrubbingChange={handleScrubbingChange} />

        <button
          className="dash-txlogs-btn"
          onClick={() => navigate("/purchase-codes")}
        >
          <MdReceiptLong size={18} color="var(--color-primary)" />
          <span>View Transaction Logs</span>
          <MdArrowForward size={18} color="var(--color-primary)" />
        </button>

        {/* Insights & Alerts */}
        <h2 className="dash-insights-title">Insights & Alerts</h2>
        <div className="dash-glass-card dash-insights-card">
          <div className="dash-insight-row">
            <MdErrorOutline
              size={22}
              color="var(--color-tertiary)"
              className="dash-insight-icon"
            />
            <div className="dash-insight-body">
              <p className="dash-insight-heading">Membership Renewal</p>
              <p className="dash-insight-text">
                Your Executive status expires in 12 days. Renew now for
                early-bird bonus.
              </p>
              <button className="dash-renew-btn">RENEW STATUS</button>
            </div>
          </div>

          <div className="dash-insight-row dash-insight-row-border">
            <MdTrendingUp
              size={22}
              color="var(--color-primary)"
              className="dash-insight-icon"
            />
            <div className="dash-insight-body">
              <p className="dash-insight-heading">Market Insight</p>
              <p className="dash-insight-text">
                Gem value increased by 0.4% in the last 24 hours. High network
                volume detected.
              </p>
            </div>
          </div>
        </div>

        {/* Guide image card */}
        <button className="dash-img-card">
          <img src={GUIDE_IMG} alt="" className="dash-img-card-image" />
          <div className="dash-img-card-gradient" />
          <div className="dash-img-text-wrap">
            <p className="dash-img-eyebrow">Gem Resource</p>
            <p className="dash-img-heading">Go Mine, Go Exchange, Go Earn</p>
          </div>
        </button>
      </div>
    </div>
  );
}
