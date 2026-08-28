import { useState } from "react";

export default function QuickAccess({ loading, error, onSubmit, onBack }) {
  const [username, setUsername] = useState("");
  const [mpin, setMpin] = useState("");
  const [showMpin, setShowMpin] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ username, mpin });
  };

  return (
    <form className="lp-form" onSubmit={handleSubmit} noValidate>
      {error && <p className="lp-error">{error}</p>}

      <div className="lp-field">
        <label className="lp-field-label" htmlFor="quick-username">Username</label>
        <div className="lp-input-wrap">
          <span className="lp-input-icon material-symbols-outlined" aria-hidden="true">person</span>
          <input
            id="quick-username"
            type="text"
            className="lp-input"
            placeholder="Enter your username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
      </div>

      <div className="lp-field">
        <label className="lp-field-label" htmlFor="quick-mpin">MPIN</label>
        <div className="lp-input-wrap">
          <span className="lp-input-icon material-symbols-outlined" aria-hidden="true">pin</span>
          <input
            id="quick-mpin"
            type={showMpin ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className="lp-input has-right"
            placeholder="Enter your MPIN"
            autoComplete="current-password"
            value={mpin}
            onChange={(event) => setMpin(event.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            className="lp-eye-btn"
            aria-label={showMpin ? "Hide MPIN" : "Show MPIN"}
            onClick={() => setShowMpin((value) => !value)}
          >
            <span className="material-symbols-outlined">
              {showMpin ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      <button type="submit" className="lp-submit-btn" disabled={loading}>
        {loading ? (
          <>
            <span className="lp-spin material-symbols-outlined">sync</span>
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>QUICK ACCESS</span>
            <span className="lp-btn-icon material-symbols-outlined">arrow_forward</span>
          </>
        )}
      </button>

      <button type="button" className="lp-mode-btn" onClick={onBack} disabled={loading}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Use email and password instead
      </button>
    </form>
  );
}
