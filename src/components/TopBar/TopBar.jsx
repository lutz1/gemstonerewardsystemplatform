import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { app, auth } from "../../firebase";
import NotificationDrawer from "./notification/NotificationDrawer";
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
  userName = "Alex Sterling",
  userRole = "Executive Member",
  avatarUrl = DEFAULT_AVATAR_URL,
  profilePath = "/profile",
  showNotifDot = false,
  notifications = [],
  onNotifClick,
  onAvatarClick,
}) {
  const navigate = useNavigate();
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [drawerNotifications, setDrawerNotifications] = useState(notifications);

  useEffect(() => {
    setDrawerNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!auth.currentUser || notifications.length > 0) return undefined;

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const getUserNotifications = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "getUserNotifications",
        );
        const { data } = await getUserNotifications();
        const next = (data?.notifications || []).map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          time: item.time,
          unread: item.unread,
        }));

        if (!cancelled) {
          setDrawerNotifications(next);
        }
      } catch (error) {
        console.warn("Unable to load notification drawer data:", error);
      }
    };

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [auth.currentUser, notifications]);

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

  return (
    <>
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
              aria-expanded={isNotifDrawerOpen}
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
      </header>

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={drawerNotifications}
        onViewAll={handleViewAllNotifications}
      />
    </>
  );
}
