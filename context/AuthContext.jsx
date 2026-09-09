import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getToken } from "firebase/messaging";
import { createContext, useContext, useEffect, useState } from "react";
import { app, auth, messaging } from "../src/firebase";

const webPushSave = async (token) => {
  if (!token || !auth.currentUser) return;

  const saveWebPushToken = httpsCallable(
    getFunctions(app, "asia-southeast1"),
    "saveWebPushToken",
  );

  try {
    await saveWebPushToken({ token });
  } catch (error) {
    console.error("Failed to save web push token:", error);
  }
};

const requestBrowserPush = async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: 'BHIQi5JLMrYQwl0I4aDSjS3G0WNO1J3Aq4P7wE5C2gKpVjYb9Lk1cR2nT6mQ4uU0',
    });

    if (token) {
      await webPushSave(token);
    }

    return token;
  } catch (error) {
    console.error('Push registration error:', error);
    return null;
  }
};

const PIN_VERIFIED_KEY = "gemstone_pin_verified";

const readStoredPinVerified = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PIN_VERIFIED_KEY) === "true";
};

const writeStoredPinVerified = (isVerified) => {
  if (typeof window === "undefined") return;
  if (isVerified) {
    window.localStorage.setItem(PIN_VERIFIED_KEY, "true");
    return;
  }
  window.localStorage.removeItem(PIN_VERIFIED_KEY);
};

const AuthContext = createContext(null);

async function getAccountStatus() {
  try {
    const getMpinStatus = httpsCallable(getFunctions(app, "asia-southeast1"), "getMpinStatus");
    const result = await getMpinStatus();
    return {
      mpinSetup: result.data?.mpinSetup === true,
      role: result.data?.role || "member",
      username: result.data?.username || "",
      referralCode: result.data?.referralCode || "",
    };
  } catch {
    return {
      mpinSetup: false,
      role: "member",
      username: "",
      referralCode: "",
    };
  }
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pinVerified, setPinVerified] = useState(() => readStoredPinVerified());
  const [mpinSetup, setMpinSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      try {
        setIsLoggedIn(Boolean(user));

        if (!user) {
          setRole(null);
          setUsername("");
          setReferralCode("");
          setMpinSetup(false);
          setPinVerified(false);
          writeStoredPinVerified(false);
          return;
        }

        const token = await user.getIdTokenResult();
        const status = await getAccountStatus();
        const nextRole = status.role || token.claims.role || token.claims.userRole || "member";
        const hasValidatedPin = readStoredPinVerified();

        setRole(nextRole);
        setUsername(status.username || "");
        setReferralCode(status.referralCode || "");
        setMpinSetup(status.mpinSetup);
        setPinVerified(hasValidatedPin);

        if (typeof window !== 'undefined') {
          try {
            await requestBrowserPush();
          } catch (error) {
            console.error('Browser push setup failed:', error);
          }
        }
      } catch {
        setRole(user ? "member" : null);
        setUsername("");
        setReferralCode("");
        setMpinSetup(false);
        setPinVerified(false);
        writeStoredPinVerified(false);
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdTokenResult();
    const status = await getAccountStatus();
    const nextRole = status.role || token.claims.role || token.claims.userRole || "member";
    setRole(nextRole);
    setUsername(status.username || "");
    setReferralCode(status.referralCode || "");
    setMpinSetup(status.mpinSetup);
    setPinVerified(readStoredPinVerified());
  };
  const verifyPin = async (mpin) => {
    const verifyMpin = httpsCallable(getFunctions(app, "asia-southeast1"), "verifyMpin");
    await verifyMpin({ mpin });
    setPinVerified(true);
    writeStoredPinVerified(true);
  };
  const completeMpinSetup = async (mpin) => {
    const saveMpinSetup = httpsCallable(getFunctions(app, "asia-southeast1"), "completeMpinSetup");
    await saveMpinSetup({ mpin });
    setMpinSetup(true);
    setPinVerified(true);
    writeStoredPinVerified(true);
  };
  const logout = () => {
    setPinVerified(false);
    writeStoredPinVerified(false);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, username, referralCode, pinVerified, mpinSetup, authReady, login, verifyPin, completeMpinSetup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}