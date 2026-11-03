import { useCallback, useEffect, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import { app } from "../../../firebase";
import "./MarketPlaceMessages.css";

function formatMessageDate(value) {
  let date = value;
  if (value && typeof value.toDate === "function") {
    date = value.toDate();
  } else if (value && typeof value.seconds === "number") {
    date = new Date(value.seconds * 1000);
  } else if (value && typeof value._seconds === "number") {
    date = new Date(value._seconds * 1000);
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MarketPlaceMessages({ onBack, onUpdateApplication }) {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [readErrorMessage, setReadErrorMessage] = useState("");
  const [updateApplicationError, setUpdateApplicationError] = useState("");
  const [isOpeningApplication, setIsOpeningApplication] = useState(false);
  const [openDeleteMessageId, setOpenDeleteMessageId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const touchStartX = useRef(null);
  const didSwipeRef = useRef(false);
  const isMountedRef = useRef(false);

  const refreshMessages = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      const getUserMessages = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getUserMessages",
      );
      const { data } = await getUserMessages();
      if (!isMountedRef.current) return;
      const inboxMessages = Array.isArray(data?.messages)
        ? data.messages.filter(
            (message) => [
              "seller_application_message",
              "seller_application_rejection",
              "seller_application_approval",
            ].includes(message.type),
          )
        : [];
      setMessages(inboxMessages);
    } catch (error) {
      if (!isMountedRef.current) return;
      globalThis.console.error("Could not load Marketplace messages.", error);
      setErrorMessage(error.message || "Unable to load your messages.");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const markMessageAsRead = async (message) => {
    if (!message.unread) return;

    setReadErrorMessage("");
    try {
      const getUserMessages = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getUserMessages",
      );
      await getUserMessages({ markReadMessageId: message.id });
      if (!isMountedRef.current) return;
      setMessages((currentMessages) => currentMessages.map((item) => (
        item.id === message.id ? { ...item, unread: false } : item
      )));
      setSelectedMessage((currentMessage) => (
        currentMessage?.id === message.id
          ? { ...currentMessage, unread: false }
          : currentMessage
      ));
    } catch (error) {
      if (!isMountedRef.current) return;
      globalThis.console.error("Could not mark Marketplace message as read.", error);
      setReadErrorMessage(error.message || "Unable to mark this message as read.");
    }
  };

  const openMessage = (message) => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    setOpenDeleteMessageId(null);
    setSelectedMessage(message);
    setReadErrorMessage("");
    void markMessageAsRead(message);
  };

  const deleteMessage = async (message) => {
    setDeletingMessageId(message.id);
    setDeleteError("");
    try {
      const deleteUserMarketplaceMessage = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "deleteUserMarketplaceMessage",
      );
      await deleteUserMarketplaceMessage({ messageId: message.id });
      if (!isMountedRef.current) return;
      setMessages((currentMessages) => currentMessages.filter(
        (item) => item.id !== message.id,
      ));
      setOpenDeleteMessageId(null);
    } catch (error) {
      if (!isMountedRef.current) return;
      globalThis.console.error("Could not delete Marketplace message.", error);
      setDeleteError(error.message || "Unable to delete this message.");
    } finally {
      if (isMountedRef.current) setDeletingMessageId(null);
    }
  };

  const handleMessageTouchStart = (event) => {
    if (event.touches.length !== 1) {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = event.touches[0].clientX;
    didSwipeRef.current = false;
  };

  const handleMessageTouchEnd = (message, event) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (distance < -48) {
      didSwipeRef.current = true;
      setDeleteError("");
      setOpenDeleteMessageId(message.id);
    } else if (distance > 48) {
      didSwipeRef.current = true;
      setOpenDeleteMessageId((current) => (
        current === message.id ? null : current
      ));
    }
  };

  const handleUpdateApplication = async () => {
    setUpdateApplicationError("");
    setIsOpeningApplication(true);
    try {
      let applicationId = selectedMessage.applicationId;
      if (!applicationId) {
        const getSellerApplicationStatus = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "getSellerApplicationStatus",
        );
        const { data } = await getSellerApplicationStatus();
        applicationId = data?.application?.applicationId;
      }
      if (!applicationId) {
        throw new Error("Your seller application could not be found.");
      }
      onUpdateApplication(applicationId);
    } catch (error) {
      globalThis.console.error("Could not open seller application for editing.", error);
      setUpdateApplicationError(
        error.message || "Unable to open your seller application.",
      );
    } finally {
      setIsOpeningApplication(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void refreshMessages();
      }
    };
    const intervalId = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    void refreshMessages();

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshMessages]);

  if (isLoading) {
    return <LoadingScreen label="Loading your messages..." />;
  }

  return (
    <div className="marketplace-messages-root">
      <header className="marketplace-messages-header">
        <button
          type="button"
          aria-label={selectedMessage ? "Back to messages" : "Back to Marketplace"}
          onClick={() => {
            if (selectedMessage) {
              setSelectedMessage(null);
            } else {
              onBack();
            }
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        </button>
        <h1>{selectedMessage ? "Message" : "Messages"}</h1>
        {selectedMessage ? (
          <span aria-hidden="true" />
        ) : (
          <button
            type="button"
            aria-label="Refresh messages"
            title="Refresh messages"
            disabled={isRefreshing}
            onClick={() => void refreshMessages()}
          >
            <span
              className={`material-symbols-outlined${isRefreshing ? " is-refreshing" : ""}`}
              aria-hidden="true"
            >
              refresh
            </span>
          </button>
        )}
      </header>
      <main className="marketplace-messages-content">
        {selectedMessage ? (
          <article className="marketplace-message-detail">
            {updateApplicationError && (
              <div className="marketplace-message-read-error" role="alert">
                <p>{updateApplicationError}</p>
              </div>
            )}
            {readErrorMessage && (
              <div className="marketplace-message-read-error" role="alert">
                <p>{readErrorMessage}</p>
                <button
                  type="button"
                  onClick={() => void markMessageAsRead(selectedMessage)}
                >
                  Try again
                </button>
              </div>
            )}
            <div className="marketplace-message-detail-heading">
              <div className="marketplace-message-icon" aria-hidden="true">
                <span className="material-symbols-outlined">
                  {selectedMessage.type === "seller_application_approval"
                    ? "verified"
                    : selectedMessage.type === "seller_application_rejection"
                      ? "cancel"
                      : "mail"}
                </span>
              </div>
              <div>
                <h2>{selectedMessage.title}</h2>
                <time>{formatMessageDate(selectedMessage.time)}</time>
              </div>
            </div>
            <p>{selectedMessage.message}</p>
            {selectedMessage.type === "seller_application_message"
              && typeof onUpdateApplication === "function" && (
                <p className="marketplace-message-update-hint">
                  You may update your application by clicking{" "}
                  <button
                    className="marketplace-message-update-application"
                    type="button"
                    disabled={isOpeningApplication}
                    onClick={() => void handleUpdateApplication()}
                  >
                    {isOpeningApplication ? (
                      "Opening application..."
                    ) : (
                      <>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          edit_document
                        </span>
                        Update Application
                      </>
                    )}
                  </button>
                  .
                </p>
              )}
          </article>
        ) : errorMessage ? (
          <section className="marketplace-messages-state" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <h2>Unable to load messages</h2>
            <p>{errorMessage}</p>
          </section>
        ) : messages.length ? (
          <section
            className="marketplace-messages-list"
            aria-label="Marketplace messages"
          >
            {deleteError && (
              <p className="marketplace-message-delete-error" role="alert">
                {deleteError}
              </p>
            )}
            {messages.map((message) => {
              const preview = message.message.trim().length > 140
                ? `${message.message.trim().slice(0, 140)}…`
                : message.message;
              return (
                <div
                  className={`marketplace-message-swipe-row${
                    openDeleteMessageId === message.id ? " is-delete-open" : ""
                  }`}
                  key={message.id}
                  onTouchStart={handleMessageTouchStart}
                  onTouchEnd={(event) => handleMessageTouchEnd(message, event)}
                  onTouchCancel={() => {
                    touchStartX.current = null;
                  }}
                >
                  <button
                    className="marketplace-message-card"
                    type="button"
                    aria-label={`Open message: ${message.title}`}
                    onClick={() => openMessage(message)}
                  >
                    <div className="marketplace-message-icon" aria-hidden="true">
                      <span className="material-symbols-outlined">
                        {message.type === "seller_application_approval"
                          ? "verified"
                          : message.type === "seller_application_rejection"
                            ? "cancel"
                            : "mail"}
                      </span>
                    </div>
                    <div className="marketplace-message-copy">
                      <div className="marketplace-message-heading">
                        <h2>{message.title}</h2>
                        <time>{formatMessageDate(message.time)}</time>
                      </div>
                      <p>{preview}</p>
                    </div>
                    {!message.unread && <span className="marketplace-message-read">Read</span>}
                  </button>
                  <button
                    className="marketplace-message-delete"
                    type="button"
                    aria-label={`Delete message: ${message.title}`}
                    aria-hidden={openDeleteMessageId !== message.id}
                    tabIndex={openDeleteMessageId === message.id ? 0 : -1}
                    disabled={deletingMessageId === message.id}
                    onClick={() => void deleteMessage(message)}
                  >
                    <span className={`material-symbols-outlined${
                      deletingMessageId === message.id ? " is-deleting" : ""
                    }`} aria-hidden="true">
                      {deletingMessageId === message.id ? "progress_activity" : "delete"}
                    </span>
                  </button>
                </div>
              );
            })}
          </section>
        ) : (
          <section className="marketplace-messages-state">
            <span className="material-symbols-outlined" aria-hidden="true">drafts</span>
            <h2>No messages yet</h2>
            <p>Seller application updates and requests will appear here.</p>
          </section>
        )}
      </main>
    </div>
  );
}
