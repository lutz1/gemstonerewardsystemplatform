import { createContext, useContext, useState } from "react";
import { router } from "expo-router";
import { DUMMY_ADMIN_CREDENTIALS } from "@/constants/adminCredentials";
import { DUMMY_CUSTOMER_CREDENTIALS } from "@/constants/customerCredentials";

// TEMP mock auth — swap the inside of this for real Firebase auth
// state later (onAuthStateChanged, signInWithEmailAndPassword, etc).
//
// `role` is one of: null (signed out) | "customer" | "admin".
// `isLoggedIn` is kept as a derived boolean (true only for the
// customer role) so every existing screen that already uses
// `isLoggedIn`/`login`/`logout` keeps working unchanged -- only the
// admin flow needed new additions (`isAdmin`, `loginAsAdmin`).
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null);

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
}

export function useAuth() {
  return useContext(AuthContext);
}