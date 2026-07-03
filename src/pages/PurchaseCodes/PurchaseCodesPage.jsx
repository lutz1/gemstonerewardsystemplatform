import { useState } from "react";
import "./PurchaseCodesPage.css";
import MenuDrawer from "../../components/MenuDrawer/MenuDrawer";

const AVATAR_URL =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80";

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

export default function PurchaseCodesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

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
      <header className="pc-topbar">
        <div className="pc-topbar-inner">
          <div className="pc-topbar-left">
            <button
              className="pc-hamburger"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="pc-logo">Gemstone Code</span>
          </div>

          <div className="pc-topbar-right">
            <div className="pc-user-info">
              <p className="pc-user-role">Executive Member</p>
              <p className="pc-user-name">Alex Sterling</p>
            </div>
            <button className="pc-notif-btn" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="pc-topbar-avatar">
              <img src={AVATAR_URL} alt="Alex Sterling" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Menu Drawer ──────────────────────────────────────── */}
      <MenuDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeItem="codes"
      />

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
                  <span className="pc-gems-label">Current Gems Balance</span>
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
                  Generate New Code
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
    </div>
  );
}