import { updateProfile } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import "./ProfileAccountPage.css";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const [name, setName] = useState(currentUser?.displayName || "Alexis Rivera");
  const [email, setEmail] = useState(
    currentUser?.email || "alexis.rivera@example.com",
  );
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setState({ type: "error", message: "Name and email are required." });
      return;
    }
    setSaving(true);
    setState({ type: "", message: "" });
    try {
      if (currentUser)
        await updateProfile(currentUser, { displayName: name.trim() });
      setState({ type: "success", message: "Profile updated successfully." });
      setTimeout(() => navigate("/profile"), 800);
    } catch (error) {
      setState({
        type: "error",
        message: error?.message || "Unable to update your profile.",
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
        <h1>Edit Profile</h1>
        <span />
      </header>
      <main className="profile-account-main">
        <form className="profile-account-card" onSubmit={handleSubmit}>
          <p className="profile-account-eyebrow">Account details</p>
          <p className="profile-account-subtitle">
            Keep your contact information current.
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
            Full Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Email Address
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Phone Number
            <input
              type="tel"
              placeholder="e.g. +1 (555) 214-7788"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label>
            Location
            <input
              placeholder="e.g. Austin, TX"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
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
