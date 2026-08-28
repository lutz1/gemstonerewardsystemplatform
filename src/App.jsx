import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import PinVerification from "./components/PinVerification/PinVerification";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DirectReferralsPage from "./pages/Products/ProductsPage";
import TransactionHistoryPage from "./pages/Profile/ProfilePage";
import PurchaseCodesPage from "./pages/PurchaseCodes/PurchaseCodesPage";
import PackageDetailPage from "./pages/PackageDetail/ProductsPage";
import QrPaymentPage from "./pages/QrPayment/QrPaymentPage";
import ComingSoonPage from "./components/ComingSoonPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        {/* ── Auth ─────────────────────────────────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/pin-verification" element={<ProtectedRoute requirePin={false}><PinVerification /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ComingSoonPage title="Forgot Password" />} />
        <Route path="/register"        element={<ComingSoonPage title="Apply for Membership" />} />

        {/* ── App pages ─────────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["member", "admin"]} />}>
          <Route path="/dashboard"        element={<DashboardPage />} />
          <Route path="/products"         element={<DirectReferralsPage />} />
          <Route path="/direct-referrals" element={<DirectReferralsPage />} />
          <Route path="/purchase-codes"   element={<PurchaseCodesPage />} />
          <Route path="/profile"          element={<TransactionHistoryPage />} />
          <Route path="/transactions"     element={<TransactionHistoryPage />} />

          {/* ── Purchase flow: package detail + QR payment ──────────── */}
          <Route path="/purchase-codes/package/:packageId"          element={<PackageDetailPage />} />
          <Route path="/purchase-codes/package/:packageId/checkout" element={<QrPaymentPage />} />
        </Route>

        {/* ── Footer / legal ─────────────────────────────────────── */}
        <Route path="/privacy" element={<ComingSoonPage title="Privacy Policy" />} />
        <Route path="/terms"   element={<ComingSoonPage title="Terms of Service" />} />
        <Route path="/help"    element={<ComingSoonPage title="Help Center" />} />

        {/* ── Defaults ──────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}