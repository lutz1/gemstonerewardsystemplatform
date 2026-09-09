import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles, requirePin = true }) {
  const location = useLocation();
  const { isLoggedIn, role, pinVerified, authReady } = useAuth();

  if (!authReady) return null;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requirePin && !pinVerified) {
    return <Navigate to="/pin-verification" replace />;
  }

  return children || <Outlet />;
}
