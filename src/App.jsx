import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DirectReferralsPage from "./pages/DirectReferrals/DirectReferralsPage";
import TransactionHistoryPage from "./pages/TransactionHistory/TransactionHistoryPage";
import PurchaseCodesPage from "./pages/PurchaseCodes/PurchaseCodesPage";
import ComingSoonPage from "./components/ComingSoonPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth ─────────────────────────────────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ComingSoonPage title="Forgot Password" />} />
        <Route path="/register"        element={<ComingSoonPage title="Apply for Membership" />} />

        {/* ── App pages ─────────────────────────────────────────── */}
        <Route path="/dashboard"        element={<DashboardPage />} />
        <Route path="/direct-referrals" element={<DirectReferralsPage />} />
        <Route path="/purchase-codes"   element={<PurchaseCodesPage />} />
        <Route path="/transactions"     element={<TransactionHistoryPage />} />

        {/* ── Footer / legal ─────────────────────────────────────── */}
        <Route path="/privacy" element={<ComingSoonPage title="Privacy Policy" />} />
        <Route path="/terms"   element={<ComingSoonPage title="Terms of Service" />} />
        <Route path="/help"    element={<ComingSoonPage title="Help Center" />} />

        {/* ── Defaults ──────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}