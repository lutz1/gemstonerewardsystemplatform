import { useEffect, useMemo, useState } from "react";
import { useSeller } from "./SellerContext";
import {
    PROMO_FILTERS,
    PROMO_TYPES,
    dayStr,
    fmtDate,
    initialProducts,
    peso,
    promoStatus,
    promoValueLabel,
} from "./sellerData";
import "./SellerPromotions.css";

// State lives in SellerDashboard.jsx so edits survive tab switches.
// Swap setPromotions for Firestore writes when ready (same place as products/orders in SellerContext).

const STATUS_LABEL = { active: "Active", scheduled: "Scheduled", paused: "Paused", ended: "Ended" };
const fmtDay = (d) => fmtDate(`${d}T00:00:00`);

const blankForm = () => ({
  name: "", type: "percent", value: "", code: "", minSpend: "",
  scope: "all", productIds: [], startsAt: dayStr(), endsAt: dayStr(7), limit: "",
});

const toForm = (p) => ({
  ...p,
  value: p.value ? String(p.value) : "",
  minSpend: p.minSpend ? String(p.minSpend) : "",
  limit: p.limit ? String(p.limit) : "",
});

function validate(f, promotions, editingId) {
  const e = {};
  if (!f.name.trim()) e.name = "Give your promotion a name.";
  if (f.type !== "shipping") {
    const v = Number(f.value);
    if (!v || v <= 0) e.value = "Enter a discount greater than 0.";
    else if (f.type === "percent" && v > 90) e.value = "Percent off can't be more than 90%.";
  }
  const code = f.code.trim().toLowerCase();
  if (code && promotions.some((p) => p.id !== editingId && p.code.toLowerCase() === code)) {
    e.code = "This code is already used by another promotion.";
  }
  if (f.scope === "selected" && !f.productIds.length) e.products = "Pick at least one product.";
  if (!f.startsAt) e.startsAt = "Choose a start date.";
  if (!f.endsAt) e.endsAt = "Choose an end date.";
  else if (f.startsAt && f.endsAt < f.startsAt) e.endsAt = "End date must be on or after the start date.";
  return e;
}

// Plain-language summary shown in the editor footer so sellers see what buyers will get.
const describe = (f) => {
  const label = promoValueLabel({ type: f.type, value: f.value || "…" }).toLowerCase();
  const n = f.productIds.length;
  const scope = f.scope === "all" ? "all products" : n ? `${n} selected product${n > 1 ? "s" : ""}` : "selected products";
  const min = Number(f.minSpend) ? ` on orders over ${peso(f.minSpend)}` : "";
  const how = f.code.trim() ? ` with code ${f.code.trim().toUpperCase()}` : ", applied automatically";
  return `Buyers get ${label} on ${scope}${min}${how}.`;
};

function Field({ label, hint, error, group = false, children }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={`sl-promo-field${error ? " has-error" : ""}`} {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="sl-promo-label">{label}</span>
      {children}
      {error ? (
        <small className="sl-promo-error" role="alert">{error}</small>
      ) : (
        hint && <small className="sl-promo-hint">{hint}</small>
      )}
    </Tag>
  );
}

export default function SellerPromotions({ promotions, setPromotions }) {
  const seller = useSeller();
  // Uses live inventory if SellerContext exposes `products`, otherwise the mock list.
  const products = (seller.products ?? initialProducts).filter((p) => p.status !== "draft");

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null); // { id: string | null, form }
  const [errors, setErrors] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!editor && !confirmId) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmId) setConfirmId(null);
      else setEditor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, confirmId]);

  const rows = useMemo(() => promotions.map((p) => ({ ...p, status: promoStatus(p) })), [promotions]);

  const counts = useMemo(() => {
    const c = { all: rows.length, active: 0, scheduled: 0, paused: 0, ended: 0 };
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  const totalSales = rows.reduce((s, r) => s + r.sales, 0);

  const visible = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
  });

  const scopeText = (p) => {
    if (p.scope === "all") return "All products";
    if (p.productIds.length === 1) return products.find((x) => x.id === p.productIds[0])?.name || "1 product";
    return `${p.productIds.length} products`;
  };

  const stats = [
    { label: "Active now", value: counts.active, icon: "bolt" },
    { label: "Scheduled", value: counts.scheduled, icon: "event_upcoming" },
    { label: "Redemptions", value: totalUsed.toLocaleString("en-PH"), icon: "confirmation_number" },
    { label: "Sales from promotions", value: peso(totalSales), icon: "trending_up", feature: true },
  ];

  const openCreate = () => { setErrors({}); setEditor({ id: null, form: blankForm() }); };
  const openEdit = (p) => { setErrors({}); setEditor({ id: p.id, form: toForm(p) }); };
  const openDuplicate = (p) => {
    setErrors({});
    setEditor({
      id: null,
      form: { ...toForm(p), name: `${p.name} (copy)`, code: "", used: 0, sales: 0, enabled: true, startsAt: dayStr(), endsAt: dayStr(7) },
    });
  };

  const setField = (key, value) => {
    setEditor((ed) => ({ ...ed, form: { ...ed.form, [key]: value } }));
    setErrors((er) => ({ ...er, [key]: undefined, ...(key === "scope" ? { products: undefined } : {}) }));
  };

  const toggleProduct = (id) => {
    const ids = editor.form.productIds;
    setField("productIds", ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    setErrors((er) => ({ ...er, products: undefined }));
  };

  const save = () => {
    const found = validate(editor.form, promotions, editor.id);
    if (Object.keys(found).length) { setErrors(found); return; }
    const f = editor.form;
    const next = {
      id: editor.id || `promo-${Date.now()}`,
      name: f.name.trim(),
      type: f.type,
      value: f.type === "shipping" ? 0 : Number(f.value),
      code: f.code.trim().toUpperCase(),
      minSpend: Number(f.minSpend) || 0,
      scope: f.scope,
      productIds: f.scope === "all" ? [] : f.productIds,
      startsAt: f.startsAt,
      endsAt: f.endsAt,
      limit: Number(f.limit) || null,
      used: f.used ?? 0,
      sales: f.sales ?? 0,
      enabled: f.enabled ?? true,
    };
    setPromotions((list) => (editor.id ? list.map((p) => (p.id === editor.id ? next : p)) : [next, ...list]));
    setToast(editor.id ? "Promotion updated" : "Promotion created");
    setEditor(null);
  };

  const toggle = (p) => {
    setPromotions((list) => list.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)));
    setToast(p.enabled ? "Promotion paused" : "Promotion resumed");
  };

  const remove = () => {
    setPromotions((list) => list.filter((p) => p.id !== confirmId));
    setConfirmId(null);
    setToast("Promotion deleted");
  };

  const f = editor?.form;
  const confirmPromo = promotions.find((p) => p.id === confirmId);

  return (
    <div className="sl-promo">
      <div className="sl-promo-head">
        <div>
          <h1>Promotions</h1>
          <p>Run discounts and free shipping to bring buyers back to your gems.</p>
        </div>
        <button type="button" className="sl-promo-btn" onClick={openCreate}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          Create promotion
        </button>
      </div>

      <div className="sl-promo-stats">
        {stats.map((s) => (
          <article key={s.label} className={`sl-promo-stat${s.feature ? " is-feature" : ""}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{s.icon}</span>
            <p>{s.label}</p>
            <strong>{s.value}</strong>
          </article>
        ))}
      </div>

      <div className="sl-promo-toolbar">
        <div className="sl-promo-filters" role="tablist" aria-label="Filter promotions">
          {PROMO_FILTERS.map((key) => (
            <button
              type="button"
              role="tab"
              key={key}
              aria-selected={filter === key}
              className={`sl-promo-filter${filter === key ? " is-active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "All" : STATUS_LABEL[key]}
              <em>{counts[key]}</em>
            </button>
          ))}
        </div>
        <div className="sl-promo-search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            placeholder="Search name or code"
            aria-label="Search promotions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="sl-promo-empty">
          <span className="material-symbols-outlined" aria-hidden="true">campaign</span>
          {rows.length === 0 ? (
            <>
              <h2>Create your first promotion</h2>
              <p>Offer a discount or free shipping and it shows up on your listings right away.</p>
              <button type="button" className="sl-promo-btn" onClick={openCreate}>Create promotion</button>
            </>
          ) : (
            <>
              <h2>No promotions found</h2>
              <p>Try a different filter or search.</p>
              <button type="button" className="sl-promo-btn is-ghost" onClick={() => { setFilter("all"); setQuery(""); }}>
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="sl-promo-list">
          {visible.map((p) => {
            const pct = p.limit ? Math.min(100, Math.round((p.used / p.limit) * 100)) : 0;
            return (
              <article key={p.id} className={`sl-promo-card is-${p.status}`}>
                <div className="sl-promo-tile" aria-hidden="true">
                  {p.type === "shipping" ? (
                    <span className="material-symbols-outlined">local_shipping</span>
                  ) : (
                    <strong>{p.type === "percent" ? `${p.value}%` : peso(p.value)}</strong>
                  )}
                  <small>{p.type === "shipping" ? "Free" : "Off"}</small>
                </div>

                <div className="sl-promo-body">
                  <div className="sl-promo-title">
                    <h3>{p.name}</h3>
                    <em className={`sl-promo-status is-${p.status}`}>{STATUS_LABEL[p.status]}</em>
                  </div>
                  <p className="sl-promo-meta">
                    {promoValueLabel(p)} on {p.scope === "all" ? "all products" : scopeText(p)}
                    {p.minSpend ? `, min. spend ${peso(p.minSpend)}` : ""}
                  </p>
                  <div className="sl-promo-facts">
                    <span>
                      <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                      {fmtDay(p.startsAt)} – {fmtDay(p.endsAt)}
                    </span>
                    {p.code ? (
                      <span className="sl-promo-code">
                        <span className="material-symbols-outlined" aria-hidden="true">sell</span>
                        {p.code}
                      </span>
                    ) : (
                      <span>Applied automatically</span>
                    )}
                  </div>
                  <div className="sl-promo-usage">
                    {p.limit ? (
                      <div className="sl-promo-bar" role="img" aria-label={`${p.used} of ${p.limit} redeemed`}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                    <small>{p.limit ? `${p.used} of ${p.limit} redeemed` : `${p.used} redeemed, no limit`}</small>
                  </div>
                </div>

                <div className="sl-promo-actions">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.enabled && p.status !== "ended"}
                    aria-label={`${p.enabled ? "Pause" : "Resume"} ${p.name}`}
                    className="sl-promo-switch"
                    disabled={p.status === "ended"}
                    onClick={() => toggle(p)}
                  />
                  <button type="button" className="sl-promo-icon" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}>
                    <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                  </button>
                  <button type="button" className="sl-promo-icon" aria-label={`Duplicate ${p.name}`} onClick={() => openDuplicate(p)}>
                    <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                  </button>
                  <button type="button" className="sl-promo-icon is-danger" aria-label={`Delete ${p.name}`} onClick={() => setConfirmId(p.id)}>
                    <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editor && (
        <div className="sl-promo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setEditor(null)}>
          <div className="sl-promo-modal" role="dialog" aria-modal="true" aria-labelledby="sl-promo-modal-title">
            <header className="sl-promo-modal-head">
              <h2 id="sl-promo-modal-title">{editor.id ? "Edit promotion" : "Create promotion"}</h2>
              <button type="button" className="sl-promo-icon" aria-label="Close" onClick={() => setEditor(null)}>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>

            <div className="sl-promo-modal-body">
              <Field label="Promotion name" error={errors.name}>
                <input
                  type="text"
                  value={f.name}
                  maxLength={60}
                  placeholder="e.g. Weekend gem sale"
                  autoFocus
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Field>

              <Field label="Discount type" group>
                <div className="sl-promo-segment" role="radiogroup" aria-label="Discount type">
                  {PROMO_TYPES.map((t) => (
                    <button
                      type="button"
                      role="radio"
                      key={t.key}
                      aria-checked={f.type === t.key}
                      className={f.type === t.key ? "is-active" : ""}
                      onClick={() => setField("type", t.key)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="sl-promo-row">
                {f.type !== "shipping" && (
                  <Field label={f.type === "percent" ? "Discount (%)" : "Discount (₱)"} error={errors.value}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={f.value}
                      placeholder={f.type === "percent" ? "10" : "500"}
                      onChange={(e) => setField("value", e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Minimum spend (₱)" hint="Optional" error={errors.minSpend}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={f.minSpend}
                    placeholder="No minimum"
                    onChange={(e) => setField("minSpend", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Voucher code" hint="Leave empty to apply automatically at checkout." error={errors.code}>
                <input
                  type="text"
                  value={f.code}
                  maxLength={20}
                  placeholder="e.g. GEM10"
                  autoCapitalize="characters"
                  onChange={(e) => setField("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                />
              </Field>

              <Field label="Applies to" group error={errors.products}>
                <div className="sl-promo-segment" role="radiogroup" aria-label="Applies to">
                  {[["all", "All products"], ["selected", "Selected products"]].map(([key, label]) => (
                    <button
                      type="button"
                      role="radio"
                      key={key}
                      aria-checked={f.scope === key}
                      className={f.scope === key ? "is-active" : ""}
                      onClick={() => setField("scope", key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {f.scope === "selected" && (
                  <div className="sl-promo-chips">
                    {products.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        aria-pressed={f.productIds.includes(p.id)}
                        className={f.productIds.includes(p.id) ? "is-active" : ""}
                        onClick={() => toggleProduct(p.id)}
                      >
                        {f.productIds.includes(p.id) && (
                          <span className="material-symbols-outlined" aria-hidden="true">check</span>
                        )}
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <div className="sl-promo-row">
                <Field label="Starts" error={errors.startsAt}>
                  <input type="date" value={f.startsAt} onChange={(e) => setField("startsAt", e.target.value)} />
                </Field>
                <Field label="Ends" error={errors.endsAt}>
                  <input type="date" value={f.endsAt} min={f.startsAt} onChange={(e) => setField("endsAt", e.target.value)} />
                </Field>
              </div>

              <Field label="Usage limit" hint="Optional. The promotion ends once this many orders use it.">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={f.limit}
                  placeholder="Unlimited"
                  onChange={(e) => setField("limit", e.target.value)}
                />
              </Field>
            </div>

            <footer className="sl-promo-modal-foot">
              <p className="sl-promo-preview">{describe(f)}</p>
              <div className="sl-promo-modal-buttons">
                <button type="button" className="sl-promo-btn is-ghost" onClick={() => setEditor(null)}>Cancel</button>
                <button type="button" className="sl-promo-btn" onClick={save}>
                  {editor.id ? "Save changes" : "Create promotion"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {confirmPromo && (
        <div className="sl-promo-overlay is-center" onMouseDown={(e) => e.target === e.currentTarget && setConfirmId(null)}>
          <div className="sl-promo-confirm" role="alertdialog" aria-modal="true" aria-labelledby="sl-promo-confirm-title">
            <h2 id="sl-promo-confirm-title">Delete this promotion?</h2>
            <p>
              &ldquo;{confirmPromo.name}&rdquo; will be removed
              {confirmPromo.code ? ` and code ${confirmPromo.code} will stop working` : ""}. This can&apos;t be undone.
            </p>
            <div className="sl-promo-modal-buttons">
              <button type="button" className="sl-promo-btn is-ghost" onClick={() => setConfirmId(null)}>Keep promotion</button>
              <button type="button" className="sl-promo-btn is-danger" onClick={remove}>Delete promotion</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="sl-promo-toast" role="status">{toast}</div>}
    </div>
  );
}