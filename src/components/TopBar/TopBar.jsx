import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { app } from "../../firebase";
import NotificationDrawer from "./notification/NotificationDrawer";
import "./TopBar.css";

function formatNotificationDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Shared top app bar used across pages.
 *
 * Props:
 * - logoText:   brand text shown on admin top bars    (default "Gemstone Code")
 *               member top bars show the product title and support actions
 * - userName:   member's display name                (optional)
 * - userRole:   member tier/role label                (optional)
 * - avatarUrl:  avatar image src                      (optional)
 * - profilePath: route opened by the avatar             (default "/profile")
 * - notifications: array of { id, title, message, time, unread } shown in the
 *                   notification drawer (default [])
 * - onNotifClick: handler for the notification bell. If not provided,
 *                  clicking the bell opens the notification drawer by default.
 * - onAvatarClick: handler for the avatar. If not provided, clicking the
 *                   avatar navigates to /profile by default.
 */
export default function TopBar({
  logoText = "Gemstone Code",
  userName = "",
  userRole = "",
  avatarUrl = "",
  profilePath = "/profile",
  showNotifDot = false,
  notifications,
  onNotifClick,
  onAvatarClick,
}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [loadedNotifications, setLoadedNotifications] = useState([]);
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState(() => new Set());
  const [deletingNotificationId, setDeletingNotificationId] = useState("");
  const [notificationDeleteError, setNotificationDeleteError] = useState("");

  useEffect(() => {
    if (notifications !== undefined) return undefined;

    let isMounted = true;
    const getUserNotifications = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserNotifications",
    );
    getUserNotifications()
      .then(({ data }) => {
        if (isMounted) setLoadedNotifications(data?.notifications || []);
      })
      .catch(() => {
        if (isMounted) setLoadedNotifications([]);
      });

    return () => {
      isMounted = false;
    };
  }, [notifications]);

  const resolvedUserName = userName || auth?.username || "";
  const resolvedUserRole = userRole || auth?.role || "";
  const resolvedAvatarUrl = avatarUrl || auth?.avatarUrl || "";
  const isAdminTopBar = resolvedUserRole === "Administrator";
  const displayedNotifications = (notifications ?? loadedNotifications)
    .filter((notification) => !hiddenNotificationIds.has(notification.id))
    .map(
    (notification) => ({
      ...notification,
      time: formatNotificationDate(notification.time),
    }),
  );
  const hasUnreadNotifications = showNotifDot || displayedNotifications.some(
    (notification) => notification.unread,
  );

  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
    } else {
      navigate(profilePath);
    }
  };

  const handleNotifClick = () => {
    if (onNotifClick) {
      onNotifClick();
      return;
    }

    setIsNotifDrawerOpen(true);
  };

  const handleViewAllNotifications = () => {
    setIsNotifDrawerOpen(false);
    const notificationsPath = profilePath.includes("/admin")
      ? "/admin/notifications"
      : "/notifications";
    navigate(notificationsPath);
  };

  const deleteNotifications = httpsCallable(
    getFunctions(app, "asia-southeast1"),
    "deleteUserNotifications",
  );

  const handleDeleteNotification = async (notificationId) => {
    setDeletingNotificationId(notificationId);
    setNotificationDeleteError("");
    try {
      await deleteNotifications({ notificationIds: [notificationId] });
      setHiddenNotificationIds((current) => new Set(current).add(notificationId));
      setLoadedNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      return true;
    } catch (error) {
      setNotificationDeleteError(error?.message || "Unable to delete this notification.");
      return false;
    } finally {
      setDeletingNotificationId("");
    }
  };

  const handleClearAllNotifications = async () => {
    setNotificationDeleteError("");
    try {
      await deleteNotifications({ deleteAll: true });
      setHiddenNotificationIds((current) => {
        const next = new Set(current);
        displayedNotifications.forEach((notification) => next.add(notification.id));
        return next;
      });
      setLoadedNotifications([]);
      return true;
    } catch (error) {
      setNotificationDeleteError(error?.message || "Unable to clear notifications.");
      return false;
    }
  };

  return (
    <>
      <header
        className={`tb-topbar${isAdminTopBar ? " tb-topbar-admin" : " tb-topbar-user"}`}
      >
        <div className="tb-topbar-inner">
          <div className="tb-topbar-left">
            <span className="tb-logo">
              {isAdminTopBar ? (
                logoText
              ) : (
                <>
                  <span className="tb-logo-main">Gemstone</span>
                  <span className="tb-logo-subtitle">
                    Advertisement Marketing
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="tb-topbar-right">
            <div className="tb-user-info">
              <p className="tb-user-role">{resolvedUserRole}</p>
              <p className="tb-user-name">{resolvedUserName}</p>
            </div>
            {!isAdminTopBar && (
              <Link
                className="tb-header-action"
                to="/help"
                aria-label="Help Center"
                title="Help Center"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  help
                </span>
              </Link>
            )}
            {!isAdminTopBar && (
              <a
                className="tb-header-action"
                href="mailto:support@gemstonecode.com"
                aria-label="Contact customer service"
                title="Contact customer service"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  support_agent
                </span>
              </a>
            )}
            <button
              className="tb-notif-btn"
              aria-label="Notifications"
              aria-expanded={isNotifDrawerOpen}
              onClick={handleNotifClick}
            >
              <span className="material-symbols-outlined">notifications</span>
              {hasUnreadNotifications && <span className="tb-notif-dot" />}
            </button>
            {resolvedAvatarUrl ? (
              <div
                className="tb-topbar-avatar"
                onClick={handleAvatarClick}
                role="button"
                tabIndex={0}
                aria-label="View profile"
              >
                <img src={resolvedAvatarUrl} alt={resolvedUserName} />
              </div>
            ) : (
              <div
                className="tb-topbar-avatar tb-topbar-avatar-placeholder"
                onClick={handleAvatarClick}
                role="button"
                tabIndex={0}
                aria-label="View profile"
              >
                <span className="material-symbols-outlined">account_circle</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={displayedNotifications}
        onViewAll={handleViewAllNotifications}
        onDeleteNotification={handleDeleteNotification}
        onClearAll={handleClearAllNotifications}
        deletingNotificationId={deletingNotificationId}
        deleteError={notificationDeleteError}
      />
    </>
  );
}
