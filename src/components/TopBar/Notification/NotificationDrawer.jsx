import { useEffect } from "react";
import "./NotificationDrawer.css";

/**
 * Slide-in notifications panel, opened from the TopBar's bell button.
 *
 * Props:
 * - isOpen: boolean — whether the drawer is open
 * - onClose: () => void — called on backdrop click, close button, or Escape
 * - notifications: array of { id, title, message, time, unread } — optional, defaults to []
 * - onViewAll: () => void — optional. If provided, a "View all notifications"
 *     button is shown at the bottom that calls it (e.g. to navigate to a full page).
 */
export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  onViewAll,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`nd-backdrop${isOpen ? " nd-open" : ""}`}
        role="presentation"
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`nd-panel${isOpen ? " nd-open" : ""}`}
        aria-label="Notifications"
        aria-hidden={!isOpen}
      >
        <div className="nd-header">
          <h2>Notifications</h2>
          <button
            type="button"
            className="nd-close-btn"
            onClick={onClose}
            aria-label="Close notifications"
            tabIndex={isOpen ? 0 : -1}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="nd-list">
          {notifications.length === 0 ? (
            <div className="nd-empty">
              <span className="material-symbols-outlined" aria-hidden="true">
                notifications_none
              </span>
              <p>You&apos;re all caught up.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`nd-item${notification.unread ? " nd-unread" : ""}`}
              >
                <div className="nd-item-header">
                  <p className="nd-item-title">{notification.title}</p>
                  {notification.time && (
                    <span className="nd-item-time">{notification.time}</span>
                  )}
                </div>
                {notification.message && (
                  <p className="nd-item-message">{notification.message}</p>
                )}
              </div>
            ))
          )}
        </div>

        {onViewAll && (
          <button
            type="button"
            className="nd-view-all"
            onClick={onViewAll}
            tabIndex={isOpen ? 0 : -1}
          >
            View all notifications
          </button>
        )}
      </aside>
    </>
  );
}
