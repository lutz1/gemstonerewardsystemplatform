import { sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import bgImage from "../../assets/bg_dashboard.jpg";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import TopBar from "../../components/TopBar/TopBar";
import { app, auth, storage } from "../../firebase";
import { enablePushNotifications } from "../../utils/pushNotifications";
import "../PurchaseCodes/PurchaseCodesPage.css";
import ReferralActionsModal from "../PurchaseCodes/ReferralActions/ReferralActionsModal";
import "./ProfilePage.css";

const BG_IMAGE = bgImage;
const EMAIL_VERIFICATION_URL = "https://gemstonecode.store/verify-email";
const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  const date =
    typeof value.toDate === "function" ? value.toDate() : new Date(value);
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
    [data.firstName, data.middleName, data.lastName]
      .filter(Boolean)
      .join(" ") ||
    currentUser.displayName ||
    currentUser.email ||
    "Member";

  return {
    name,
    handle: data.username ? `@${data.username}` : "—",
    email: data.email || currentUser.email || "—",
    avatarUrl: data.avatarUrl || data.photoURL || currentUser.photoURL || "",
    emailVerified: data.emailVerified === true,
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
      {
        key: "codes",
        icon: "token",
        label: "Codes Purchased",
        value: data.codesPurchased ?? data.totalCodes ?? "—",
      },
      {
        key: "referrals",
        icon: "diversity_3",
        label: "Active Referrals",
        value: data.activeReferrals ?? data.referrals ?? "—",
      },
      {
        key: "gems",
        icon: "diamond",
        label: "GEMS Balance",
        value:
          data.gemPoints ??
          data.gemsBalance ??
          data.gemBalance ??
          data.gems ??
          "—",
      },
      {
        key: "age",
        icon: "calendar_month",
        label: "Member Since",
        value: formatDate(data.joinDate || data.createdAt),
      },
    ],
  };
}

export default function ProfilePage() {
  const { username, referralCode, setAvatarUrl } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("");
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState("");
  const [avatarUploadError, setAvatarUploadError] = useState("");
  const [copied, setCopied] = useState(false);
  const avatarInputRef = useRef(null);
  const avatarUploadTaskRef = useRef(null);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(
    () => location.state?.openReferralModal === true,
  );
  const referralIdentifier = referralCode || username;
  const referralLink = referralIdentifier
    ? `https://gemstonecode.store/register?ref=${encodeURIComponent(referralIdentifier)}`
    : "";

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

  useEffect(() => () => avatarUploadTaskRef.current?.cancel(), []);

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

  const handleVerifyAccount = async () => {
    if (profile.emailVerified || !auth.currentUser) return;

    setIsSendingVerification(true);
    setVerificationStatus("");
    try {
      await sendEmailVerification(auth.currentUser, {
        url: EMAIL_VERIFICATION_URL,
        handleCodeInApp: true,
      });
      setVerificationStatus("Verification email sent.");
    } catch {
      setVerificationStatus("Unable to send verification email.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarUploadStatus("");
    setAvatarUploadError("");
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      setAvatarUploadError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_SIZE) {
      setAvatarUploadError("Profile images must be 5 MB or smaller.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setAvatarUploadError("Sign in again before changing your profile image.");
      return;
    }

    avatarUploadTaskRef.current?.cancel();
    setIsUploadingAvatar(true);
    setAvatarUploadProgress(0);
    const avatarRef = ref(storage, `profile-images/${currentUser.uid}/avatar`);
    const uploadTask = uploadBytesResumable(avatarRef, file, {
      contentType: file.type,
    });
    avatarUploadTaskRef.current = uploadTask;

    try {
      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            setAvatarUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          },
          reject,
          resolve,
        );
      });
      const photoURL = await getDownloadURL(avatarRef);
      await updateProfile(currentUser, { photoURL });
      setAvatarUrl(photoURL);
      setProfile((current) => ({ ...current, avatarUrl: photoURL }));
      setAvatarUploadStatus("Profile photo updated.");
    } catch (uploadError) {
      if (uploadError?.code !== "storage/canceled") {
        setAvatarUploadError(uploadError?.message || "Unable to upload your profile image.");
      }
    } finally {
      avatarUploadTaskRef.current = null;
      setIsUploadingAvatar(false);
    }
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushStatus("");
    try {
      await enablePushNotifications();
      setPushStatus("Push notifications are enabled on this device.");
    } catch (error) {
      setPushStatus(error?.message || "Unable to enable push notifications.");
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Gemstone Code",
          text: "Join me on Gemstone Code and get access to executive networking codes.",
          url: referralLink,
        });
      } catch {
        // User cancelled the share sheet.
      }
      return;
    }
    await handleCopyReferral();
  };

  const handleRegisterMember = () => {
    setIsReferralModalOpen(false);
    window.location.assign(
      `/register${referralIdentifier ? `?ref=${encodeURIComponent(referralIdentifier)}` : ""}`,
    );
  };

  if (!profile) {
    if (!profileError) {
      return <LoadingScreen label="Loading profile..." />;
    }

    return (
      <div className="prof-root">
        <div className="prof-bg" aria-hidden="true">
          <img src={BG_IMAGE} alt="" className="prof-bg-img" />
          <div className="prof-bg-gradient" />
          <div className="prof-bg-grid" />
        </div>

        <TopBar userName="Member" userRole="Member" />
        <main className="prof-main">
          <div className="prof-content">
            <p role="alert">{profileError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="prof-root">
      <div className="prof-bg" aria-hidden="true">
        <img src={BG_IMAGE} alt="" className="prof-bg-img" />
        <div className="prof-bg-gradient" />
        <div className="prof-bg-grid" />
      </div>

      {/* ── Atmosphere glows ─────────────────────────────────── */}
      <div className="prof-glow prof-glow-tr" />
      <div className="prof-glow prof-glow-bl" />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <TopBar userName={profile.name} userRole={profile.tier} avatarUrl={profile.avatarUrl} />

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="prof-main">
        <div className="prof-content">
          {/* ── Identity hero ──────────────────────────────── */}
          <section className="prof-glass-panel prof-hero">
            <div className="prof-hero-identity">
              <button
                className="prof-avatar prof-avatar-button"
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={profile.avatarUrl ? "Change profile photo" : "Upload profile photo"}
                title={profile.avatarUrl ? "Change profile photo" : "Upload profile photo"}
              >
                {profile.avatarUrl ? (
                  <img className="prof-avatar-photo" src={profile.avatarUrl} alt={`${profile.name} profile`} />
                ) : (
                  <span>{profile.initials}</span>
                )}
                {isUploadingAvatar ? (
                  <span className="prof-avatar-progress">{avatarUploadProgress}%</span>
                ) : (
                  <span className="material-symbols-outlined prof-avatar-camera" aria-hidden="true">
                    photo_camera
                  </span>
                )}
              </button>
              <input
                ref={avatarInputRef}
                className="prof-avatar-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                tabIndex={-1}
                aria-hidden="true"
              />
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
            <span
              className={`prof-verification-badge${profile.emailVerified ? " is-verified" : " is-unverified"}`}
              title={profile.emailVerified ? "Email verified" : "Email not verified"}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {profile.emailVerified ? "verified" : "warning"}
              </span>
              {profile.emailVerified ? "Verified" : "Unverified"}
            </span>
            <div className="prof-hero-actions">
              <button
                className="prof-verify-btn"
                type="button"
                onClick={handleVerifyAccount}
                disabled={profile.emailVerified || isSendingVerification}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {profile.emailVerified ? "verified" : "mark_email_read"}
                </span>
                {isSendingVerification ? "Sending..." : "Verify Account"}
              </button>
              <button
                className="prof-edit-btn"
                type="button"
                onClick={() => navigate("/edit-profile")}
              >
                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                Edit Profile
              </button>
            </div>
          </section>
          {avatarUploadStatus && (
            <p className="prof-avatar-upload-message" role="status">{avatarUploadStatus}</p>
          )}
          {avatarUploadError && (
            <p className="prof-avatar-upload-message is-error" role="alert">{avatarUploadError}</p>
          )}
          {verificationStatus && (
            <p className="prof-verification-status" role="status">
              {verificationStatus}
            </p>
          )}

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

          {/* ── Direct referral ────────────────────────────── */}
          <section className="pc-glass-panel pc-referral-box prof-referral-box">
            <label className="pc-referral-label">Direct Referral</label>
            <p className="pc-referral-intro">
              Share your link or register a new member yourself - both count
              toward your referrals.
            </p>
            <button
              className="pc-invite-button"
              type="button"
              onClick={() => setIsReferralModalOpen(true)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                person_add
              </span>
              {copied ? "Referral Link Copied" : "Invite Gem Buddy"}
            </button>
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

          <section className="prof-glass-panel prof-panel">
            <div className="prof-panel-header">
              <h3 className="prof-panel-title">Push Notifications</h3>
              <p className="prof-panel-sub">
                Enable payment updates on this device. This does not make a purchase.
              </p>
            </div>
            <div className="prof-security-row">
              <div className="prof-security-icon">
                <span className="material-symbols-outlined" aria-hidden="true">notifications_active</span>
              </div>
              <div className="prof-security-info">
                <p className="prof-security-label">This device</p>
                <p className="prof-security-caption">Allow browser notifications to receive payment confirmations.</p>
              </div>
              <button
                className="prof-outline-btn"
                type="button"
                onClick={handleEnablePush}
                disabled={isEnablingPush}
              >
                {isEnablingPush ? "Enabling..." : "Enable"}
              </button>
            </div>
            {pushStatus && <p className="prof-verification-status" role="status">{pushStatus}</p>}
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

      <ReferralActionsModal
        isOpen={isReferralModalOpen}
        referralLink={referralLink}
        copied={copied}
        onCopy={handleCopyReferral}
        onShare={handleShareReferral}
        onRegister={handleRegisterMember}
        onClose={() => setIsReferralModalOpen(false)}
      />

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
