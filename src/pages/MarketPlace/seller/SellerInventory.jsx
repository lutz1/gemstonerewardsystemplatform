import { useMemo, useState } from "react";
import Drawer from "./components/Drawer";
import Icon from "./components/Icon";
import PhotoUploader from "./components/PhotoUploader";
import { useSeller } from "./SellerContext";
import { peso, stockState } from "./sellerData";
import "./SellerInventory.css";

const FILTERS = [
  ["all", "All"], ["active", "In stock"], ["pending", "Pending approval"], ["rejected", "Rejected"], ["low", "Low stock"], ["out", "Out of stock"],
];
const CATEGORIES = [
  "Apparel",
  "Classifieds",
  "Electronics",
  "Entertainment",
  "Family",
  "Free Stuff",
  "Garden & Outdoor",
  "Hobbies",
  "Home Goods",
  "Home Improvement Supplies",
  "Home Sales",
  "Musical Instruments",
  "Office Supplies",
  "Pet Supplies",
  "Property Rentals",
  "Sporting Goods",
  "Toys & Games",
  "Vehicles",
];
const STATE = {
  active: ["In stock", ""], pending: ["Pending approval", "sl-badge--warn"], rejected: ["Rejected", "sl-badge--bad"], low: ["Low stock", "sl-badge--warn"], out: ["Out of stock", "sl-badge--bad"],
};
const EMPTY = { id: null, name: "", category: "", sku: "", price: "", stock: "0", description: "", status: "active", images: [] };
const createSku = () => `PRD-${Date.now()}`;
const createEmptyProduct = () => ({ ...EMPTY, sku: createSku() });
const SELLER_MARKUP = 0.15;
const withSellerMarkup = (basePrice) =>
  Math.round((Number(basePrice) * (1 + SELLER_MARKUP) + Number.EPSILON) * 100) / 100;

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
  const [form, setForm] = useState(() => (autoOpenAdd ? createEmptyProduct() : null));
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(null);
  const [publishPhase, setPublishPhase] = useState(null);

  const counts = useMemo(() => {
    const c = { all: products.length, active: 0, pending: 0, rejected: 0, low: 0, out: 0 };
    products.forEach((p) => c[stockState(p)]++);
    return c;
  }, [products]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (filter === "all" || stockState(p) === filter) &&
        (!term || [p.name, p.sku, p.category, p.type].some((v) => typeof v === "string" && v.toLowerCase().includes(term)))
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
    if (["pending", "rejected"].includes(p?.approvalStatus)) return;
    setErrors({});
    setForm(p ? {
      ...p,
      category: CATEGORIES.includes(p.category) ? p.category : "",
      sku: p.sku || createSku(),
      price: String(p.basePrice ?? p.price),
      stock: String(p.stock),
      images: p.images || [],
    } : createEmptyProduct());
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validateSubmission = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Enter a product name.";
    if (!(Number(form.price) > 0)) err.price = "Enter a price above ₱0.";
    if (form.images.length === 0) err.images = "Add at least one photo to submit this product for approval.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async () => {
    if (!validateSubmission()) return false;
    const isNew = !form.id;
    const basePrice = Number(form.price);
    const displayPrice = withSellerMarkup(basePrice);
    try {
      await saveProduct({
        ...form,
        id: form.id || `p${Date.now()}`,
        sku: form.sku.trim() || createSku(),
        name: form.name.trim(),
        category: form.category.trim(),
        basePrice,
        price: displayPrice,
        stock: form.id ? Number(form.stock) : 0,
        status: "active",
        approvalStatus: "pending",
      });
      notify(isNew
        ? "Product submitted for admin approval"
        : "Changes submitted for admin approval");
      setForm(null);
      return true;
    } catch {
      return false;
    }
  };

  const openPublishConfirm = () => {
    if (validateSubmission()) setPublishConfirm({ type: "form" });
  };

  const confirmPublish = async () => {
    const action = publishConfirm;
    setPublishConfirm(null);
    setPublishPhase("loading");
    const saved = action?.type === "form" && await submit();

    if (!saved) {
      setPublishPhase(null);
      notify("Could not publish product");
      return;
    }

    setPublishPhase("success");
    window.setTimeout(() => setPublishPhase(null), 1800);
  };

  const confirmDelete = async () => {
    if (toDelete?.approvalStatus === "pending") return;
    try {
      await removeProduct(toDelete.id);
      notify("Product and images deleted");
      setToDelete(null);
    } catch (error) {
      console.error("Failed to delete seller product:", error);
      notify(error?.message || "Could not delete product.");
    }
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
            <input className="sl-input" placeholder="Search name, SKU or category" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" />
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
          <span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span />
        </div>

        {visible.map((p) => {
          const [label, tone] = STATE[stockState(p)];
          const isPendingApproval = p.approvalStatus === "pending";
          const isRejected = p.approvalStatus === "rejected";
          const isReadOnly = isPendingApproval || isRejected;
          return (
            <div className="inv-row" key={p.id}>
              <div className="inv-product">
                <span className="inv-product-image">
                  {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <Icon name="inventory_2" size={20} />}
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.sku}</small>
                </div>
              </div>
              <div className="inv-cell" data-label="Category">{p.category || p.type || "Uncategorized"}</div>
              <div className="inv-cell inv-price" data-label="Price">{peso(p.price)}</div>
              <div className="inv-cell" data-label="Stock">
                <div className="inv-stepper">
                  <button onClick={() => adjustStock(p.id, -1)} disabled={isReadOnly || p.stock === 0} aria-label={`Decrease stock of ${p.name}`}><Icon name="remove" size={14} /></button>
                  <b>{p.stock}</b>
                  <button onClick={() => adjustStock(p.id, 1)} disabled={isReadOnly} aria-label={`Increase stock of ${p.name}`}><Icon name="add" size={14} /></button>
                </div>
              </div>
              <div className="inv-cell" data-label="Status"><span className={`sl-badge ${tone}`}>{label}</span></div>
              <div className="inv-actions">
                <button className="sl-icon-btn" onClick={() => openForm(p)} disabled={isReadOnly} aria-label={`Edit ${p.name}`} title={isPendingApproval ? "Waiting for admin approval" : isRejected ? "Rejected products are read-only" : "Edit"}><Icon name="edit" size={17} /></button>
                <button className="sl-icon-btn is-danger" onClick={() => setToDelete(p)} disabled={isPendingApproval} aria-label={`Delete ${p.name}`} title={isPendingApproval ? "Waiting for admin approval" : "Delete"}><Icon name="delete" size={17} /></button>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="sl-empty">
            <Icon name="inventory_2" size={36} />
            <strong>{products.length ? "No products match" : "No products yet"}</strong>
            <span>{products.length ? "Try another filter or search term." : "Add your first product to start selling."}</span>
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
          <button className="sl-btn sl-btn--primary" onClick={openPublishConfirm}>
            {form?.id ? "Submit for approval" : "Publish product"}
          </button>
        }
      >
        {form && (
          <div className="sl-form">
            <div className="sl-field is-wide">
              <span>Photos</span>
              <PhotoUploader images={form.images} onChange={(images) => { setForm((f) => ({ ...f, images })); setErrors((e) => ({ ...e, images: undefined })); }} error={errors.images} />
            </div>
            <Field label="Product name" error={errors.name} wide>
              {text("name", { placeholder: "e.g. Cotton T-shirt, Ceramic mug" })}
            </Field>
            <Field label="Category">
              <select className="sl-select" value={form.category} onChange={set("category")}>
                <option value="">Select a category</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="SKU (auto-generated)">
              {text("sku", { readOnly: true })}
            </Field>
            <Field label="Price (₱)" error={errors.price}>
              {text("price", { type: "number", min: "0", placeholder: "0", step: "0.01" })}
              {Number(form.price) > 0 && (
                <span className="sl-price-preview">
                  Display price: {peso(withSellerMarkup(form.price))} <small>(includes 15% system markup)</small>
                </span>
              )}
            </Field>
            <Field label="Description" wide>
              <textarea className="sl-textarea" value={form.description} onChange={set("description")} placeholder="Add product details, materials, sizing, or care instructions…" />
            </Field>
          </div>
        )}
      </Drawer>

      <Drawer
        variant="dialog"
        className="sl-publish-confirm"
        hideClose
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

      <Drawer
        variant="dialog"
        className="sl-publish-confirm"
        hideClose
        open={!!publishConfirm}
        onClose={() => setPublishConfirm(null)}
        title="Publish this product?"
        subtitle="Your product will be sent to the admin for approval before it appears in the marketplace."
        footer={
          <>
            <button className="sl-btn sl-btn--ghost" onClick={() => setPublishConfirm(null)}>Cancel</button>
            <button className="sl-btn sl-btn--primary" onClick={confirmPublish}>Publish product</button>
          </>
        }
      />

      {publishPhase && (
        <div className="sl-publish-screen" role="status" aria-live="polite">
          <div className="sl-publish-card">
            {publishPhase === "loading" ? (
              <>
                <span className="sl-publish-spinner" aria-hidden="true" />
                <strong>Publishing product...</strong>
                <p>Submitting your product for admin approval</p>
              </>
            ) : (
              <>
                <span className="sl-publish-check" aria-hidden="true">
                  <Icon name="check" size={38} />
                </span>
                <strong>Product submitted</strong>
                <p>Waiting for admin approval</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}