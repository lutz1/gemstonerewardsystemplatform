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
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import PinVerification from "./components/PinVerification/PinVerification";
import PushNotificationPrompt from "./components/PushNotificationPrompt/PushNotificationPrompt";
import AdminPage from "./pages/Admin/AdminPage";
import AdminPackagesPage from "./pages/Admin/Packages/AdminPackagesPage";
import AdminProfilePage from "./pages/Admin/Profile/AdminProfilePage";
import AdminSettingsPage from "./pages/Admin/Settings/AdminSettingsPage";
import SellerApplicationDashboard from "./pages/Admin/SellerApplications/SellerApplicationDashboard";
import SellerApplicationList from "./pages/Admin/SellerApplications/SellerApplicationList";
import SellerManagementList from "./pages/Admin/SellerApplications/SellerManagementList";
import SellerApplicationDetailsPage from "./pages/Admin/SellerApplications/components/SellerApplicationDetailsPage";
import UserManagementPage from "./pages/Admin/UserManagement/UserManagementPage";
import WithdrawalRequestsPage from "./pages/Admin/Withdrawals/WithdrawalRequestsPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DirectReferralsPage from "./pages/DirectReferrals/DirectReferralsPage";
import ExchangePage from "./pages/Exchange/ExchangePage";
import ForgotPasswordPage from "./pages/ForgotPassword/ForgotPasswordPage";
import LoginPage from "./pages/Login/LoginPage";
import MarketPlaceDashboard from "./pages/MarketPlace/MarketPlaceDashboard";
import MarketPlaceCart from "./pages/MarketPlace/MarketPlaceCart";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import PackageDetailPage from "./pages/PackageDetail/ProductsPage";
import PrivacyPage from "./pages/Privacy/PrivacyPage";
import ProductsPage from "./pages/Products/ProductsPage";
import TransactionHistoryPage from "./pages/Profile/ProfilePage";
import ChangePasswordPage from "./pages/ProfileAccount/ChangePasswordPage";
import ChangeTinPage from "./pages/ProfileAccount/ChangeTinPage";
import EditProfilePage from "./pages/ProfileAccount/EditProfilePage";
import QrPaymentPage from "./pages/QrPayment/QrPaymentPage";
import RegisterPage from "./pages/Register/RegisterPage";
import TermsPage from "./pages/Terms/TermsPage";
import TransactionLogsPage from "./pages/TransactionLogs/TransactionLogsPage";
import VerifyEmailPage from "./pages/VerifyEmail/VerifyEmailPage";

function ProtectedRoute({ children, allowedRoles, requirePin = true }) {
  const location = useLocation();
  const { isLoggedIn, role, pinVerified, authReady } = useAuth();

  if (!authReady) {
    return <LoadingScreen label="Loading your account..." />;
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
        <PushNotificationPrompt />
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* ── App pages ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/dashboard" element={<AdminPage />} />
            <Route path="/admin/packages" element={<AdminPackagesPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/withdrawals" element={<WithdrawalRequestsPage />} />
            <Route
              path="/admin/seller-applications"
              element={<SellerApplicationDashboard />}
            />
            <Route
              path="/admin/seller-applications/list"
              element={<SellerApplicationList />}
            />
            <Route
              path="/admin/seller-applications/sellers"
              element={<SellerManagementList />}
            />
            <Route
              path="/admin/seller-applications/:userId/:applicationId"
              element={<SellerApplicationDetailsPage />}
            />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route
              path="/admin/notifications"
              element={<NotificationsPage isAdmin />}
            />
          </Route>

          <Route
            element={<ProtectedRoute allowedRoles={["member", "leader", "ceo", "admin"]} />}
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/direct-referrals" element={<DirectReferralsPage />} />
            <Route
              path="/network-referrals"
              element={<DirectReferralsPage referralType="network" />}
            />
            <Route path="/purchase-codes" element={<TransactionLogsPage />} />
            <Route path="/store" element={<MarketPlaceDashboard />} />
            <Route path="/store/cart" element={<MarketPlaceCart />} />
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
            element={<PrivacyPage />}
          />
          <Route
            path="/terms"
            element={<TermsPage />}
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
