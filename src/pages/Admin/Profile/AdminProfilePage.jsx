import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { useState } from "react";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import { auth } from "../../../firebase";
import "./AdminProfilePage.css";

const adminProfile = {
  name: "Admin",
  handle: "@administrator",
  email: "admin@gemstonecode.com",
  role: "Platform Administrator",
  memberSince: "Aug 2024",
  initials: "AD",
};

const adminStats = [
  { key: "users", icon: "group", label: "Total Users", value: "5" },
  { key: "active", icon: "verified_user", label: "Active Users", value: "4" },
  { key: "codes", icon: "token", label: "Codes Managed", value: "341" },
  {
    key: "access",
    icon: "admin_panel_settings",
    label: "Access Level",
    value: "Full",
  },
];

function ToggleRow({ label, caption, defaultOn }) {
  const [on, setOn] = useState(defaultOn);

  return (
    <div className="admin-profile-toggle-row">
      <div>
        <p className="admin-profile-toggle-label">{label}</p>
        <p className="admin-profile-toggle-caption">{caption}</p>
      </div>
      <button
        className={`admin-profile-switch${on ? " on" : ""}`}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((currentValue) => !currentValue)}
      >
        <span />
      </button>
    </div>
  );
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(adminProfile);
  const [editProfile, setEditProfile] = useState(adminProfile);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);

  const openProfileEditor = () => {
    setEditProfile(profile);
    setProfileSaved(false);
    setIsEditProfileOpen(true);
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const name = editProfile.name.trim();
    const email = editProfile.email.trim();
    if (!name || !email) return;

    setProfile({
      ...profile,
      name,
      email,
      initials: name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
    setIsEditProfileOpen(false);
    setProfileSaved(true);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      window.location.assign("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordStatus(null);
    setIsSendingPasswordReset(true);
    try {
      const email = auth.currentUser?.email || profile.email;
      await sendPasswordResetEmail(auth, email);
      setPasswordStatus(`Password reset instructions sent to ${email}.`);
    } catch {
      setPasswordStatus(
        "Unable to send password reset instructions. Please try again.",
      );
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  return (
    <div className="admin-profile-root">
      <TopBar
        userName="Admin"
        userRole="Administrator"
        profilePath="/admin/profile"
      />
      <main className="admin-profile-main">
        <div className="admin-profile-content">
          <section className="admin-profile-panel admin-profile-hero">
            <div className="admin-profile-identity">
              <div className="admin-profile-avatar">{profile.initials}</div>
              <div>
                <div className="admin-profile-name-row">
                  <h1>{profile.name}</h1>
                  <span>{profile.role}</span>
                </div>
                <p className="admin-profile-handle">{profile.handle}</p>
                <p className="admin-profile-meta">
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  {profile.email}
                </p>
              </div>
            </div>
            <button
              className="admin-profile-edit-button"
              type="button"
              onClick={openProfileEditor}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                edit
              </span>
              Edit Profile
            </button>
          </section>

          <section className="admin-profile-stats">
            {adminStats.map((stat) => (
              <div
                className="admin-profile-panel admin-profile-stat"
                key={stat.key}
              >
                <div className="admin-profile-stat-icon">
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    {stat.icon}
                  </span>
                </div>
                <div>
                  <p>{stat.label}</p>
                  <strong>{stat.value}</strong>
                </div>
              </div>
            ))}
          </section>

          <section className="admin-profile-panel admin-profile-section">
            <div className="admin-profile-section-heading">
              <h2>Account Details</h2>
              <p>
                Manage the administrator account used to operate the platform.
              </p>
            </div>
            <div className="admin-profile-fields">
              <div>
                <span>Full Name</span>
                <strong>{profile.name}</strong>
              </div>
              <div>
                <span>Email Address</span>
                <strong>{profile.email}</strong>
              </div>
              <div>
                <span>Account Role</span>
                <strong>{adminProfile.role}</strong>
              </div>
              <div>
                <span>Administrator Since</span>
                <strong>{adminProfile.memberSince}</strong>
              </div>
            </div>
          </section>

          <section className="admin-profile-panel admin-profile-section">
            <div className="admin-profile-section-heading">
              <h2>Security</h2>
              <p>Keep your administrator access protected.</p>
            </div>
            <div className="admin-profile-security-row">
              <span
                className="admin-profile-row-icon material-symbols-outlined"
                aria-hidden="true"
              >
                lock
              </span>
              <div>
                <strong>Password</strong>
                <p>Last changed 3 months ago</p>
              </div>
              <button
                className="admin-profile-outline-button"
                type="button"
                onClick={handlePasswordChange}
                disabled={isSendingPasswordReset}
              >
                {isSendingPasswordReset ? "Sending..." : "Change"}
              </button>
            </div>
            {passwordStatus && (
              <p className="admin-profile-password-status" role="status">
                {passwordStatus}
              </p>
            )}
            <div className="admin-profile-security-row">
              <span
                className="admin-profile-row-icon material-symbols-outlined"
                aria-hidden="true"
              >
                verified_user
              </span>
              <div>
                <strong>Two-Factor Authentication</strong>
                <p>Adds an extra step when signing in</p>
              </div>
              <span className="admin-profile-status">Enabled</span>
            </div>
          </section>

          <section className="admin-profile-panel admin-profile-section">
            <div className="admin-profile-section-heading">
              <h2>Notification Preferences</h2>
              <p>
                Choose which platform updates reach your administrator account.
              </p>
            </div>
            <div className="admin-profile-toggle-list">
              <ToggleRow
                label="Security alerts"
                caption="Sign-ins, access changes, and suspicious activity."
                defaultOn
              />
              <ToggleRow
                label="User activity updates"
                caption="New registrations, approvals, and account changes."
                defaultOn
              />
              <ToggleRow
                label="System announcements"
                caption="Maintenance notices and platform releases."
                defaultOn={false}
              />
            </div>
          </section>

          <section className="admin-profile-panel admin-profile-danger">
            <div>
              <strong>Sign out of Gemstone Code</strong>
              <p>
                You can always sign back in with your administrator credentials.
              </p>
            </div>
            <button type="button" onClick={() => setShowLogoutModal(true)}>
              <span className="material-symbols-outlined" aria-hidden="true">
                logout
              </span>
              Log Out
            </button>
          </section>
          {profileSaved && (
            <p className="admin-profile-save-message" role="status">
              Profile updated successfully.
            </p>
          )}
        </div>
      </main>
      <BottomNav activeItem="profile" variant="admin" />
      {isEditProfileOpen && (
        <div
          className="admin-profile-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setIsEditProfileOpen(false)
          }
        >
          <form
            className="admin-profile-modal admin-profile-edit-modal"
            onSubmit={saveProfile}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-profile-modal-header">
              <div>
                <h2>Edit Profile</h2>
                <p>Update your administrator account details.</p>
              </div>
              <button
                type="button"
                className="admin-profile-modal-close"
                onClick={() => setIsEditProfileOpen(false)}
                aria-label="Close edit profile form"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <label>
              Full Name
              <input
                required
                value={editProfile.name}
                onChange={(event) =>
                  setEditProfile({ ...editProfile, name: event.target.value })
                }
              />
            </label>
            <label>
              Email Address
              <input
                required
                type="email"
                value={editProfile.email}
                onChange={(event) =>
                  setEditProfile({ ...editProfile, email: event.target.value })
                }
              />
            </label>
            <div className="admin-profile-modal-actions">
              <button type="button" onClick={() => setIsEditProfileOpen(false)}>
                Cancel
              </button>
              <button type="submit">Save Changes</button>
            </div>
          </form>
        </div>
      )}
      {showLogoutModal && (
        <div
          className="admin-profile-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget &&
            !isLoggingOut &&
            setShowLogoutModal(false)
          }
        >
          <section
            className="admin-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-logout-title"
          >
            <div className="admin-profile-modal-icon">
              <span className="material-symbols-outlined" aria-hidden="true">
                logout
              </span>
            </div>
            <h2 id="admin-logout-title">Log out?</h2>
            <p>Are you sure you want to log out of Gemstone Code?</p>
            <div className="admin-profile-modal-actions">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
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
