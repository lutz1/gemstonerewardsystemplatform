import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfileAccountPage.css";

export default function ChangeTinPage() {
  const navigate = useNavigate();
  const [tin, setTin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!tin.trim()) {
      setError("Please enter your TIN code.");
      return;
    }

    setError("");
    setSaving(true);
    window.setTimeout(() => navigate(-1), 800);
  };

  return (
    <div className="profile-account-root">
      <header className="profile-account-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1>TIN Code</h1>
        <span />
      </header>
      <main className="profile-account-main">
        <form className="profile-account-card" onSubmit={handleSubmit}>
          <p className="profile-account-eyebrow">Account details</p>
          <p className="profile-account-subtitle">
            Keep your tax identification details current.
          </p>
          {error && (
            <p className="profile-account-message error" role="alert">
              {error}
            </p>
          )}
          <label>
            TIN Code
            <input
              required
              inputMode="numeric"
              placeholder="e.g. 123-456-789"
              value={tin}
              onChange={(event) => setTin(event.target.value)}
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
