import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import "./NotificationsPage.css";

const sampleNotifications = [
  {
    id: 1,
    title: "Gem value updated",
    detail: "The platform default GEM value has been adjusted to PHP 12.50.",
    time: "2 hours ago",
    type: "info",
  },
  {
    id: 2,
    title: "Purchase approved",
    detail: "Your latest code purchase has been successfully approved.",
    time: "Today",
    type: "success",
  },
  {
    id: 3,
    title: "Membership reminder",
    detail:
      "Your membership renewal is due in 12 days. Review your benefits now.",
    time: "Yesterday",
    type: "warning",
  },
];

export default function NotificationsPage({ isAdmin = false }) {
  const navigate = useNavigate();
  const notifications = sampleNotifications;

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
        showNotifDot={notifications.length > 0}
        onNotifClick={() =>
          navigate(isAdmin ? "/admin/notifications" : "/notifications")
        }
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

        {notifications.length === 0 ? (
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
                className={`notification-card notification-card--${item.type}`}
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
                        : "info"}
                  </span>
                </div>
                <div className="notification-content">
                  <div className="notification-head">
                    <h2>{item.title}</h2>
                    <time>{item.time}</time>
                  </div>
                  <p>{item.detail}</p>
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
