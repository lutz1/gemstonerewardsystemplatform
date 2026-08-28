import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { createContext, useContext, useEffect, useState } from "react";
import { app, auth } from "../src/firebase";

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
  const [pinVerified, setPinVerified] = useState(false);
  const [mpinSetup, setMpinSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setIsLoggedIn(Boolean(user));
      setPinVerified(false);

      if (!user) {
        setRole(null);
        setMpinSetup(false);
        setAuthReady(true);
        return;
      }

      const token = await user.getIdTokenResult();
      const status = await getAccountStatus();
      setRole(status.role || token.claims.role || token.claims.userRole || "member");
      setMpinSetup(status.mpinSetup);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdTokenResult();
    const status = await getAccountStatus();
    setRole(status.role || token.claims.role || token.claims.userRole || "member");
    setMpinSetup(status.mpinSetup);
    setPinVerified(false);
  };
  const verifyPin = async (mpin) => {
    const verifyMpin = httpsCallable(getFunctions(app, "asia-southeast1"), "verifyMpin");
    await verifyMpin({ mpin });
    setPinVerified(true);
  };
  const completeMpinSetup = async (mpin) => {
    const saveMpinSetup = httpsCallable(getFunctions(app, "asia-southeast1"), "completeMpinSetup");
    await saveMpinSetup({ mpin });
    setMpinSetup(true);
    setPinVerified(true);
  };
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, pinVerified, mpinSetup, authReady, login, verifyPin, completeMpinSetup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}