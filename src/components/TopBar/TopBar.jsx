import "./TopBar.css";

const DEFAULT_AVATAR_URL =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80";

/**
 * Shared top app bar used across pages.
 *
 * Props:
 * - logoText:   brand text shown top-left            (default "Gemstone Code")
 * - userName:   member's display name                (default "Alex Sterling")
 * - userRole:   member tier/role label                (default "Executive Member")
 * - avatarUrl:  avatar image src                      (default sample avatar)
 * - onNotifClick: handler for the notification bell   (optional)
 * - onAvatarClick: handler for the avatar             (optional)
 */
export default function TopBar({
  logoText = "Gemstone Code",
  userName = "Alex Sterling",
  userRole = "Executive Member",
  avatarUrl = DEFAULT_AVATAR_URL,
  showNotifDot = false,
  onNotifClick,
  onAvatarClick,
}) {
  return (
    <header className="tb-topbar">
      <div className="tb-topbar-inner">
        <div className="tb-topbar-left">
          <span className="tb-logo">{logoText}</span>
        </div>

        <div className="tb-topbar-right">
          <div className="tb-user-info">
            <p className="tb-user-role">{userRole}</p>
            <p className="tb-user-name">{userName}</p>
          </div>
          <button
            className="tb-notif-btn"
            aria-label="Notifications"
            onClick={onNotifClick}
          >
            <span className="material-symbols-outlined">notifications</span>
            {showNotifDot && <span className="tb-notif-dot" />}
          </button>
          <div className="tb-topbar-avatar" onClick={onAvatarClick}>
            <img src={avatarUrl} alt={userName} />
          </div>
        </div>
      </div>
    </header>
  );
}