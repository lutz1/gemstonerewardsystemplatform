import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
    useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import ComingSoonPage from "./components/ComingSoonPage";
import PinVerification from "./components/PinVerification/PinVerification";
import AdminPage from "./pages/Admin/AdminPage";
import AdminProfilePage from "./pages/Admin/Profile/AdminProfilePage";
import AdminSettingsPage from "./pages/Admin/Settings/AdminSettingsPage";
import UserManagementPage from "./pages/Admin/UserManagement/UserManagementPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DirectReferralsPage from "./pages/DirectReferrals/DirectReferralsPage";
import ExchangePage from "./pages/Exchange/ExchangePage";
import LoginPage from "./pages/Login/LoginPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import PackageDetailPage from "./pages/PackageDetail/ProductsPage";
import ProductsPage from "./pages/Products/ProductsPage";
import TransactionHistoryPage from "./pages/Profile/ProfilePage";
import ChangePasswordPage from "./pages/ProfileAccount/ChangePasswordPage";
import ChangeTinPage from "./pages/ProfileAccount/ChangeTinPage";
import EditProfilePage from "./pages/ProfileAccount/EditProfilePage";
import PurchaseCodesPage from "./pages/PurchaseCodes/PurchaseCodesPage";
import QrPaymentPage from "./pages/QrPayment/QrPaymentPage";
import RegisterPage from "./pages/Register/RegisterPage";

function ProtectedRoute({ children, allowedRoles, requirePin = true }) {
  const location = useLocation();
  const { isLoggedIn, role, pinVerified, authReady } = useAuth();

  if (!authReady) {
    return <main className="auth-loading" role="status">Loading your account...</main>;
  }

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Auth ─────────────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/pin-verification"
            element={
              <ProtectedRoute requirePin={false}>
                <PinVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={<ComingSoonPage title="Forgot Password" />}
          />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── App pages ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/dashboard" element={<AdminPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route
              path="/admin/notifications"
              element={<NotificationsPage isAdmin />}
            />
          </Route>

          <Route
<<<<<<< HEAD
            element={<ProtectedRoute allowedRoles={["member", "leader", "ceo", "admin"]} />}
=======
            element={
              <ProtectedRoute allowedRoles={["member", "ceo", "admin"]} />
            }
>>>>>>> aead1989c638676b9b0021ff4664953b397839c3
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/direct-referrals" element={<DirectReferralsPage />} />
            <Route
              path="/network-referrals"
              element={<DirectReferralsPage referralType="network" />}
            />
            <Route path="/purchase-codes" element={<PurchaseCodesPage />} />
            <Route path="/profile" element={<TransactionHistoryPage />} />
            <Route path="/transactions" element={<TransactionHistoryPage />} />
            <Route path="/edit-profile" element={<EditProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/change-tin" element={<ChangeTinPage />} />
            <Route path="/exchange" element={<ExchangePage />} />
            <Route path="/exchange/:mode" element={<ExchangePage />} />

            {/* ── Purchase flow: package detail + QR payment ──────────── */}
            <Route
              path="/purchase-codes/package/:packageId"
              element={<PackageDetailPage />}
            />
            <Route
              path="/purchase-codes/package/:packageId/checkout"
              element={<QrPaymentPage />}
            />
          </Route>

          {/* ── Footer / legal ─────────────────────────────────────── */}
          <Route
            path="/privacy"
            element={<ComingSoonPage title="Privacy Policy" />}
          />
          <Route
            path="/terms"
            element={<ComingSoonPage title="Terms of Service" />}
          />
          <Route
            path="/help"
            element={<ComingSoonPage title="Help Center" />}
          />

          {/* ── Defaults ──────────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
