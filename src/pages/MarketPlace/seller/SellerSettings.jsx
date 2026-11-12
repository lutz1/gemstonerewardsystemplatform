import { useEffect, useState } from "react";
import { COURIERS, HANDLING_OPTIONS, NOTIFY_EVENTS, peso } from "./sellerData";
import "./SellerSettings.css";

// `settings` + `onSave` come from SellerDashboard.jsx so the header (store name, seller name) stays in sync.
// Swap onSave for a Firestore write when ready.

const SECTIONS = [
  { key: "store", label: "Store", icon: "storefront", hint: "How your shop appears to buyers" },
  { key: "shipping", label: "Shipping", icon: "local_shipping", hint: "Couriers and handling time" },
  { key: "notifications", label: "Notifications", icon: "notifications", hint: "What you hear about, and how" },
  { key: "account", label: "Account", icon: "person", hint: "Your name and password" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAGLINE_MAX = 120;

function validate(d) {
  const e = {};
  if (!d.store.name.trim()) e["store.name"] = "Enter your store name.";
  if (d.store.phone.replace(/\D/g, "").length < 10) e["store.phone"] = "Enter a valid phone number.";
  if (!EMAIL_RE.test(d.store.email.trim())) e["store.email"] = "Enter a valid email address.";
  if (!d.shipping.couriers.length) e["shipping.couriers"] = "Choose at least one courier.";
  if (Number(d.shipping.freeAbove) < 0) e["shipping.freeAbove"] = "Amount can't be negative.";
  if (!d.account.displayName.trim()) e["account.displayName"] = "Enter your name.";
  return e;
}

function Field({ label, hint, error, group = false, wide = false, children }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag
      className={`sl-set-field${error ? " has-error" : ""}${wide ? " is-wide" : ""}`}
      {...(group ? { role: "group", "aria-label": label } : {})}
    >
      <span className="sl-set-label">{label}</span>
      {children}
      {error ? (
        <small className="sl-set-error" role="alert">{error}</small>
      ) : (
        hint && <small className="sl-set-hint">{hint}</small>
      )}
    </Tag>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="sl-set-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export default function SellerSettings({ settings, onSave }) {
  const [section, setSection] = useState("store");
  const [draft, setDraft] = useState(settings);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const active = SECTIONS.find((s) => s.key === section);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (group, key, value) => {
    setDraft((d) => ({ ...d, [group]: { ...d[group], [key]: value } }));
    setErrors((er) => ({ ...er, [`${group}.${key}`]: undefined }));
  };

  const toggleCourier = (name) => {
    const list = draft.shipping.couriers;
    update("shipping", "couriers", list.includes(name) ? list.filter((c) => c !== name) : [...list, name]);
  };

  const setNotify = (event, channel, value) =>
    setDraft((d) => ({
      ...d,
      notifications: { ...d.notifications, [event]: { ...d.notifications[event], [channel]: value } },
    }));

  const save = () => {
    const found = validate(draft);
    if (Object.keys(found).length) {
      setErrors(found);
      // Jump to the first section that has a problem so the error is visible.
      const first = Object.keys(found)[0].split(".")[0];
      setSection(first);
      setToast("Fix the highlighted fields to save");
      return;
    }
    const clean = {
      ...draft,
      shipping: { ...draft.shipping, freeAbove: Number(draft.shipping.freeAbove) || 0 },
    };
    onSave(clean);
    setDraft(clean);
    setErrors({});
    setToast("Settings saved");
  };

  const discard = () => { setDraft(settings); setErrors({}); };

  const changePassword = () => {
    const e = {};
    if (!pw.current) e.current = "Enter your current password.";
    if (pw.next.length < 8) e.next = "Use at least 8 characters.";
    if (pw.confirm !== pw.next) e.confirm = "Passwords don't match.";
    setPwErrors(e);
    if (Object.keys(e).length) return;
    // TODO: wire to Firebase Auth (reauthenticateWithCredential + updatePassword).
    setPw({ current: "", next: "", confirm: "" });
    setToast("Password updated");
  };

  const { store, shipping, notifications, account } = draft;

  return (
    <div className="sl-set">
      <div className="sl-set-head">
        <h1>Settings</h1>
        <p>Manage your store, shipping, alerts and account in one place.</p>
      </div>

      <div className="sl-set-layout">
        <nav className="sl-set-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              type="button"
              key={s.key}
              className={`sl-set-nav-item${section === s.key ? " is-active" : ""}`}
              aria-current={section === s.key ? "page" : undefined}
              onClick={() => setSection(s.key)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{s.icon}</span>
              {s.label}
              {Object.keys(errors).some((k) => errors[k] && k.startsWith(`${s.key}.`)) && (
                <i className="sl-set-dot" aria-label="Has errors" />
              )}
            </button>
          ))}
        </nav>

        <section className="sl-set-panel" aria-labelledby="sl-set-title">
          <header className="sl-set-panel-head">
            <h2 id="sl-set-title">{active.label}</h2>
            <p>{active.hint}</p>
          </header>

          {section === "store" && (
            <div className="sl-set-grid">
              <Field label="Store name" error={errors["store.name"]}>
                <input type="text" value={store.name} maxLength={40} onChange={(e) => update("store", "name", e.target.value)} />
              </Field>
              <Field label="Contact phone" error={errors["store.phone"]}>
                <input type="tel" inputMode="tel" value={store.phone} onChange={(e) => update("store", "phone", e.target.value)} />
              </Field>
              <Field label="Contact email" error={errors["store.email"]}>
                <input type="email" inputMode="email" value={store.email} onChange={(e) => update("store", "email", e.target.value)} />
              </Field>
              <Field label="Store location" hint="Shown to buyers as where you ship from.">
                <input type="text" value={store.city} onChange={(e) => update("store", "city", e.target.value)} />
              </Field>
              <Field label="Tagline" wide hint={`${store.tagline.length}/${TAGLINE_MAX} characters`}>
                <textarea
                  rows={3}
                  value={store.tagline}
                  maxLength={TAGLINE_MAX}
                  onChange={(e) => update("store", "tagline", e.target.value)}
                />
              </Field>

              <div className="sl-set-toggle-row is-wide">
                <div>
                  <strong>Vacation mode</strong>
                  <p>Hide your listings and pause new orders while you&apos;re away. Existing orders aren&apos;t affected.</p>
                </div>
                <Switch checked={store.vacation} label="Vacation mode" onChange={(v) => update("store", "vacation", v)} />
              </div>
            </div>
          )}

          {section === "shipping" && (
            <div className="sl-set-grid">
              <Field label="Couriers you use" group wide error={errors["shipping.couriers"]} hint="Buyers can only pick from these at checkout.">
                <div className="sl-set-chips">
                  {COURIERS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      aria-pressed={shipping.couriers.includes(c)}
                      className={shipping.couriers.includes(c) ? "is-active" : ""}
                      onClick={() => toggleCourier(c)}
                    >
                      {shipping.couriers.includes(c) && (
                        <span className="material-symbols-outlined" aria-hidden="true">check</span>
                      )}
                      {c}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Handling time" group hint="How long you need to pack and hand over an order.">
                <div className="sl-set-segment" role="radiogroup" aria-label="Handling time">
                  {HANDLING_OPTIONS.map((o) => (
                    <button
                      type="button"
                      role="radio"
                      key={o.key}
                      aria-checked={shipping.handling === o.key}
                      className={shipping.handling === o.key ? "is-active" : ""}
                      onClick={() => update("shipping", "handling", o.key)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="Free shipping above (₱)"
                error={errors["shipping.freeAbove"]}
                hint={Number(shipping.freeAbove) > 0 ? `Orders over ${peso(shipping.freeAbove)} ship free.` : "Set to 0 to turn off."}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={shipping.freeAbove}
                  onChange={(e) => update("shipping", "freeAbove", e.target.value)}
                />
              </Field>

              <Field label="Ship-from address" wide>
                <input type="text" value={shipping.shipFrom} onChange={(e) => update("shipping", "shipFrom", e.target.value)} />
              </Field>
            </div>
          )}

          {section === "notifications" && (
            <div className="sl-set-notify" role="table" aria-label="Notification preferences">
              <div className="sl-set-notify-row is-head" role="row">
                <span role="columnheader">Alert me about</span>
                <span role="columnheader">Push</span>
                <span role="columnheader">Email</span>
              </div>
              {NOTIFY_EVENTS.map((ev) => (
                <div className="sl-set-notify-row" role="row" key={ev.key}>
                  <div role="cell">
                    <strong>{ev.label}</strong>
                    <p>{ev.hint}</p>
                  </div>
                  <div role="cell">
                    <Switch
                      checked={notifications[ev.key].push}
                      label={`${ev.label} push notifications`}
                      onChange={(v) => setNotify(ev.key, "push", v)}
                    />
                  </div>
                  <div role="cell">
                    <Switch
                      checked={notifications[ev.key].email}
                      label={`${ev.label} email`}
                      onChange={(v) => setNotify(ev.key, "email", v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "account" && (
            <>
              <div className="sl-set-grid">
                <Field label="Display name" error={errors["account.displayName"]} hint="Shown in the Seller Center header.">
                  <input type="text" value={account.displayName} maxLength={40} onChange={(e) => update("account", "displayName", e.target.value)} />
                </Field>
                <Field label="Login email" hint="Contact support to change your login email.">
                  <input type="email" value={account.email} readOnly />
                </Field>
              </div>

              <div className="sl-set-subhead">
                <h3>Change password</h3>
                <p>Use at least 8 characters.</p>
              </div>
              <div className="sl-set-grid">
                <Field label="Current password" error={pwErrors.current}>
                  <input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                </Field>
                <span className="sl-set-spacer" aria-hidden="true" />
                <Field label="New password" error={pwErrors.next}>
                  <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                </Field>
                <Field label="Confirm new password" error={pwErrors.confirm}>
                  <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </Field>
                <div className="sl-set-inline-action is-wide">
                  <button type="button" className="sl-set-btn is-ghost" onClick={changePassword}>Update password</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {dirty && (
        <div className="sl-set-savebar" role="region" aria-label="Unsaved changes">
          <span>
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            You have unsaved changes
          </span>
          <div>
            <button type="button" className="sl-set-btn is-ghost" onClick={discard}>Discard</button>
            <button type="button" className="sl-set-btn" onClick={save}>Save changes</button>
          </div>
        </div>
      )}

      {toast && <div className="sl-set-toast" role="status">{toast}</div>}
    </div>
  );
}