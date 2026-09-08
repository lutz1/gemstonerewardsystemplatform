import { signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { app, auth } from "../../firebase";
import "./ProfilePage.css";

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

function formatDate(value) {
  if (!value) return "—";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatTier(value) {
  if (!value) return "Member";
  const tier = String(value)
    .replace(/\s+tier$/i, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `${tier} Tier`;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function buildProfile(data, currentUser) {
  const name =
    data.name ||
    [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ") ||
    currentUser.displayName ||
    currentUser.email ||
    "Member";

  return {
    name,
    handle: data.username ? `@${data.username}` : "—",
    email: data.email || currentUser.email || "—",
    phone: data.phone || "—",
    location: data.address || "—",
    memberSince: formatDate(data.joinDate || data.createdAt),
    tier: formatTier(data.tier || data.membershipTier || data.role),
    initials: getInitials(name),
    currentTier: data.tier || data.membershipTier || data.role || "Member",
    nextTier: data.nextTier || "—",
    gemsToNext: data.gemsToNext,
    progressPercent: Number(data.tierProgress ?? data.progressPercent ?? 0),
    stats: [
      { key: "codes", icon: "token", label: "Codes Purchased", value: data.codesPurchased ?? data.totalCodes ?? "—" },
      { key: "referrals", icon: "diversity_3", label: "Active Referrals", value: data.activeReferrals ?? data.referrals ?? "—" },
      { key: "gems", icon: "diamond", label: "GEMS Balance", value: data.gemPoints ?? data.gemsBalance ?? data.gemBalance ?? data.gems ?? "—" },
      { key: "age", icon: "calendar_month", label: "Member Since", value: formatDate(data.joinDate || data.createdAt) },
    ],
  };
}

export default function ProfilePage() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfileError("Unable to load your profile.");
      return undefined;
    }

    let isMounted = true;
    const getUserProfile = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserProfile",
    );

    getUserProfile()
      .then(({ data }) => {
        if (!isMounted) return;
        if (!data) {
          setProfileError("Your profile could not be found.");
          return;
        }
        setProfile(buildProfile(data, currentUser));
      })
      .catch(() => {
        if (isMounted) setProfileError("Unable to load your profile.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (!profile) {
    return (
      <div className="prof-root">
        <TopBar userName="Member" userRole="Member" />
        <main className="prof-main">
          <div className="prof-content">
            <p role={profileError ? "alert" : "status"}>
              {profileError || "Loading profile..."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="prof-root">
      {/* ── Atmosphere glows ─────────────────────────────────── */}
      <div className="prof-glow prof-glow-tr" />
      <div className="prof-glow prof-glow-bl" />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar userName={profile.name} userRole={profile.tier} />

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

          {/* ── Tier progress ──────────────────────────────── */}
          <section className="prof-glass-panel prof-progress-card">
            <div className="prof-progress-top">
              <div>
                <p className="prof-progress-label">Tier Progress</p>
                <p className="prof-progress-title">
                  {profile.currentTier}{" "}
                  <span className="material-symbols-outlined prof-progress-arrow">
                    arrow_forward
                  </span>{" "}
                  {profile.nextTier}
                </p>
              </div>
              <p className="prof-progress-remaining">
                <span className="material-symbols-outlined prof-progress-diamond">
                  diamond
                </span>
                {profile.gemsToNext == null
                  ? "—"
                  : `${Number(profile.gemsToNext).toLocaleString()} GEMS to go`}
              </p>
            </div>
            <div className="prof-progress-track">
              <div
                className="prof-progress-fill"
                style={{ width: `${profile.progressPercent}%` }}
              />
            </div>
            <p className="prof-progress-caption">
              Reach {profile.nextTier} to unlock priority code drops and
              higher batch limits.
            </p>
          </section>

          {/* ── Quick stats ────────────────────────────────── */}
          <section className="prof-stats-grid">
              {profile.stats.map((s) => (
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
