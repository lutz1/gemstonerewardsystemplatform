import { useEffect, useRef, useState } from "react";
import "./NotificationDrawer.css";

const NOTIFICATIONS_PER_PAGE = 5;
const SWIPE_REVEAL_DISTANCE = 48;
const SWIPE_DELETE_DISTANCE = 128;

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
  onDeleteNotification,
  onClearAll,
  deletingNotificationId = "",
  deleteError = "",
}) {
  const panelRef = useRef(null);
  const touchStartXRef = useRef(null);
  const [page, setPage] = useState(1);
  const [revealedNotificationId, setRevealedNotificationId] = useState("");
  const pageCount = Math.max(1, Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
  const visibleNotifications = notifications.slice(pageStart, pageStart + NOTIFICATIONS_PER_PAGE);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setRevealedNotificationId("");
    }
  }, [isOpen]);

  const handleClose = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && panelRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`nd-backdrop${isOpen ? " nd-open" : ""}`}
        role="presentation"
        onClick={handleClose}
        aria-hidden={!isOpen}
      />
      <aside
        ref={panelRef}
        className={`nd-panel${isOpen ? " nd-open" : ""}`}
        aria-label="Notifications"
        aria-hidden={!isOpen}
      >
        <div className="nd-header">
          <h2>Notifications</h2>
          <div className="nd-header-actions">
            {notifications.length > 0 && onClearAll && (
              <button
                type="button"
                className="nd-clear-all"
                onClick={() => {
                  if (window.confirm("Delete all notifications? This cannot be undone.")) {
                    void onClearAll();
                    setRevealedNotificationId("");
                  }
                }}
                tabIndex={isOpen ? 0 : -1}
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="nd-close-btn"
              onClick={handleClose}
              aria-label="Close notifications"
              tabIndex={isOpen ? 0 : -1}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>

        {deleteError && <p className="nd-action-error" role="alert">{deleteError}</p>}

        <div className="nd-list">
          {notifications.length === 0 ? (
            <div className="nd-empty">
              <span className="material-symbols-outlined" aria-hidden="true">
                notifications_none
              </span>
              <p>You&apos;re all caught up.</p>
            </div>
          ) : (
            visibleNotifications.map((notification) => {
              const isRevealed = revealedNotificationId === notification.id;
              return (
              <div
                key={notification.id}
                className={`nd-swipe-row${isRevealed ? " nd-revealed" : ""}`}
                role="group"
                aria-label={`${notification.title} notification`}
                tabIndex={isOpen ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    setRevealedNotificationId(notification.id);
                  } else if (event.key === "ArrowRight" && revealedNotificationId === notification.id) {
                    event.preventDefault();
                    setRevealedNotificationId("");
                  }
                }}
                onTouchStart={(event) => {
                  touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
                }}
                onTouchEnd={async (event) => {
                  const touchStartX = touchStartXRef.current;
                  const touchEndX = event.changedTouches[0]?.clientX;
                  touchStartXRef.current = null;
                  if (touchStartX === null || touchEndX === undefined) return;
                  const swipeDistance = touchStartX - touchEndX;
                  if (swipeDistance >= SWIPE_DELETE_DISTANCE && onDeleteNotification) {
                    const deleted = await onDeleteNotification(notification.id);
                    setRevealedNotificationId(deleted ? "" : notification.id);
                  } else if (swipeDistance >= SWIPE_REVEAL_DISTANCE) {
                    setRevealedNotificationId(notification.id);
                  } else if (-swipeDistance >= SWIPE_REVEAL_DISTANCE) {
                    setRevealedNotificationId("");
                  }
                }}
              >
                {onDeleteNotification && (
                  <button
                    type="button"
                    className="nd-delete-btn"
                    onClick={async () => {
                      const deleted = await onDeleteNotification(notification.id);
                      if (deleted) setRevealedNotificationId("");
                    }}
                    disabled={deletingNotificationId === notification.id}
                    tabIndex={isOpen && isRevealed ? 0 : -1}
                    aria-label={`Delete notification: ${notification.title}`}
                    title="Delete notification"
                    style={{
                      opacity: isRevealed ? 1 : 0,
                      pointerEvents: isRevealed ? "auto" : "none",
                      visibility: isRevealed ? "visible" : "hidden",
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {deletingNotificationId === notification.id ? "hourglass_top" : "delete"}
                    </span>
                  </button>
                )}
                <article
                  className={`nd-item${notification.unread ? " nd-unread" : ""}`}
                  style={{ transform: isRevealed ? "translateX(-66px)" : "translateX(0)" }}
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
                </article>
              </div>
              );
            })
          )}
        </div>

        {notifications.length > NOTIFICATIONS_PER_PAGE && (
          <nav className="nd-pagination" aria-label="Notification pages">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
              tabIndex={isOpen ? 0 : -1}
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              Previous
            </button>
            <span aria-live="polite">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={currentPage >= pageCount}
              tabIndex={isOpen ? 0 : -1}
            >
              Next
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </nav>
        )}

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
