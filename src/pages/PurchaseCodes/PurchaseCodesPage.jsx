import { useState } from "react";
import "./PurchaseCodesPage.css";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { getTransactions } from "../../utils/TransactionsData";

const codes = [
  {
    id: "#GSC-9921-XLP",
    tier: "Platinum Tier",
    tierColor: "platinum",
    date: "Oct 24, 2024",
    status: "active",
  },
  {
    id: "#GSC-8842-EXC",
    tier: "Executive Tier",
    tierColor: "primary",
    date: "Oct 20, 2024",
    status: "active",
  },
  {
    id: "#GSC-7712-STD",
    tier: "Standard Tier",
    tierColor: "muted",
    date: "Oct 15, 2024",
    status: "used",
  },
  {
    id: "#GSC-6650-EXC",
    tier: "Executive Tier",
    tierColor: "primary",
    date: "Oct 12, 2024",
    status: "active",
  },
];

const ledgerStats = [
  {
    key: "referral",
    icon: "trending_up",
    label: "Referral Bonuses",
    value: "+ 4,200 GEMS",
    caption: "↑ 12% from last month",
    captionClass: "pcl-stat-caption-primary",
  },
  {
    key: "purchase",
    icon: "account_balance_wallet",
    label: "Code Purchases",
    value: "- $1,500.00",
    caption: "3 Active License Blocks",
    captionClass: "pcl-stat-caption-muted",
  },
  {
    key: "staking",
    icon: "token",
    label: "Staking Earnings",
    value: "8,250 GEMS",
    caption: "Auto-compounding enabled",
    captionClass: "pcl-stat-caption-primary",
  },
];

export default function PurchaseCodesPage() {
  const [search, setSearch] = useState("");
  const [transactions] = useState(() => getTransactions());

  const filtered = codes.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.tier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pc-root">
      {/* ── Atmosphere glows ─────────────────────────────────── */}
      <div className="pc-glow pc-glow-tr" />
      <div className="pc-glow pc-glow-bl" />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar />

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="pc-main">
        <div className="pc-content">

          {/* ── Hero bento ─────────────────────────────────── */}
          <section className="pc-hero-grid">

            {/* Balance / header card */}
            <div className="pc-glass-panel pc-balance-card">
              <div>
                <h2 className="pc-balance-title">Available Codes</h2>
                <p className="pc-balance-sub">
                  Manage and generate your networking access keys.
                </p>
              </div>
              <div className="pc-balance-bottom">
                <div className="pc-balance-gems">
                  <span className="pc-gems-label">Current Wallet Balance</span>
                  <div className="pc-gems-row">
                    <span
                      className="material-symbols-outlined pc-diamond-icon"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      diamond
                    </span>
                    <span className="pc-gems-value">42,850</span>
                  </div>
                </div>
                <button className="pc-generate-btn">
                  <span className="material-symbols-outlined">add_circle</span>
                  Purchased Codes
                </button>
              </div>
            </div>

            {/* Quick stats column */}
            <div className="pc-quick-stats">
              <div className="pc-glass-panel pc-stat-mini">
                <div className="pc-stat-mini-icon primary">
                  <span className="material-symbols-outlined">token</span>
                </div>
                <div>
                  <p className="pc-stat-mini-label">Active Codes</p>
                  <p className="pc-stat-mini-value">12</p>
                </div>
              </div>
              <div className="pc-glass-panel pc-stat-mini">
                <div className="pc-stat-mini-icon muted">
                  <span className="material-symbols-outlined">history</span>
                </div>
                <div>
                  <p className="pc-stat-mini-label">Total Used</p>
                  <p className="pc-stat-mini-value">156</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Code batches table ──────────────────────────── */}
          <section className="pc-glass-panel pc-table-section">

            {/* Table toolbar */}
            <div className="pc-table-toolbar">
              <h3 className="pc-table-title">Purchased Code Batches</h3>
              <div className="pc-toolbar-right">
                <div className="pc-search-wrap">
                  <span className="material-symbols-outlined pc-search-icon">search</span>
                  <input
                    type="text"
                    placeholder="Search ID..."
                    className="pc-search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="pc-filter-btn" aria-label="Filter">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="pc-table-scroll">
              <table className="pc-table">
                <thead>
                  <tr className="pc-thead-row">
                    <th className="pc-th">Code ID</th>
                    <th className="pc-th">Tier Name</th>
                    <th className="pc-th">Purchase Date</th>
                    <th className="pc-th">Status</th>
                    <th className="pc-th pc-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((code) => (
                    <tr
                      key={code.id}
                      className={`pc-tbody-row${code.status === "used" ? " used" : ""}`}
                    >
                      <td className="pc-td pc-td-id">{code.id}</td>

                      <td className="pc-td">
                        <div className="pc-tier-cell">
                          <span className={`pc-tier-dot ${code.tierColor}`} />
                          <span className="pc-tier-name">{code.tier}</span>
                        </div>
                      </td>

                      <td className="pc-td pc-td-date">{code.date}</td>

                      <td className="pc-td">
                        <span className={`pc-status-badge${code.status === "used" ? " used" : ""}`}>
                          {code.status === "used" ? "Used" : "Active"}
                        </span>
                      </td>

                      <td className="pc-td pc-td-right">
                        {code.status === "active" ? (
                          <button className="pc-action-btn" aria-label="Copy code">
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                        ) : (
                          <span className="pc-action-done" aria-label="Already used">
                            <span className="material-symbols-outlined">check_circle</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pc-pagination">
              <span className="pc-pagination-count">Showing 4 of 24 batches</span>
              <div className="pc-pagination-buttons">
                <button className="pc-page-btn" disabled>Previous</button>
                <button className="pc-page-btn active">Next Page</button>
              </div>
            </div>
          </section>

          {/* ── Activity ledger (merged from Transaction History) ── */}
          <section className="pcl-section">

            <div className="pcl-section-header">
              <div>
                <h3 className="pcl-section-title">Activity Ledger</h3>
                <p className="pcl-section-sub">
                  Review your historical data, bonuses, and investments.
                </p>
              </div>
              <div className="pcl-header-actions">
                <button className="pcl-filter-btn">
                  <span className="material-symbols-outlined">filter_list</span>
                  Filter
                </button>
                <button className="pcl-export-btn">
                  <span className="material-symbols-outlined">download</span>
                  Export PDF
                </button>
              </div>
            </div>

            {/* Stats bento */}
            <div className="pcl-stats-grid">
              {ledgerStats.map((s) => (
                <div className="pc-glass-panel pcl-stat-card" key={s.key}>
                  <span className="material-symbols-outlined pcl-stat-bg-icon"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {s.icon}
                  </span>
                  <span className="pcl-stat-label">{s.label}</span>
                  <p className="pcl-stat-value">{s.value}</p>
                  <p className={`pcl-stat-caption ${s.captionClass}`}>{s.caption}</p>
                </div>
              ))}
            </div>

            {/* Ledger table */}
            <div className="pc-glass-panel pcl-table-wrap">
              <div className="pcl-table-scroll">
                <table className="pcl-table">
                  <thead>
                    <tr className="pcl-thead-row">
                      <th className="pcl-th">Activity Type</th>
                      <th className="pcl-th">Date</th>
                      <th className="pcl-th">Amount</th>
                      <th className="pcl-th pcl-th-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 && (
                      <tr className="pcl-tbody-row">
                        <td className="pcl-td pcl-empty-row" colSpan={4}>
                          No transactions yet — completed purchases will show up here.
                        </td>
                      </tr>
                    )}
                    {transactions.map((tx) => (
                      <tr className="pcl-tbody-row" key={tx.id}>
                        <td className="pcl-td">
                          <div className="pcl-tx-member">
                            <div className={`pcl-tx-icon-wrap${tx.positive ? "" : " muted"}`}>
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
                              <p className="pcl-tx-label">{tx.label}</p>
                              <p className="pcl-tx-sub">{tx.sub}</p>
                            </div>
                          </div>
                        </td>
                        <td className="pcl-td pcl-td-date">{tx.date}</td>
                        <td className="pcl-td">
                          <p className={`pcl-tx-amount${tx.positive ? "" : " muted"}`}>
                            {tx.amount}
                          </p>
                          <p className="pcl-tx-amount-sub">{tx.amountSub}</p>
                        </td>
                        <td className="pcl-td pcl-td-right">
                          <span className="pcl-status-badge">{tx.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list — replaces the table below 640px so nothing
                  gets clipped or needs horizontal scrolling on a phone */}
              <div className="pcl-tx-list">
                {transactions.length === 0 && (
                  <p className="pcl-empty-row">
                    No transactions yet — completed purchases will show up here.
                  </p>
                )}
                {transactions.map((tx) => (
                  <div className="pcl-tx-card" key={tx.id}>
                    <div className="pcl-tx-card-top">
                      <div className={`pcl-tx-icon-wrap${tx.positive ? "" : " muted"}`}>
                        <span
                          className="material-symbols-outlined"
                          style={tx.iconFill
                            ? { fontVariationSettings: "'FILL' 1" }
                            : {}}
                        >
                          {tx.icon}
                        </span>
                      </div>
                      <div className="pcl-tx-card-info">
                        <p className="pcl-tx-label">{tx.label}</p>
                        <p className="pcl-tx-sub">{tx.sub}</p>
                      </div>
                      <div className="pcl-tx-card-amount">
                        <p className={`pcl-tx-amount${tx.positive ? "" : " muted"}`}>
                          {tx.amount}
                        </p>
                        <p className="pcl-tx-amount-sub">{tx.amountSub}</p>
                      </div>
                    </div>
                    <div className="pcl-tx-card-bottom">
                      <span className="pcl-tx-card-date">{tx.date}</span>
                      <span className="pcl-status-badge">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="pcl-pagination">
                <span className="pcl-pagination-count">
                  {transactions.length === 0
                    ? "No entries yet"
                    : `Showing 1 to ${transactions.length} of ${transactions.length} entries`}
                </span>
                <div className="pcl-pagination-buttons">
                  <button className="pcl-page-btn" aria-label="Previous page">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button className="pcl-page-btn current">1</button>
                  <button className="pcl-page-btn">2</button>
                  <button className="pcl-page-btn">3</button>
                  <button className="pcl-page-btn" aria-label="Next page">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="pc-footer">
          <div className="pc-footer-inner">
            <p className="pc-footer-copy">© 2024 Gemstone Code. All rights reserved.</p>
            <div className="pc-footer-links">
              <a className="pc-footer-link" href="#">Privacy Policy</a>
              <a className="pc-footer-link" href="#">Terms of Service</a>
              <a className="pc-footer-link" href="#">Help Center</a>
            </div>
          </div>
        </footer>
      </main>
      <BottomNav activeItem="codes" />
    </div>
  );
}