import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { createContext, useContext, useEffect, useState } from "react";
import { app, auth } from "../src/firebase";

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
    };
  } catch {
    return { mpinSetup: false, role: "member" };
  }
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [pinVerified, setPinVerified] = useState(() => readStoredPinVerified());
  const [mpinSetup, setMpinSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setIsLoggedIn(Boolean(user));

      if (!user) {
        setRole(null);
        setMpinSetup(false);
        setPinVerified(false);
        writeStoredPinVerified(false);
        setAuthReady(true);
        return;
      }

      const token = await user.getIdTokenResult();
      const status = await getAccountStatus();
      const nextRole = status.role || token.claims.role || token.claims.userRole || "member";
      const hasValidatedPin = readStoredPinVerified();

      setRole(nextRole);
      setMpinSetup(status.mpinSetup);
      setPinVerified(hasValidatedPin);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdTokenResult();
    const status = await getAccountStatus();
    const nextRole = status.role || token.claims.role || token.claims.userRole || "member";
    setRole(nextRole);
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
    <AuthContext.Provider value={{ isLoggedIn, role, pinVerified, mpinSetup, authReady, login, verifyPin, completeMpinSetup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}