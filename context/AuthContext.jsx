<<<<<<< HEAD
import { createContext, useContext, useEffect, useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app, auth } from "../src/firebase";
=======
import { createContext, useContext, useState } from "react";
import { router } from "expo-router";
import { DUMMY_ADMIN_CREDENTIALS } from "@/constants/adminCredentials";
import { DUMMY_CUSTOMER_CREDENTIALS } from "@/constants/customerCredentials";
>>>>>>> a56f57b063d88dff145576ae9704a1c67983ed52

<<<<<<< HEAD
=======
// TEMP mock auth — swap the inside of this for real Firebase auth
// state later (onAuthStateChanged, signInWithEmailAndPassword, etc).
//
// `role` is one of: null (signed out) | "customer" | "admin".
// `isLoggedIn` is kept as a derived boolean (true only for the
// customer role) so every existing screen that already uses
// `isLoggedIn`/`login`/`logout` keeps working unchanged -- only the
// admin flow needed new additions (`isAdmin`, `loginAsAdmin`).
>>>>>>> a56f57b063d88dff145576ae9704a1c67983ed52
const AuthContext = createContext(null);

async function getMpinSetup() {
  try {
    const getMpinStatus = httpsCallable(getFunctions(app, "asia-southeast1"), "getMpinStatus");
    const result = await getMpinStatus();
    return result.data?.mpinSetup === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
<<<<<<< HEAD
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [mpinSetup, setMpinSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);
=======
  const [role, setRole] = useState(null);
>>>>>>> a56f57b063d88dff145576ae9704a1c67983ed52

<<<<<<< HEAD
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setIsLoggedIn(Boolean(user));
      setPinVerified(false);
=======
  const login = (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim().toLowerCase();
    const isValid =
      normalizedEmail === DUMMY_CUSTOMER_CREDENTIALS.email.toLowerCase() &&
      normalizedPassword === DUMMY_CUSTOMER_CREDENTIALS.password.toLowerCase();
    if (isValid) {
      setRole("customer");
      setTimeout(() => router.replace("/(tabs)"), 0);
    }
    return isValid;
  };
>>>>>>> a56f57b063d88dff145576ae9704a1c67983ed52

<<<<<<< HEAD
      if (!user) {
        setRole(null);
        setMpinSetup(false);
        setAuthReady(true);
        return;
      }

      const token = await user.getIdTokenResult();
      setRole(token.claims.role || token.claims.userRole || "member");
      setMpinSetup(await getMpinSetup());
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdTokenResult();
    setRole(token.claims.role || token.claims.userRole || "member");
    setMpinSetup(await getMpinSetup());
    setPinVerified(false);
  };
  const verifyPin = () => setPinVerified(true);
  const completeMpinSetup = () => setMpinSetup(true);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, pinVerified, mpinSetup, authReady, login, verifyPin, completeMpinSetup, logout }}>
      {children}
    </AuthContext.Provider>
  );
=======
  // Returns true/false so the admin login screen can show an error
  // without needing its own separate credential-checking logic.
  const loginAsAdmin = (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim().toLowerCase();
    const allowedEmails = [
      DUMMY_ADMIN_CREDENTIALS.email,
      "admin@email.com",
      "admin@example.com",
      "admin@company.com",
    ];
    const isValid =
      allowedEmails.includes(normalizedEmail) &&
      normalizedPassword === DUMMY_ADMIN_CREDENTIALS.password.toLowerCase();
    if (isValid) {
      setRole("admin");
      setTimeout(() => router.replace("/admin"), 0);
    }
    return isValid;
  };

  const logout = () => {
    setRole(null);
    setTimeout(() => router.replace("/login"), 0);
  };

  const value = {
    role,
    isLoggedIn: role === "customer",
    isAdmin: role === "admin",
    login,
    loginAsAdmin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
>>>>>>> a56f57b063d88dff145576ae9704a1c67983ed52
}

export function useAuth() {
  return useContext(AuthContext);
}