import { createContext, useContext, useState } from "react";

// TEMP mock auth — swap the inside of this for real Firebase auth
// state later (onAuthStateChanged, signInWithEmailAndPassword, etc).
// Keeping the same shape (isLoggedIn, login, logout) means nothing
// that USES this context has to change when we do that swap.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = () => setIsLoggedIn(true);
  const logout = () => setIsLoggedIn(false);

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
