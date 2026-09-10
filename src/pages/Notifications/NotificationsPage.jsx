import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import "./NotificationsPage.css";

function formatNotificationTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function NotificationsPage({ isAdmin = false }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const getUserNotifications = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "getUserNotifications",
        );
        const { data } = await getUserNotifications();
        setNotifications((data?.notifications || []).map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          time: formatNotificationTime(item.time),
          unread: item.unread,
          type: item.type || "info",
        })));
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchNotifications();
  }, []);

  const handleBack = () => {
    const previousPage =
      window.history.state?.idx > 0
        ? -1
        : isAdmin
          ? "/admin/settings"
          : "/dashboard";

    if (previousPage === -1) {
      navigate(-1);
      return;
    }

    navigate(previousPage);
  };

  return (
    <div className="notifications-root">
      <TopBar
        userName={isAdmin ? "Admin" : "Marcus"}
        userRole={isAdmin ? "Administrator" : "Executive Member"}
        profilePath={isAdmin ? "/admin/profile" : "/profile"}
        showNotifDot={notifications.some((item) => item.unread)}
        onNotifClick={() =>
          navigate(isAdmin ? "/admin/notifications" : "/notifications")
        }
        notifications={notifications}
      />

      <main className="notifications-main">
        <header className="notifications-header">
          <div className="notifications-header-row">
            <button
              type="button"
              className="notifications-back-button"
              aria-label="Go back"
              onClick={handleBack}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </button>
            <div>
              <p className="notifications-eyebrow">Updates</p>
              <h1>Notifications</h1>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="notifications-empty-state">
            <span className="material-symbols-outlined" aria-hidden="true">
              sync
            </span>
            <h2>Loading notifications...</h2>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty-state">
            <span className="material-symbols-outlined" aria-hidden="true">
              notifications_none
            </span>
            <h2>No notifications yet</h2>
            <p>You’re all caught up. New alerts will appear here.</p>
          </div>
        ) : (
          <section
            className="notifications-list"
            aria-label="Notifications list"
          >
            {notifications.map((item) => (
              <article
                key={item.id}
                className={`notification-card notification-card--${
                  item.type || "info"
                }`}
              >
                <div className="notification-icon-wrap">
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    {item.type === "success"
                      ? "check_circle"
                      : item.type === "warning"
                        ? "warning"
                        : item.type === "error"
                          ? "error"
                          : "info"}
                  </span>
                </div>
                <div className="notification-content">
                  <div className="notification-head">
                    <h2>{item.title}</h2>
                    <time>{item.time}</time>
                  </div>
                  <p>{item.message}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <BottomNav
        activeItem={isAdmin ? "settings" : "dashboard"}
        variant={isAdmin ? "admin" : "member"}
      />
    </div>
  );
}
