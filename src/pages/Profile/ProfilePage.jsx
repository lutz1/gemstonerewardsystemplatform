import { useState } from "react";
import "./ProfilePage.css";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";

const profile = {
  name: "Alexis Rivera",
  handle: "@arivera",
  email: "alexis.rivera@example.com",
  phone: "+1 (555) 214-7788",
  location: "Austin, TX",
  memberSince: "Mar 2022",
  tier: "Executive Tier",
  initials: "AR",
};

const tierProgress = {
  current: "Executive",
  next: "Platinum",
  gemsToNext: 7150,
  percent: 68,
};

const profileStats = [
  { key: "codes", icon: "token", label: "Codes Purchased", value: "168" },
  { key: "referrals", icon: "diversity_3", label: "Active Referrals", value: "9" },
  { key: "gems", icon: "diamond", label: "GEMS Balance", value: "42,850" },
  { key: "age", icon: "calendar_month", label: "Member Since", value: profile.memberSince },
];

const preferenceToggles = [
  {
    key: "email-updates",
    label: "Email notifications",
    caption: "Purchase receipts, code activity, and balance alerts.",
    defaultOn: true,
  },
  {
    key: "marketing",
    label: "Product announcements",
    caption: "New tiers, packages, and feature releases.",
    defaultOn: false,
  },
  {
    key: "security-alerts",
    label: "Security alerts",
    caption: "Sign-ins from new devices or locations.",
    defaultOn: true,
  },
];

function ToggleRow({ label, caption, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="prof-toggle-row">
      <div>
        <p className="prof-toggle-label">{label}</p>
        <p className="prof-toggle-caption">{caption}</p>
      </div>
      <button
        className={`prof-switch${on ? " on" : ""}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
      >
        <span className="prof-switch-knob" />
      </button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="prof-root">
      {/* ── Atmosphere glows ─────────────────────────────────── */}
      <div className="prof-glow prof-glow-tr" />
      <div className="prof-glow prof-glow-bl" />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar />

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="prof-main">
        <div className="prof-content">

          {/* ── Identity hero ──────────────────────────────── */}
          <section className="prof-glass-panel prof-hero">
            <div className="prof-hero-identity">
              <div className="prof-avatar">{profile.initials}</div>
              <div>
                <div className="prof-name-row">
                  <h2 className="prof-name">{profile.name}</h2>
                  <span className="prof-tier-badge">{profile.tier}</span>
                </div>
                <p className="prof-handle">{profile.handle}</p>
                <p className="prof-meta">
                  <span className="material-symbols-outlined prof-meta-icon">mail</span>
                  {profile.email}
                </p>
              </div>
            </div>
            <button className="prof-edit-btn">
              <span className="material-symbols-outlined">edit</span>
              Edit Profile
            </button>
          </section>

          {/* ── Tier progress ──────────────────────────────── */}
          <section className="prof-glass-panel prof-progress-card">
            <div className="prof-progress-top">
              <div>
                <p className="prof-progress-label">Tier Progress</p>
                <p className="prof-progress-title">
                  {tierProgress.current} <span className="material-symbols-outlined prof-progress-arrow">arrow_forward</span> {tierProgress.next}
                </p>
              </div>
              <p className="prof-progress-remaining">
                <span className="material-symbols-outlined prof-progress-diamond">diamond</span>
                {tierProgress.gemsToNext.toLocaleString()} GEMS to go
              </p>
            </div>
            <div className="prof-progress-track">
              <div
                className="prof-progress-fill"
                style={{ width: `${tierProgress.percent}%` }}
              />
            </div>
            <p className="prof-progress-caption">
              Reach {tierProgress.next} Tier to unlock priority code drops and higher batch limits.
            </p>
          </section>

          {/* ── Quick stats ────────────────────────────────── */}
          <section className="prof-stats-grid">
            {profileStats.map((s) => (
              <div className="prof-glass-panel prof-stat-card" key={s.key}>
                <div className="prof-stat-icon">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <div>
                  <p className="prof-stat-label">{s.label}</p>
                  <p className="prof-stat-value">{s.value}</p>
                </div>
              </div>
            ))}
          </section>

          {/* ── Account details ────────────────────────────── */}
          <section className="prof-glass-panel prof-panel">
            <div className="prof-panel-header">
              <h3 className="prof-panel-title">Account Details</h3>
              <p className="prof-panel-sub">Keep your contact information current.</p>
            </div>
            <div className="prof-field-grid">
              <div className="prof-field">
                <label className="prof-field-label">Full Name</label>
                <div className="prof-field-value">{profile.name}</div>
              </div>
              <div className="prof-field">
                <label className="prof-field-label">Email Address</label>
                <div className="prof-field-value">{profile.email}</div>
              </div>
              <div className="prof-field">
                <label className="prof-field-label">Phone Number</label>
                <div className="prof-field-value">{profile.phone}</div>
              </div>
              <div className="prof-field">
                <label className="prof-field-label">Location</label>
                <div className="prof-field-value">{profile.location}</div>
              </div>
            </div>
          </section>

          {/* ── Security ────────────────────────────────────── */}
          <section className="prof-glass-panel prof-panel">
            <div className="prof-panel-header">
              <h3 className="prof-panel-title">Security</h3>
              <p className="prof-panel-sub">Manage how you sign in and stay protected.</p>
            </div>
            <div className="prof-security-row">
              <div className="prof-security-icon">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div className="prof-security-info">
                <p className="prof-security-label">Password</p>
                <p className="prof-security-caption">Last changed 3 months ago</p>
              </div>
              <button className="prof-outline-btn">Change</button>
            </div>
            <div className="prof-security-row">
              <div className="prof-security-icon">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div className="prof-security-info">
                <p className="prof-security-label">Two-Factor Authentication</p>
                <p className="prof-security-caption">Adds an extra step when signing in</p>
              </div>
              <span className="prof-status-pill enabled">Enabled</span>
            </div>
          </section>

          {/* ── Preferences ─────────────────────────────────── */}
          <section className="prof-glass-panel prof-panel">
            <div className="prof-panel-header">
              <h3 className="prof-panel-title">Notification Preferences</h3>
              <p className="prof-panel-sub">Choose what you hear from us, and how.</p>
            </div>
            <div className="prof-toggle-list">
              {preferenceToggles.map((t) => (
                <ToggleRow key={t.key} {...t} />
              ))}
            </div>
          </section>

          {/* ── Danger zone ─────────────────────────────────── */}
          <section className="prof-glass-panel prof-danger-panel">
            <div>
              <p className="prof-danger-title">Sign out of Gemstone Code</p>
              <p className="prof-danger-caption">You can always sign back in with your credentials.</p>
            </div>
            <button className="prof-signout-btn">
              <span className="material-symbols-outlined">logout</span>
              Log Out
            </button>
          </section>

        </div>

        {/* Footer */}
        <footer className="prof-footer">
          <div className="prof-footer-inner">
            <p className="prof-footer-copy">© 2024 Gemstone Code. All rights reserved.</p>
            <div className="prof-footer-links">
              <a className="prof-footer-link" href="#">Privacy Policy</a>
              <a className="prof-footer-link" href="#">Terms of Service</a>
              <a className="prof-footer-link" href="#">Help Center</a>
            </div>
          </div>
        </footer>
      </main>
      <BottomNav activeItem="profile" />
    </div>
  );
}