import { useMemo, useState } from "react";
import Drawer from "./components/Drawer";
import Icon from "./components/Icon";
import PhotoUploader from "./components/PhotoUploader";
import { useSeller } from "./SellerContext";
import { CERTS, GEM_COLORS, GEM_TYPES, peso, stockState } from "./sellerData";
import "./SellerInventory.css";

const FILTERS = [
  ["all", "All"], ["active", "In stock"], ["low", "Low stock"], ["out", "Out of stock"], ["draft", "Drafts"],
];
const STATE = {
  active: ["In stock", ""], low: ["Low stock", "sl-badge--warn"], out: ["Out of stock", "sl-badge--bad"], draft: ["Draft", "sl-badge--mute"],
};
const EMPTY = { id: null, name: "", type: "Ruby", carat: "", origin: "", cert: "GIA", price: "", stock: "1", description: "", status: "active", images: [] };

// Defined outside the page component so inputs keep focus while typing.
function Field({ label, error, wide, children }) {
  return (
    <label className={`sl-field ${wide ? "is-wide" : ""} ${error ? "has-error" : ""}`}>
      {label}
      {children}
      {error && <span className="sl-field__error">{error}</span>}
    </label>
  );
}

// autoOpenAdd: lets dashboard shortcuts ("Add product", "Publish listing") land on the open form.
export default function SellerInventory({ autoOpenAdd = false }) {
  const { products, saveProduct, removeProduct, adjustStock, notify } = useSeller();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [form, setForm] = useState(() => (autoOpenAdd ? { ...EMPTY } : null));
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const counts = useMemo(() => {
    const c = { all: products.length, active: 0, low: 0, out: 0, draft: 0 };
    products.forEach((p) => c[stockState(p)]++);
    return c;
  }, [products]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (filter === "all" || stockState(p) === filter) &&
        (!term || [p.name, p.sku, p.type, p.origin].some((v) => v.toLowerCase().includes(term)))
    );
    const by = {
      "price-high": (a, b) => b.price - a.price,
      "price-low": (a, b) => a.price - b.price,
      "stock-low": (a, b) => a.stock - b.stock,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return by ? [...list].sort(by) : list;
  }, [products, filter, q, sort]);

  const openForm = (p) => {
    setErrors({});
    setForm(p ? { ...p, carat: String(p.carat), price: String(p.price), stock: String(p.stock), images: p.images || [] } : { ...EMPTY });
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (status) => {
    const err = {};
    if (!form.name.trim()) err.name = "Enter a product name.";
    if (!(Number(form.carat) > 0)) err.carat = "Enter the carat weight.";
    if (!(Number(form.price) > 0)) err.price = "Enter a price above ₱0.";
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) err.stock = "Enter a whole number, 0 or more.";
    const wasLive = form.id && form.status !== "draft";
    if (status === "active" && !wasLive && form.images.length === 0) err.images = "Add at least one photo to publish, or save as a draft.";
    setErrors(err);
    if (Object.keys(err).length) return;

    const isNew = !form.id;
    saveProduct({
      ...form,
      id: form.id || `p${Date.now()}`,
      sku: form.sku || `GM-${form.type.slice(0, 2).toUpperCase()}-${String(products.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      carat: Number(form.carat),
      price: Number(form.price),
      stock: Number(form.stock),
      status,
    });
    notify(status === "draft" ? "Saved as draft" : isNew ? "Product published" : "Changes saved");
    setForm(null);
  };

  const togglePublish = (p) => {
    if (p.status === "draft" && !(p.images || []).length) {
      openForm(p);
      setErrors({ images: "Add at least one photo to publish this product." });
      return;
    }
    saveProduct({ ...p, status: p.status === "draft" ? "active" : "draft" });
    notify(p.status === "draft" ? "Product published" : "Moved to drafts");
  };

  const confirmDelete = () => {
    removeProduct(toDelete.id);
    notify("Product deleted");
    setToDelete(null);
  };

  const text = (k, extra) => <input className="sl-input" value={form[k]} onChange={set(k)} {...extra} />;

  return (
    <div className="sl-page">
      <div className="sl-page-head">
        <div>
          <p className="sl-kicker">Product management</p>
          <h1>Inventory</h1>
          <p>{counts.all} products · {counts.low + counts.out} need restocking</p>
        </div>
        <button className="sl-btn sl-btn--primary" onClick={() => openForm()}>
          <Icon name="add" size={18} /> Add product
        </button>
      </div>

      <div className="sl-toolbar">
        <div className="sl-tabs" role="tablist">
          {FILTERS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={filter === key} className={`sl-tab ${filter === key ? "is-active" : ""}`} onClick={() => setFilter(key)}>
              {label} <span>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="inv-tools">
          <div className="sl-search">
            <Icon name="search" size={16} />
            <input className="sl-input" placeholder="Search name, SKU or origin" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" />
          </div>
          <select className="sl-select inv-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="price-high">Price: high to low</option>
            <option value="price-low">Price: low to high</option>
            <option value="stock-low">Stock: lowest first</option>
          </select>
        </div>
      </div>

      <div className="sl-card inv-table">
        <div className="inv-row inv-row--head">
          <span>Product</span><span>Details</span><span>Price</span><span>Stock</span><span>Status</span><span />
        </div>

        {visible.map((p) => {
          const [label, tone] = STATE[stockState(p)];
          return (
            <div className="inv-row" key={p.id}>
              <div className="inv-product">
                <span className="inv-gem" style={{ "--gem": GEM_COLORS[p.type] }}>{p.images?.[0] && <img src={p.images[0]} alt="" />}</span>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.sku} · {p.origin}</small>
                </div>
              </div>
              <div className="inv-cell" data-label="Details">{p.carat} ct · {p.cert === "None" ? "Uncertified" : p.cert}</div>
              <div className="inv-cell inv-price" data-label="Price">{peso(p.price)}</div>
              <div className="inv-cell" data-label="Stock">
                <div className="inv-stepper">
                  <button onClick={() => adjustStock(p.id, -1)} disabled={p.stock === 0} aria-label={`Decrease stock of ${p.name}`}><Icon name="remove" size={14} /></button>
                  <b>{p.stock}</b>
                  <button onClick={() => adjustStock(p.id, 1)} aria-label={`Increase stock of ${p.name}`}><Icon name="add" size={14} /></button>
                </div>
              </div>
              <div className="inv-cell" data-label="Status"><span className={`sl-badge ${tone}`}>{label}</span></div>
              <div className="inv-actions">
                <button className="sl-icon-btn" onClick={() => openForm(p)} aria-label={`Edit ${p.name}`} title="Edit"><Icon name="edit" size={17} /></button>
                <button className="sl-icon-btn" onClick={() => togglePublish(p)} aria-label={p.status === "draft" ? "Publish" : "Move to drafts"} title={p.status === "draft" ? "Publish" : "Move to drafts"}>
                  {p.status === "draft" ? <Icon name="visibility" size={17} /> : <Icon name="visibility_off" size={17} />}
                </button>
                <button className="sl-icon-btn is-danger" onClick={() => setToDelete(p)} aria-label={`Delete ${p.name}`} title="Delete"><Icon name="delete" size={17} /></button>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="sl-empty">
            <Icon name="inventory_2" size={36} />
            <strong>{products.length ? "No products match" : "No products yet"}</strong>
            <span>{products.length ? "Try another filter or search term." : "Add your first gemstone to start selling."}</span>
            {!products.length && <button className="sl-btn sl-btn--primary" onClick={() => openForm()}>Add product</button>}
          </div>
        )}
      </div>

      <Drawer
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit product" : "Add product"}
        subtitle="Buyers see these details on your listing."
        footer={
          <>
            <button className="sl-btn sl-btn--ghost" onClick={() => submit("draft")}>Save as draft</button>
            <button className="sl-btn sl-btn--primary" onClick={() => submit("active")}>
              {form?.id && form.status !== "draft" ? "Save changes" : "Publish product"}
            </button>
          </>
        }
      >
        {form && (
          <div className="sl-form">
            <div className="sl-field is-wide">
              <span>Photos</span>
              <PhotoUploader images={form.images} onChange={(images) => { setForm((f) => ({ ...f, images })); setErrors((e) => ({ ...e, images: undefined })); }} error={errors.images} />
            </div>
            <Field label="Product name" error={errors.name} wide>
              {text("name", { placeholder: "e.g. Burmese Ruby, Pigeon Blood" })}
            </Field>
            <Field label="Gemstone type">
              <select className="sl-select" value={form.type} onChange={set("type")}>{GEM_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Carat weight" error={errors.carat}>
              {text("carat", { type: "number", min: "0", step: "0.01", placeholder: "0.00" })}
            </Field>
            <Field label="Origin">{text("origin", { placeholder: "e.g. Mogok, Myanmar" })}</Field>
            <Field label="Certification">
              <select className="sl-select" value={form.cert} onChange={set("cert")}>{CERTS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Price (₱)" error={errors.price}>{text("price", { type: "number", min: "0", placeholder: "0" })}</Field>
            <Field label="Stock on hand" error={errors.stock}>{text("stock", { type: "number", min: "0" })}</Field>
            <Field label="Description" wide>
              <textarea className="sl-textarea" value={form.description} onChange={set("description")} placeholder="Color, clarity, cut, treatments…" />
            </Field>
          </div>
        )}
      </Drawer>

      <Drawer
        variant="dialog"
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this product?"
        subtitle={toDelete ? `${toDelete.name} will be removed from your inventory. This can't be undone.` : ""}
        footer={
          <>
            <button className="sl-btn sl-btn--ghost" onClick={() => setToDelete(null)}>Keep product</button>
            <button className="sl-btn sl-btn--danger-solid" onClick={confirmDelete}>Delete product</button>
          </>
        }
      />
    </div>
  );
}