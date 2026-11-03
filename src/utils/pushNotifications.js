import { getFunctions, httpsCallable } from "firebase/functions";
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, auth } from "../firebase";

let messagingRegistrationPromise;
const PUSH_ENABLED_KEY_PREFIX = "gemstone_push_enabled:";

export function hasPushNotificationsEnabled(uid) {
  if (!uid) return false;
  try {
    return globalThis.localStorage?.getItem(`${PUSH_ENABLED_KEY_PREFIX}${uid}`) === "true";
  } catch {
    return false;
  }
}

function isAppleMobileDevice() {
  const navigator = globalThis.navigator;
  return /iPhone|iPad|iPod/i.test(navigator?.userAgent || "")
    || (navigator?.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
}

export function preparePushServiceWorker() {
  if (!globalThis.navigator?.serviceWorker) {
    return Promise.reject(new Error("This browser does not support service workers."));
  }

  messagingRegistrationPromise ??= globalThis.navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/firebase-cloud-messaging-push-scope" },
  ).catch((error) => {
    messagingRegistrationPromise = undefined;
    throw error;
  });

  return messagingRegistrationPromise;
}

export async function listenForForegroundPushNotifications() {
  if (!(await isSupported())) return () => {};

  return onMessage(getMessaging(app), async (payload) => {
    if (!globalThis.Notification || globalThis.Notification.permission !== "granted") return;

    const data = payload.data || {};
    try {
      const registration = await preparePushServiceWorker();
      await registration.showNotification(
        payload.notification?.title || data.title || "GEMSTONE Reward",
        {
          body: payload.notification?.body || data.body || "You have a new account update.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { route: data.route || "/notifications" },
        },
      );
    } catch (error) {
      console.warn("Unable to display foreground push notification:", error);
    }
  });
}

export async function enablePushNotifications({ forceRefresh = false } = {}) {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    throw new Error("Web push is not configured for this site.");
  }
  if (!globalThis.Notification || !globalThis.navigator?.serviceWorker) {
    if (isAppleMobileDevice()) {
      throw new Error("On iPhone or iPad, web push requires iOS/iPadOS 16.4 or later. Add this site to your Home Screen and open it from the installed app, not a browser tab.");
    }
    throw new Error("This browser does not support web push notifications.");
  }

  let permission = globalThis.Notification.permission;
  if (permission === "default") {
    permission = await globalThis.Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error("Notifications are blocked for this site. Allow them in your browser settings and try again.");
  }
  if (!(await isSupported())) {
    if (isAppleMobileDevice()) {
      throw new Error("Web push requires iOS/iPadOS 16.4 or later and this site opened as a Home Screen app. Add it to your Home Screen, launch it there, and try again.");
    }
    throw new Error("Web push is unavailable in this browser context. Use a regular browser window with notifications enabled.");
  }

  const registration = await preparePushServiceWorker();
  const messaging = getMessaging(app);
  if (forceRefresh) {
    await deleteToken(messaging);
  }
  let token;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The browser push service rejected registration. Confirm the VAPID key belongs to this Firebase project, then try a regular Chrome window with Brave Shields, privacy extensions, and VPN/firewall filtering turned off.");
    }
    throw error;
  }
  if (!token) {
    throw new Error("Firebase did not return a push token. Check notification permission and try again.");
  }

  const registerPushToken = httpsCallable(
    getFunctions(app, "asia-southeast1"),
    "registerPushToken",
  );
  await registerPushToken({ token });
  if (auth.currentUser?.uid) {
    try {
      globalThis.localStorage?.setItem(
        `${PUSH_ENABLED_KEY_PREFIX}${auth.currentUser.uid}`,
        "true",
      );
    } catch {
      // Push registration still succeeds when browser storage is unavailable.
    }
  }
  return true;
}