import { useState } from "react";
import { Link } from "react-router-dom";
import "./DirectReferralsPage.css";
import MenuDrawer from "../../components/MenuDrawer/MenuDrawer";

const AVATAR_URL =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80";

// Placeholder avatars — swap for real member photos before production
const referrals = [
  {
    id: 1,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80",
    name: "Eleanor Vance",
    title: "Lead Architect @ Innova",
    date: "Oct 24, 2023",
    status: "active",
    commission: "$1,200.00",
  },
  {
    id: 2,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80",
    name: "Julian Thorne",
    title: "VP Engineering",
    date: "Nov 12, 2023",
    status: "pending",
    commission: "$0.00",
  },
  {
    id: 3,
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80",
    name: "Arthur Pendragon",
    title: "Senior Portfolio Manager",
    date: "Sep 05, 2023",
    status: "active",
    commission: "$2,850.00",
  },
  {
    id: 4,
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=80&q=80",
    name: "Sienna Brooks",
    title: "Operations Director",
    date: "Aug 30, 2023",
    status: "active",
    commission: "$950.00",
  },
];

export default function DirectReferralsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="dr-root">
      {/* ── Top App Bar ──────────────────────────────────────── */}
      <header className="dr-topbar">
        <div className="dr-topbar-inner">
          <div className="dr-topbar-left">
            <button
              className="dr-hamburger"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="dr-logo">Gemstone Code</span>
          </div>

          <div className="dr-topbar-right">
            <div className="dr-user-info">
              <p className="dr-user-role">Executive Member</p>
              <p className="dr-user-name">Alex Sterling</p>
            </div>
            <button className="dr-notif-btn" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="dr-topbar-avatar">
              <img src={AVATAR_URL} alt="Alex Sterling" />
            </div>
          </div>
        </div>
      </header>

      <div className="dr-shell">
        {/* ── Slide-out drawer (MenuDrawer in default "drawer" mode) ──
            Opens via the hamburger button above, works at every
            screen size, independent of the always-visible rail below. */}
        <MenuDrawer
          variant="drawer"
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeItem="referrals"
          avatarUrl={AVATAR_URL}
          userName="Executive Member"
          userRole="Gemstone Tier"
        />

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="dr-main">
          <div className="dr-content">

            {/* Page header */}
            <div className="dr-page-header">
              <div>
                <h2 className="dr-page-title">Direct Referrals</h2>
                <p className="dr-page-sub">
                  Monitor your growing network and track commissions from your elite professional connections.
                </p>
              </div>
              <button className="dr-invite-btn">
                <span className="material-symbols-outlined">share</span>
                <span>Invite Referral</span>
              </button>
            </div>

            {/* Redeem referral box */}
            <div className="dr-glass-panel dr-redeem-box">
              <label className="dr-redeem-label">Redeem Referral</label>
              <div className="dr-redeem-row">
                <div className="dr-redeem-input-wrap">
                  <span className="material-symbols-outlined">link</span>
                  <input
                    type="text"
                    placeholder="Paste referral code or link"
                    className="dr-redeem-input"
                  />
                </div>
                <button className="dr-redeem-submit">Submit</button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="dr-stats-grid">
              <div className="dr-glass-panel dr-stat-card">
                <span className="material-symbols-outlined dr-stat-bg-icon">groups</span>
                <span className="dr-stat-label">Total Referrals</span>
                <div className="dr-stat-value-row">
                  <span className="dr-stat-value">124</span>
                  <span className="dr-stat-caption">+12 this month</span>
                </div>
              </div>

              <div className="dr-glass-panel dr-stat-card">
                <span className="material-symbols-outlined dr-stat-bg-icon">pending_actions</span>
                <span className="dr-stat-label">Pending Approval</span>
                <div className="dr-stat-value-row">
                  <span className="dr-stat-value muted-color">08</span>
                  <span className="dr-stat-caption tertiary">Verification in progress</span>
                </div>
              </div>

              <div className="dr-glass-panel dr-stat-card highlight">
                <span className="material-symbols-outlined dr-stat-bg-icon">payments</span>
                <span className="dr-stat-label">Total Commission</span>
                <div className="dr-stat-value-col">
                  <span className="dr-stat-value">$12,450.00</span>
                  <span className="dr-stat-caption">Available for withdrawal</span>
                </div>
              </div>
            </div>

            {/* Network directory */}
            <section>
              <div className="dr-section-header">
                <h3 className="dr-section-title">Network Directory</h3>
                <div className="dr-search-box">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    type="text"
                    placeholder="Search members..."
                    className="dr-search-input"
                  />
                </div>
              </div>

              <div className="dr-list-header">
                <div>Member Name</div>
                <div>Join Date</div>
                <div>Status</div>
                <div className="dr-list-header-right">Commission</div>
                <div />
              </div>

              <div className="dr-list">
                {referrals.map((r) => (
                  <div className="dr-glass-panel dr-row" key={r.id}>
                    <div className="dr-row-member">
                      <div className="dr-row-avatar">
                        <img src={r.avatar} alt={r.name} />
                      </div>
                      <div>
                        <p className="dr-row-name">{r.name}</p>
                        <p className="dr-row-title">{r.title}</p>
                      </div>
                    </div>

                    <div className="dr-row-date">{r.date}</div>

                    <div>
                      <span className={`dr-status-badge${r.status === "pending" ? " pending" : ""}`}>
                        {r.status === "pending" ? "Pending" : "Active"}
                      </span>
                    </div>

                    <div className={`dr-row-commission${r.commission === "$0.00" ? " zero" : ""}`}>
                      {r.commission}
                    </div>

                    <div className="dr-row-more">
                      <button className="dr-more-btn" aria-label="More options">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="dr-pagination">
                <span className="dr-pagination-count">Showing 1 to 4 of 124 referrals</span>
                <div className="dr-pagination-buttons">
                  <button className="dr-page-btn" aria-label="Previous page">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button className="dr-page-btn current">1</button>
                  <button className="dr-page-btn">2</button>
                  <button className="dr-page-btn">3</button>
                  <button className="dr-page-btn" aria-label="Next page">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="dr-footer">
            <div className="dr-footer-inner">
              <p className="dr-footer-copy">© 2024 Gemstone Code. All rights reserved.</p>
              <div className="dr-footer-links">
                <a className="dr-footer-link" href="#">Privacy Policy</a>
                <a className="dr-footer-link" href="#">Terms of Service</a>
                <a className="dr-footer-link" href="#">Help Center</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}