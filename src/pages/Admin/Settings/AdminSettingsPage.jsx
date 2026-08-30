import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import { app } from "../../../firebase";
import "./AdminSettingsPage.css";

// Persisted to localStorage so edits survive a page refresh. If this page
// ever talks to a real backend (Supabase, etc.), swap loadStoredConfig /
// the save handler below for the API calls and drop the localStorage bits.
const STORAGE_KEY = "admin-settings-config";

const defaultConfig = {
  defaultGemValue: "",
  currency: "PHP",
  minExchangeValue: 100,
  approvalRequired: true,
  maintenanceMode: false,
  systemEmail: "support@gemstonecode.com",
};

function loadStoredConfig() {
  if (typeof window === "undefined") return defaultConfig;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    // Merge over defaultConfig so a previously-stored blob missing a
    // field (e.g. after this page's shape changes) still fills in safely.
    return { ...defaultConfig, ...parsed };
  } catch {
    return defaultConfig;
  }
}

function ToggleRow({ label, caption, checked, onToggle }) {
  return (
    <div className="admin-settings-toggle-row">
      <div>
        <p>{label}</p>
        <span>{caption}</span>
      </div>
      <button
        type="button"
        className={`admin-settings-switch${checked ? " on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState(loadStoredConfig);
  const [saved, setSaved] = useState(false);
  const [isEditingGemValue, setIsEditingGemValue] = useState(false);
  const [showGemValueDisclaimer, setShowGemValueDisclaimer] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveError, setSaveError] = useState("");

  const updateField = (field, value) => {
    setConfig((currentValue) => ({ ...currentValue, [field]: value }));
    setSaved(false);
  };

  const handleEditGemValue = () => {
    setShowGemValueDisclaimer(true);
  };

  const handleConfirmGemValueEdit = () => {
    setShowGemValueDisclaimer(false);
    setIsEditingGemValue(true);
  };

  const handleSave = () => {
    setShowSaveConfirmation(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirmation(false);
    setIsSavingConfig(true);
    setSaveError("");

    try {
      const saveAdminSettings = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "saveAdminSettings",
      );

      const payload = {
        ...config,
        defaultGemValue:
          config.defaultGemValue === "" || config.defaultGemValue == null
            ? null
            : Number(config.defaultGemValue),
      };

      await saveAdminSettings(payload);

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch {
        // Storage can fail (private browsing, quota, disabled storage) —
        // the form still works in-session even if persistence doesn't.
      }

      setSaved(true);
    } catch (error) {
      setSaved(false);
      setSaveError(
        error?.message || "Failed to save configuration. Please try again.",
      );
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setSaved(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore — same reasoning as above
    }
  };

  return (
    <div className="admin-settings-root">
      <TopBar
        userName="Admin"
        userRole="Administrator"
        profilePath="/admin/profile"
      />

      <main className="admin-settings-main">
        <header className="admin-settings-header">
          <div>
            <p className="admin-settings-eyebrow">System</p>
            <h1 className="admin-settings-title">Settings</h1>
            <p className="admin-settings-subtitle">
              Configure platform-wide defaults for member value and operations.
            </p>
          </div>
        </header>

        <section className="admin-settings-grid">
          <article className="admin-settings-panel admin-settings-panel--accent">
            <div className="admin-settings-panel-header">
              <div>
                <p className="admin-settings-panel-eyebrow">Default pricing</p>
                <h2>Default GEM Value</h2>
              </div>
              <span className="admin-settings-badge">Live</span>
            </div>

            <div className="admin-settings-value-card">
              <div className="admin-settings-value-label">
                <span className="material-symbols-outlined" aria-hidden="true">
                  monetization_on
                </span>
                <span>Current default</span>
              </div>
              <div className="admin-settings-value-row">
                <strong>
                  {config.defaultGemValue === "" || config.defaultGemValue == null
                    ? "—"
                    : Number(config.defaultGemValue).toFixed(2)}
                </strong>
                <span>{config.currency}</span>
              </div>
              <small>Per GEM conversion value</small>
            </div>

            <div className="admin-settings-field-group">
              <div className="admin-settings-edit-header">
                <label htmlFor="defaultGemValue">Default GEM Value</label>
                <button
                  type="button"
                  className="admin-settings-inline-button"
                  onClick={() => {
                    if (isEditingGemValue) {
                      setIsEditingGemValue(false);
                      return;
                    }
                    handleEditGemValue();
                  }}
                >
                  {isEditingGemValue ? "Cancel" : "Edit Gem Value"}
                </button>
              </div>
              <div className="admin-settings-input-wrap">
                <span className="admin-settings-prefix">₱</span>
                <input
                  id="defaultGemValue"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={config.defaultGemValue}
                  readOnly={!isEditingGemValue}
                  onWheel={(event) => event.preventDefault()}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (!/^\d*\.?\d*$/.test(nextValue)) {
                      return;
                    }
                    if (nextValue.split(".").length > 2) {
                      return;
                    }
                    updateField("defaultGemValue", nextValue);
                  }}
                />
              </div>
            </div>
          </article>
        </section>

        <div className="admin-settings-actions">
          <button
            type="button"
            className="admin-settings-primary-button"
            onClick={handleSave}
            disabled={isSavingConfig}
          >
            {isSavingConfig ? "Saving..." : "Save configuration"}
          </button>
        </div>

        {saveError && (
          <div className="admin-settings-error" role="alert">
            {saveError}
          </div>
        )}

        {showGemValueDisclaimer && (
          <div
            className="admin-settings-modal-backdrop"
            role="presentation"
            onMouseDown={() => setShowGemValueDisclaimer(false)}
          >
            <div
              className="admin-settings-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="admin-settings-modal-header">
                <h2>Important notice</h2>
                <button
                  type="button"
                  onClick={() => setShowGemValueDisclaimer(false)}
                  aria-label="Close disclaimer"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>

              <p className="admin-settings-modal-message">
                Updating the Default GEM Value will change the platform-wide
                conversion rate used for new transactions. Please confirm before
                saving the change.
              </p>

              <div className="admin-settings-modal-actions">
                <button
                  type="button"
                  className="admin-settings-secondary-button"
                  onClick={() => setShowGemValueDisclaimer(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-settings-primary-button"
                  onClick={handleConfirmGemValueEdit}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {showSaveConfirmation && (
          <div
            className="admin-settings-modal-backdrop"
            role="presentation"
            onMouseDown={() => setShowSaveConfirmation(false)}
          >
            <div
              className="admin-settings-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="admin-settings-modal-header">
                <h2>Confirm save</h2>
                <button
                  type="button"
                  onClick={() => setShowSaveConfirmation(false)}
                  aria-label="Close save confirmation"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>

              <p className="admin-settings-modal-message">
                Save the current admin settings to the platform configuration?
              </p>

              <div className="admin-settings-modal-actions">
                <button
                  type="button"
                  className="admin-settings-secondary-button"
                  onClick={() => setShowSaveConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-settings-primary-button"
                  onClick={handleConfirmSave}
                  disabled={isSavingConfig}
                >
                  {isSavingConfig ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {saved && (
          <div
            className="admin-settings-success"
            role="status"
            aria-live="polite"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            Configuration saved successfully.
          </div>
        )}
      </main>

      <BottomNav activeItem="settings" variant="admin" />
    </div>
  );
}
