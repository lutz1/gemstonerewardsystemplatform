import { Link } from "react-router-dom";
import "./TransactionHistoryPage.css";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";

const transactions = [
  {
    id: 1,
    icon: "person_add",
    iconFill: true,
    label: "Referral Bonus",
    sub: "User: ID_928374",
    date: "MAY 24, 2024",
    amount: "+ 500 GEMS",
    amountSub: "($25.00 USD)",
    positive: true,
    status: "Success",
  },
  {
    id: 2,
    icon: "shopping_bag",
    iconFill: false,
    label: "Code Purchase",
    sub: "Emerald Tier License",
    date: "MAY 22, 2024",
    amount: "- $500.00 USD",
    amountSub: "Payment via USDC",
    positive: false,
    status: "Completed",
  },
  {
    id: 3,
    icon: "savings",
    iconFill: true,
    label: "Staking Earnings",
    sub: "Pool #4 Reward Dist.",
    date: "MAY 20, 2024",
    amount: "+ 1,200 GEMS",
    amountSub: "($60.00 USD)",
    positive: true,
    status: "Success",
  },
  {
    id: 4,
    icon: "person_add",
    iconFill: true,
    label: "Referral Bonus",
    sub: "User: ID_104432",
    date: "MAY 15, 2024",
    amount: "+ 500 GEMS",
    amountSub: "($25.00 USD)",
    positive: true,
    status: "Success",
  },
];

const stats = [
  {
    key: "referral",
    icon: "trending_up",
    label: "Referral Bonuses",
    value: "+ 4,200 GEMS",
    caption: "↑ 12% from last month",
    captionClass: "th-stat-caption-primary",
  },
  {
    key: "purchase",
    icon: "account_balance_wallet",
    label: "Code Purchases",
    value: "- $1,500.00",
    caption: "3 Active License Blocks",
    captionClass: "th-stat-caption-muted",
  },
  {
    key: "staking",
    icon: "token",
    label: "Staking Earnings",
    value: "8,250 GEMS",
    caption: "Auto-compounding enabled",
    captionClass: "th-stat-caption-primary",
  },
];

export default function TransactionHistoryPage() {
  return (
    <div className="th-root">
      {/* ── Atmosphere glows ─────────────────────────────────── */}
      <div className="th-glow th-glow-tr" />
      <div className="th-glow th-glow-bl" />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar />

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="th-main">
        <div className="th-content">

          {/* Page header */}
          <div className="th-page-header">
            <div>
              <h2 className="th-page-title">Activity Ledger</h2>
              <p className="th-page-sub">
                Review your historical data, bonuses, and investments.
              </p>
            </div>
            <div className="th-header-actions">
              <button className="th-filter-btn">
                <span className="material-symbols-outlined">filter_list</span>
                Filter
              </button>
              <button className="th-export-btn">
                <span className="material-symbols-outlined">download</span>
                Export PDF
              </button>
            </div>
          </div>

          {/* Stats bento */}
          <div className="th-stats-grid">
            {stats.map((s) => (
              <div className="th-glass-panel th-stat-card" key={s.key}>
                <span className="material-symbols-outlined th-stat-bg-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {s.icon}
                </span>
                <span className="th-stat-label">{s.label}</span>
                <p className="th-stat-value">{s.value}</p>
                <p className={`th-stat-caption ${s.captionClass}`}>{s.caption}</p>
              </div>
            ))}
          </div>

          {/* Ledger table */}
          <div className="th-glass-panel th-table-wrap">
            <div className="th-table-scroll">
              <table className="th-table">
                <thead>
                  <tr className="th-thead-row">
                    <th className="th-th">Activity Type</th>
                    <th className="th-th">Date</th>
                    <th className="th-th">Amount</th>
                    <th className="th-th th-th-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr className="th-tbody-row" key={tx.id}>
                      <td className="th-td">
                        <div className="th-tx-member">
                          <div className={`th-tx-icon-wrap${tx.positive ? "" : " muted"}`}>
                            <span
                              className="material-symbols-outlined"
                              style={tx.iconFill
                                ? { fontVariationSettings: "'FILL' 1" }
                                : {}}
                            >
                              {tx.icon}
                            </span>
                          </div>
                          <div>
                            <p className="th-tx-label">{tx.label}</p>
                            <p className="th-tx-sub">{tx.sub}</p>
                          </div>
                        </div>
                      </td>
                      <td className="th-td th-td-date">{tx.date}</td>
                      <td className="th-td">
                        <p className={`th-tx-amount${tx.positive ? "" : " muted"}`}>
                          {tx.amount}
                        </p>
                        <p className="th-tx-amount-sub">{tx.amountSub}</p>
                      </td>
                      <td className="th-td th-td-right">
                        <span className="th-status-badge">{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="th-pagination">
              <span className="th-pagination-count">Showing 1 to 4 of 124 entries</span>
              <div className="th-pagination-buttons">
                <button className="th-page-btn" aria-label="Previous page">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="th-page-btn current">1</button>
                <button className="th-page-btn">2</button>
                <button className="th-page-btn">3</button>
                <button className="th-page-btn" aria-label="Next page">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="th-footer">
          <div className="th-footer-inner">
            <p className="th-footer-copy">© 2024 Gemstone Code. All rights reserved.</p>
            <div className="th-footer-links">
              <a className="th-footer-link" href="#">Privacy Policy</a>
              <a className="th-footer-link" href="#">Terms of Service</a>
              <a className="th-footer-link" href="#">Help Center</a>
            </div>
          </div>
        </footer>
      </main>
      <BottomNav activeItem="history" />
    </div>
  );
}