import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { auth } from "../../firebase";
import "./ProfilePage.css";

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

const profileStats = [
  { key: "codes", icon: "token", label: "Codes Purchased", value: "168" },
  {
    key: "referrals",
    icon: "diversity_3",
    label: "Active Referrals",
    value: "9",
  },
  { key: "gems", icon: "diamond", label: "GEMS Balance", value: "42,850" },
  {
    key: "age",
    icon: "calendar_month",
    label: "Member Since",
    value: profile.memberSince,
  },
];

export default function ProfilePage() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!showLogoutModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoggingOut) {
        setShowLogoutModal(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLoggingOut, showLogoutModal]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      window.location.assign("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

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
                </div>
                <p className="prof-handle">
                  @{username || profile.handle.replace(/^@/, "")}
                </p>
                <p className="prof-meta">
                  <span className="material-symbols-outlined prof-meta-icon">
                    mail
                  </span>
                  {profile.email}
                </p>
              </div>
            </div>
            <button
              className="prof-edit-btn"
              type="button"
              onClick={() => navigate("/edit-profile")}
            >
              <span className="material-symbols-outlined">edit</span>
              Edit Profile
            </button>
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
              <p className="prof-panel-sub">
                Keep your contact information current.
              </p>
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
              <p className="prof-panel-sub">
                Manage how you sign in and stay protected.
              </p>
            </div>
            <div className="prof-security-row">
              <div className="prof-security-icon">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div className="prof-security-info">
                <p className="prof-security-label">Password</p>
                <p className="prof-security-caption">
                  Last changed 3 months ago
                </p>
              </div>
              <button
                className="prof-outline-btn"
                type="button"
                onClick={() => navigate("/change-password")}
              >
                Change
              </button>
            </div>
            <div className="prof-security-row">
              <div className="prof-security-icon">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <div className="prof-security-info">
                <p className="prof-security-label">TIN Code</p>
                <p className="prof-security-caption">•••-•••-789</p>
              </div>
              <button
                className="prof-outline-btn"
                type="button"
                onClick={() => navigate("/change-tin")}
              >
                Change
              </button>
            </div>
          </section>

          {/* ── Danger zone ─────────────────────────────────── */}
          <section className="prof-glass-panel prof-danger-panel">
            <div>
              <p className="prof-danger-title">Sign out of Gemstone Code</p>
              <p className="prof-danger-caption">
                You can always sign back in with your credentials.
              </p>
            </div>
            <button
              className="prof-signout-btn"
              type="button"
              onClick={() => setShowLogoutModal(true)}
            >
              <span className="material-symbols-outlined">logout</span>
              Log Out
            </button>
          </section>
        </div>

        {/* Footer */}
        <footer className="prof-footer">
          <div className="prof-footer-inner">
            <p className="prof-footer-copy">
              © 2024 Gemstone Code. All rights reserved.
            </p>
            <div className="prof-footer-links">
              <a className="prof-footer-link" href="#">
                Privacy Policy
              </a>
              <a className="prof-footer-link" href="#">
                Terms of Service
              </a>
              <a className="prof-footer-link" href="#">
                Help Center
              </a>
            </div>
          </div>
        </footer>
      </main>
      <BottomNav activeItem="profile" />

      {showLogoutModal && (
        <div
          className="prof-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isLoggingOut) {
              setShowLogoutModal(false);
            }
          }}
        >
          <section
            className="prof-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <div className="prof-modal-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                logout
              </span>
            </div>
            <h2 id="logout-modal-title" className="prof-modal-title">
              Log out?
            </h2>
            <p className="prof-modal-copy">
              Are you sure you want to log out of Gemstone Code?
            </p>
            <div className="prof-modal-actions">
              <button
                className="prof-modal-cancel"
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="prof-modal-confirm"
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
