import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TopBar.css";

const DEFAULT_AVATAR_URL =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80";

// Placeholder data so the drawer looks complete out of the box. Pass a
// real `notifications` prop from wherever your app's notification data
// lives and this default is ignored.
const DEFAULT_NOTIFICATIONS = [
  {
    id: "1",
    title: "Order shipped",
    message: "Your Sapphire tier order #4471 is on its way.",
    time: "2h ago",
    read: false,
  },
  {
    id: "2",
    title: "Price alert",
    message: "GEMS value is up 4.2% over the past week.",
    time: "6h ago",
    read: false,
  },
  {
    id: "3",
    title: "Welcome",
    message: "Your Executive Member benefits are now active.",
    time: "1d ago",
    read: true,
  },
];

/**
 * Shared top app bar used across pages.
 *
 * Props:
 * - logoText:   brand text shown top-left            (default "Gemstone Code")
 * - userName:   member's display name                (default "Alex Sterling")
 * - userRole:   member tier/role label                (default "Executive Member")
 * - avatarUrl:  avatar image src                      (default sample avatar)
 * - profilePath: route opened by the avatar             (default "/profile")
 * - notifications: array of { id, title, message, time, read } shown in the drawer
 * - onNotifClick: fired every time the bell is clicked, in addition to
 *                  opening the drawer (optional — for analytics etc.)
 * - onNotificationClick: fired when a single notification row is clicked
 * - onMarkAllRead: fired when "Mark all read" is clicked
 * - onAvatarClick: handler for the avatar. If not provided, clicking the
 *                   avatar navigates to /profile by default.
 */
export default function TopBar({
  logoText = "Gemstone Code",
  userName = "Alex Sterling",
  userRole = "Executive Member",
  avatarUrl = DEFAULT_AVATAR_URL,
  profilePath = "/profile",
  showNotifDot = false,
  notifications = DEFAULT_NOTIFICATIONS,
  onNotifClick,
  onAvatarClick,
  onNotificationClick,
  onMarkAllRead,
}) {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const notificationsPath = profilePath.includes("/admin")
    ? "/admin/notifications"
    : "/notifications";

  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
    } else {
      navigate(profilePath);
    }
  };

  // Bell now opens the drawer instead of navigating away. onNotifClick
  // still fires if passed, so callers relying on it for side effects
  // (marking things read, analytics) keep working.
  const handleNotifClick = () => {
    onNotifClick?.();
    setIsDrawerOpen((open) => !open);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  // Escape closes the drawer, and the page behind it stops scrolling
  // while it's open — standard drawer/modal behavior.
  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            aria-expanded={isDrawerOpen}
            onClick={handleNotifClick}
          >
            <span className="material-symbols-outlined">notifications</span>
            {showNotifDot && <span className="tb-notif-dot" />}
          </button>
          <div
            className="tb-topbar-avatar"
            onClick={handleAvatarClick}
            role="button"
            tabIndex={0}
            aria-label="View profile"
          >
            <img src={avatarUrl} alt={userName} />
          </div>
        </div>
      </div>

      {/* Backdrop dims the page and closes the drawer on click */}
      <div
        className={`tb-notif-backdrop${isDrawerOpen ? " tb-notif-backdrop--visible" : ""}`}
        onClick={closeDrawer}
        aria-hidden={!isDrawerOpen}
      />

      {/* Slide-in drawer */}
      <aside
        className={`tb-notif-drawer${isDrawerOpen ? " tb-notif-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <div className="tb-notif-drawer-header">
          <h2 className="tb-notif-drawer-title">Notifications</h2>
          <div className="tb-notif-drawer-header-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="tb-notif-mark-read"
                onClick={() => onMarkAllRead?.()}
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              className="tb-notif-close"
              aria-label="Close notifications"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="tb-notif-drawer-body">
          {notifications.length === 0 ? (
            <div className="tb-notif-empty">
              <span className="material-symbols-outlined tb-notif-empty-icon">
                notifications_none
              </span>
              <p>You&rsquo;re all caught up.</p>
            </div>
          ) : (
            <ul className="tb-notif-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`tb-notif-item${n.read ? "" : " tb-notif-item--unread"}`}
                    onClick={() => {
                      onNotificationClick?.(n);
                      closeDrawer();
                    }}
                  >
                    {!n.read && (
                      <span className="tb-notif-item-dot" aria-hidden="true" />
                    )}
                    <div className="tb-notif-item-content">
                      <p className="tb-notif-item-title">{n.title}</p>
                      <p className="tb-notif-item-message">{n.message}</p>
                      <p className="tb-notif-item-time">{n.time}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tb-notif-drawer-footer">
          <button
            type="button"
            className="tb-notif-view-all"
            onClick={() => {
              closeDrawer();
              navigate(notificationsPath);
            }}
          >
            View all notifications
          </button>
        </div>
      </aside>
    </header>
  );
}
