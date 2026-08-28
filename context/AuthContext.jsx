import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app, auth } from "../src/firebase";

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
}

export function useAuth() {
  return useContext(AuthContext);
}