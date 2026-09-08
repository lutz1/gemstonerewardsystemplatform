import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import {
  MdAccountBalanceWallet,
  MdArrowForward,
  MdCampaign,
  MdChevronRight,
  MdContentCopy,
  MdDiamond,
  MdHub,
  MdPersonAdd,
  MdReceiptLong,
  MdSwapHoriz,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import guideImage from "../../assets/bg_belowdashboard.png";
import BottomNav from "../../components/BottomNavigationBar/BottomNav.jsx";
import GemValueChart from "../../components/GemValueChart/GemValueChart.jsx";
import TopBar from "../../components/TopBar/TopBar.jsx";
import { app } from "../../firebase";
import "./DashboardPage.css";

const GUIDE_IMG = guideImage;

function displayNumber(value) {
  return value == null ? "—" : Number(value).toLocaleString();
}

function displayPercent(value) {
  return value == null ? "—" : `${value}%`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [showInviteTooltip, setShowInviteTooltip] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);

  useEffect(() => {
    const getUserDashboard = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserDashboard",
    );

    getUserDashboard()
      .then(({ data }) => setDashboard(data || {}))
      .catch(() => setDashboardError("Unable to load your dashboard."));
  }, []);

  useEffect(() => {
    let hideTimeout;
    const interval = window.setInterval(() => {
      setShowInviteTooltip(true);
      window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => setShowInviteTooltip(false), 8000);
    }, 10000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  // Kept even though the web version has no ScrollView/gesture
  // conflict to resolve — GemValueChart still calls this while the
  // user drags across the chart, in case a scrollable wrapper is
  // added around this page later.
  const handleScrubbingChange = () => {};

  const handleCopyWalletAddress = async () => {
    if (!dashboard?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(dashboard.walletAddress);
      setWalletCopied(true);
      window.setTimeout(() => setWalletCopied(false), 1800);
    } catch {
      setWalletCopied(false);
    }
  };

  return (
    <div className="dash-root">
      <TopBar
        userName={dashboard?.name || "Member"}
        userRole="Member"
        showNotifDot={dashboard?.hasNotifications === true}
      />

      <div className="dash-content">
        {!dashboard ? (
          <p role={dashboardError ? "alert" : "status"}>
            {dashboardError || "Loading dashboard..."}
          </p>
        ) : (
          <>
        {/* Welcome */}
        <div className="dash-welcome">
          <p className="dash-eyebrow">Dashboard Overview</p>
          <h1 className="dash-hello">Hello, {dashboard.name || "Member"}</h1>
          <p className="dash-welcome-sub">
            Welcome back to your member portal. Your network expanded by{" "}
            <span className="dash-highlight">
              {displayPercent(dashboard.networkGrowthPercent)}
            </span>{" "}
            this week.
          </p>
        </div>

        {/* Wallet & Gem Points */}
        <div className="dash-wallet-card">
          {/* Decorative watermark, purely visual depth */}
          <MdDiamond className="dash-wallet-watermark" size={140} />

          <div className="dash-wallet-top">
            <div className="dash-wallet-heading">
              <div className="dash-wallet-icon-row">
                <div className="dash-wallet-icon-wrap">
                  <MdAccountBalanceWallet
                    size={18}
                    color="var(--color-primary)"
                  />
                </div>
                <div>
                  <span className="dash-wallet-label">Wallet & Gem Points</span>
                  <p className="dash-wallet-caption">Your available rewards</p>
                </div>
              </div>
              <span className="dash-wallet-status">Available</span>
            </div>
            <div className="dash-wallet-values">
              <div className="dash-wallet-value-cell">
                <p className="dash-wallet-sublabel">Wallet Balance</p>
                <p className="dash-wallet-amount">
                  {displayNumber(dashboard.walletBalance)}
                </p>
                <span className="dash-wallet-unit">Wallet credits</span>
              </div>
              <div className="dash-wallet-value-cell dash-wallet-value-cell-accent">
                <p className="dash-wallet-sublabel">Gem Points</p>
                <p className="dash-wallet-amount">
                  {displayNumber(dashboard.gemPoints)}
                </p>
                <span className="dash-wallet-unit">Reward points</span>
              </div>
            </div>
            <div className="dash-wallet-address-row">
              <div className="dash-wallet-address-copy">
                <span className="dash-wallet-address-label">Wallet address</span>
                <span
                  className="dash-wallet-address-value"
                  title={dashboard.walletAddress || "Wallet address unavailable"}
                >
                  {dashboard.walletAddress || "Wallet address unavailable"}
                </span>
              </div>
              <button
                type="button"
                className="dash-wallet-copy-btn"
                onClick={handleCopyWalletAddress}
                disabled={!dashboard.walletAddress}
                aria-label={walletCopied ? "Wallet address copied" : "Copy wallet address"}
                title={walletCopied ? "Copied" : "Copy wallet address"}
              >
                {walletCopied ? <span aria-hidden="true">✓</span> : <MdContentCopy size={16} />}
              </button>
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
            <MdArrowForward size={17} color="var(--color-on-primary-container)" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="dash-stats-row">
          <button
            type="button"
            className="dash-glass-card dash-stat-mini dash-direct-reward-card"
            onClick={() => navigate("/direct-referrals")}
            aria-describedby={showInviteTooltip ? "invite-tooltip" : undefined}
          >
            <div className="dash-stat-mini-icon-wrap">
              <MdPersonAdd size={20} color="var(--color-primary)" />
            </div>
            <div>
              <p className="dash-stat-mini-label">DIRECT GEM REWARD</p>
              <p className="dash-stat-mini-value">
                {displayNumber(dashboard.directReferrals)}
              </p>
            </div>
            {showInviteTooltip && (
              <span className="dash-invite-tooltip" id="invite-tooltip" role="status">
                Click Me! to see your Invites.
              </span>
            )}
          </button>
          <button
            type="button"
            className="dash-glass-card dash-stat-mini dash-network-reward-card"
            onClick={() => navigate("/network-referrals")}
          >
            <div className="dash-stat-mini-icon-wrap dash-stat-mini-icon-muted">
              <MdHub size={20} color="var(--color-secondary)" />
            </div>
            <div>
              <p className="dash-stat-mini-label">NETWORK</p>
              <p className="dash-stat-mini-value">
                {displayNumber(dashboard.networkReferrals)}
              </p>
            </div>
          </button>
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
              <p className="dash-referral-title">Invite Friends</p>
              <p className="dash-referral-sub">Earn Gems if your friends sign up and purchase</p>
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

        {/* Transaction summary */}
        <h2 className="dash-insights-title">Transaction Logs Summary</h2>
        <div className="dash-glass-card dash-insights-card">
          {dashboard.recentTransactions?.length ? (
            dashboard.recentTransactions.map((transaction) => (
              <div className="dash-insight-row" key={transaction.id}>
                <MdReceiptLong
                  size={22}
                  color="var(--color-primary)"
                  className="dash-insight-icon"
                />
                <div className="dash-insight-body">
                  <p className="dash-insight-heading">{transaction.label}</p>
                  <p className="dash-insight-text">
                    {transaction.detail} · {formatDate(transaction.createdAt)}
                  </p>
                </div>
                <strong className="dash-transaction-amount">
                  {displayNumber(transaction.amount)}
                </strong>
              </div>
            ))
          ) : (
            <p className="dash-insight-empty">No transactions yet.</p>
          )}
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
          </>
        )}
      </div>
      <BottomNav activeItem="dashboard" />
    </div>
  );
}
