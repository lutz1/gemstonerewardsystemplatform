import { Link } from "react-router-dom";

/**
 * Temporary placeholder for pages that are linked-to but not yet built
 * (Forgot Password, Apply for Membership, Privacy, Terms, Help).
 * Replace each route in App.jsx with a real page as you build them.
 */
export default function ComingSoonPage({ title }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        background: "var(--background)",
        color: "var(--on-surface)",
        fontFamily: "'Hanken Grotesk', sans-serif",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "28px" }}>
        {title}
      </h1>
      <p style={{ color: "var(--on-surface-variant)" }}>
        This page hasn't been built yet.
      </p>
      <Link to="/login" style={{ color: "var(--primary)" }}>
        ← Back to Login
      </Link>
    </div>
  );
}