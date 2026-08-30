import { useState } from "react";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import "./AdminSettingsPage.css";

const defaultConfig = {
  defaultGemValue: 12.5,
  valueMode: "Auto-calculated",
  currency: "PHP",
  minExchangeValue: 100,
  approvalRequired: true,
  maintenanceMode: false,
  systemEmail: "support@gemstonecode.com",
};

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
  const [config, setConfig] = useState(defaultConfig);
  const [saved, setSaved] = useState(false);

  const updateField = (field, value) => {
    setConfig((currentValue) => ({ ...currentValue, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
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
                <strong>{config.defaultGemValue.toFixed(2)}</strong>
                <span>{config.currency}</span>
              </div>
              <small>Per GEM conversion value</small>
            </div>

            <div className="admin-settings-field-group">
              <label htmlFor="defaultGemValue">Default GEM Value</label>
              <div className="admin-settings-input-wrap">
                <span className="admin-settings-prefix">₱</span>
                <input
                  id="defaultGemValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.defaultGemValue}
                  onChange={(event) =>
                    updateField(
                      "defaultGemValue",
                      Number(event.target.value || 0),
                    )
                  }
                />
              </div>
            </div>

            <div className="admin-settings-field-group">
              <label htmlFor="valueMode">Value calculation mode</label>
              <select
                id="valueMode"
                value={config.valueMode}
                onChange={(event) =>
                  updateField("valueMode", event.target.value)
                }
              >
                <option>Auto-calculated</option>
                <option>Manual override</option>
                <option>Market based</option>
              </select>
            </div>
          </article>

          <article className="admin-settings-panel">
            <div className="admin-settings-panel-header">
              <div>
                <p className="admin-settings-panel-eyebrow">Operations</p>
                <h2>System rules</h2>
              </div>
            </div>

            <div className="admin-settings-form-grid">
              <div className="admin-settings-field-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={config.currency}
                  onChange={(event) =>
                    updateField("currency", event.target.value)
                  }
                >
                  <option>PHP</option>
                  <option>USD</option>
                </select>
              </div>

              <div className="admin-settings-field-group">
                <label htmlFor="minExchangeValue">Minimum exchange value</label>
                <div className="admin-settings-input-wrap">
                  <span className="admin-settings-prefix">₱</span>
                  <input
                    id="minExchangeValue"
                    type="number"
                    min="0"
                    step="10"
                    value={config.minExchangeValue}
                    onChange={(event) =>
                      updateField(
                        "minExchangeValue",
                        Number(event.target.value || 0),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="admin-settings-toggle-list">
              <ToggleRow
                label="Approval required"
                caption="Require admin approval before processing conversion requests."
                checked={config.approvalRequired}
                onToggle={() =>
                  updateField("approvalRequired", !config.approvalRequired)
                }
              />
              <ToggleRow
                label="Maintenance mode"
                caption="Temporarily pause member transactions and checkout flows."
                checked={config.maintenanceMode}
                onToggle={() =>
                  updateField("maintenanceMode", !config.maintenanceMode)
                }
              />
            </div>
          </article>

          <article className="admin-settings-panel">
            <div className="admin-settings-panel-header">
              <div>
                <p className="admin-settings-panel-eyebrow">Support</p>
                <h2>Contact settings</h2>
              </div>
            </div>

            <div className="admin-settings-field-group">
              <label htmlFor="systemEmail">Support email</label>
              <input
                id="systemEmail"
                type="email"
                value={config.systemEmail}
                onChange={(event) =>
                  updateField("systemEmail", event.target.value)
                }
              />
            </div>

            <div className="admin-settings-note">
              <span className="material-symbols-outlined" aria-hidden="true">
                info
              </span>
              <p>
                The system will use this default GEM value for all new
                conversions until a new override is published.
              </p>
            </div>
          </article>
        </section>

        <div className="admin-settings-actions">
          <button
            type="button"
            className="admin-settings-secondary-button"
            onClick={() => setConfig(defaultConfig)}
          >
            Reset
          </button>
          <button
            type="button"
            className="admin-settings-primary-button"
            onClick={handleSave}
          >
            Save configuration
          </button>
        </div>

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
