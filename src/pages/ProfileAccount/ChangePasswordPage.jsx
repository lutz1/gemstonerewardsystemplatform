import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import "./ProfileAccountPage.css";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [state, setState] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.current || !form.next || !form.confirm) {
      setState({ type: "error", message: "Please fill in all fields." });
      return;
    }
    if (form.next !== form.confirm) {
      setState({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (form.next.length < 6) {
      setState({
        type: "error",
        message: "Your new password must be at least 6 characters.",
      });
      return;
    }
    const user = auth.currentUser;
    if (!user?.email) {
      setState({ type: "error", message: "No signed-in account was found." });
      return;
    }
    setSaving(true);
    setState({ type: "", message: "" });
    try {
      const credential = EmailAuthProvider.credential(user.email, form.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.next);
      setState({ type: "success", message: "Password changed successfully." });
      setForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      setState({
        type: "error",
        message:
          error?.code === "auth/invalid-credential"
            ? "Current password is incorrect."
            : "Unable to change your password.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-account-root">
      <header className="profile-account-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1>Change Password</h1>
        <span />
      </header>
      <main className="profile-account-main">
        <form className="profile-account-card" onSubmit={handleSubmit}>
          <p className="profile-account-eyebrow">Security</p>
          <p className="profile-account-subtitle">
            Use a strong password to protect your account.
          </p>
          {state.message && (
            <p
              className={`profile-account-message ${state.type}`}
              role={state.type === "error" ? "alert" : "status"}
            >
              {state.message}
            </p>
          )}
          <label>
            Current Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={(event) =>
                setForm({ ...form, current: event.target.value })
              }
            />
          </label>
          <label>
            New Password
            <input
              required
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(event) =>
                setForm({ ...form, next: event.target.value })
              }
            />
          </label>
          <label>
            Confirm New Password
            <input
              required
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) =>
                setForm({ ...form, confirm: event.target.value })
              }
            />
          </label>
          <button
            className="profile-account-submit"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "SAVE CHANGES"}
          </button>
        </form>
      </main>
    </div>
  );
}
