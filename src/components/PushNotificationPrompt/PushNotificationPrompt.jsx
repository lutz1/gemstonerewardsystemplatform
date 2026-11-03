import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { auth } from "../../firebase";
import {
    enablePushNotifications,
    hasPushNotificationsEnabled,
} from "../../utils/pushNotifications";
import "./PushNotificationPrompt.css";

export default function PushNotificationPrompt() {
  const { authReady, isLoggedIn, pinVerified } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!authReady || !isLoggedIn || !pinVerified || !userId) {
      setIsOpen(false);
      return;
    }

    const permissionGranted = globalThis.Notification?.permission === "granted";
    const alreadyEnabled = permissionGranted && hasPushNotificationsEnabled(userId);
    setIsEnabled(false);
    setMessage("");
    setIsOpen(!alreadyEnabled);
  }, [authReady, isLoggedIn, pinVerified, userId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isEnabling) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEnabling, isOpen]);

  const handleEnable = async () => {
    setIsEnabling(true);
    setMessage("");
    try {
      await enablePushNotifications();
      setIsEnabled(true);
      setMessage("Push notifications are enabled on this device.");
    } catch (error) {
      setMessage(error?.message || "Unable to enable push notifications.");
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="push-optin-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isEnabling) setIsOpen(false);
      }}
    >
      <section
        className="push-optin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-optin-title"
      >
        <span className="material-symbols-outlined push-optin-icon" aria-hidden="true">
          notifications_active
        </span>
        <h2 id="push-optin-title">Enable notifications?</h2>
        <p>Receive payment confirmations and account updates on this device.</p>
        {message && (
          <p className={`push-optin-message${isEnabled ? " is-success" : ""}`} role={isEnabled ? "status" : "alert"}>
            {message}
          </p>
        )}
        <div className="push-optin-actions">
          {isEnabled ? (
            <button className="push-optin-enable" type="button" onClick={() => setIsOpen(false)}>
              Done
            </button>
          ) : (
            <>
              <button
                className="push-optin-dismiss"
                type="button"
                disabled={isEnabling}
                onClick={() => setIsOpen(false)}
              >
                Not now
              </button>
              <button
                className="push-optin-enable"
                type="button"
                disabled={isEnabling}
                onClick={handleEnable}
              >
                {isEnabling ? "Enabling..." : "Enable"}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}