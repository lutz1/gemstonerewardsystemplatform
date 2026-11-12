import { useMemo, useState } from "react";
import Drawer from "./components/Drawer";
import Icon from "./components/Icon";
import { useSeller } from "./SellerContext";
import { CANCEL_REASONS, COURIERS, fmtDate, fmtTime, orderTotal, peso } from "./sellerData";
import "./SellerOrders.css";

const TABS = [
  ["all", "All"], ["new", "New"], ["processing", "To ship"], ["shipped", "Shipped"], ["completed", "Completed"], ["cancelled", "Cancelled"],
];
const STATUS = {
  new: ["New", ""], processing: ["To ship", "sl-badge--warn"], shipped: ["Shipped", ""], completed: ["Completed", "sl-badge--ok"], cancelled: ["Cancelled", "sl-badge--bad"],
};
const NEXT = { new: "Accept order", processing: "Mark shipped", shipped: "Mark delivered" };
const STEPS = [["new", "Placed"], ["processing", "Accepted"], ["shipped", "Shipped"], ["completed", "Delivered"]];

// onManageInventory: optional; lets SellerDashboard switch to the Inventory tab from the stock warning.
export default function SellerOrders({ onManageInventory }) {
  const { orders, products, setOrderStatus, notify } = useSeller();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [mode, setMode] = useState("view"); // view | ship | cancel
  const [courier, setCourier] = useState(COURIERS[0]);
  const [tracking, setTracking] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

  const counts = useMemo(() => {
    const c = { all: orders.length, new: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => c[o.status]++);
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders
      .filter((o) => (tab === "all" || o.status === tab) && (!term || o.id.toLowerCase().includes(term) || o.buyer.toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  }, [orders, tab, q]);

  // Items the shop can't cover yet — blocks accepting until stock is updated.
  const shortages = (o) =>
    o.status !== "new" ? [] : o.items.filter((i) => (products.find((p) => p.id === i.productId)?.stock ?? 0) < i.qty);

  const open = (id, m = "view") => {
    setOpenId(id); setMode(m); setTracking(""); setTrackingError(""); setCourier(COURIERS[0]); setReason(CANCEL_REASONS[0]);
  };
  const close = () => setOpenId(null);

  const advance = (o) => {
    if (o.status === "new") {
      if (shortages(o).length) return open(o.id);
      setOrderStatus(o.id, "processing");
      notify(`Order ${o.id} accepted`);
    } else if (o.status === "processing") open(o.id, "ship");
    else if (o.status === "shipped") {
      setOrderStatus(o.id, "completed");
      notify(`Order ${o.id} marked delivered`);
    }
  };

  const confirmShip = (o) => {
    if (!tracking.trim()) return setTrackingError("Enter the tracking number.");
    setOrderStatus(o.id, "shipped", { courier, tracking: tracking.trim() });
    notify(`Order ${o.id} marked shipped`);
    setMode("view");
  };
  const confirmCancel = (o) => {
    setOrderStatus(o.id, "cancelled", { cancelReason: reason });
    notify(`Order ${o.id} cancelled`);
    setMode("view");
  };

  const o = orders.find((x) => x.id === openId);
  const short = o ? shortages(o) : [];

  const footer = !o ? null : mode === "ship" ? (
    <>
      <button className="sl-btn sl-btn--ghost" onClick={() => setMode("view")}>Back</button>
      <button className="sl-btn sl-btn--primary" onClick={() => confirmShip(o)}><Icon name="local_shipping" size={17} /> Confirm shipment</button>
    </>
  ) : mode === "cancel" ? (
    <>
      <button className="sl-btn sl-btn--ghost" onClick={() => setMode("view")}>Keep order</button>
      <button className="sl-btn sl-btn--danger-solid" onClick={() => confirmCancel(o)}>Cancel order</button>
    </>
  ) : NEXT[o.status] || ["new", "processing"].includes(o.status) ? (
    <>
      {["new", "processing"].includes(o.status) && <button className="sl-btn sl-btn--danger" onClick={() => setMode("cancel")}>Cancel order</button>}
      {NEXT[o.status] && (
        <button className="sl-btn sl-btn--primary" disabled={short.length > 0} onClick={() => advance(o)}>{NEXT[o.status]}</button>
      )}
    </>
  ) : null;

  return (
    <div className="sl-page">
      <div className="sl-page-head">
        <div>
          <p className="sl-kicker">Sales</p>
          <h1>Orders</h1>
          <p>{counts.new} new · {counts.processing} waiting to ship</p>
        </div>
      </div>

      <div className="sl-toolbar">
        <div className="sl-tabs" role="tablist">
          {TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} className={`sl-tab ${tab === key ? "is-active" : ""}`} onClick={() => setTab(key)}>
              {label} <span>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="sl-search">
          <Icon name="search" size={16} />
          <input className="sl-input" placeholder="Search order ID or buyer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        </div>
      </div>

      <div className="sl-card ord-table">
        <div className="ord-row ord-row--head">
          <span>Order</span><span>Buyer</span><span>Items</span><span>Total</span><span>Status</span><span />
        </div>

        {visible.map((x) => {
          const [label, tone] = STATUS[x.status];
          const blocked = shortages(x).length > 0;
          return (
            <div className="ord-row" key={x.id}>
              <div>
                <strong>{x.id}</strong>
                <small className="ord-sub">{fmtDate(x.placedAt)}, {fmtTime(x.placedAt)}</small>
              </div>
              <div className="ord-cell" data-label="Buyer">{x.buyer}</div>
              <div className="ord-cell" data-label="Items">
                {x.items[0].name}{x.items.length > 1 && <small className="ord-sub"> +{x.items.length - 1} more</small>}
              </div>
              <div className="ord-cell ord-total" data-label="Total">
                {peso(orderTotal(x))}
                <small className="ord-sub">{x.payment.paid ? "Paid" : "Unpaid"}</small>
              </div>
              <div className="ord-cell" data-label="Status">
                <span className={`sl-badge ${tone}`}>{label}</span>
                {blocked && <span className="ord-warn" title="Not enough stock"><Icon name="warning" size={15} /></span>}
              </div>
              <div className="ord-actions">
                {NEXT[x.status] && (
                  <button className="sl-btn sl-btn--primary sl-btn--sm" onClick={() => advance(x)}>{blocked ? "Review" : NEXT[x.status]}</button>
                )}
                <button className="sl-btn sl-btn--ghost sl-btn--sm" onClick={() => open(x.id)}>View</button>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="sl-empty">
            <Icon name="inbox" size={36} />
            <strong>No orders here</strong>
            <span>{q ? "Try a different order ID or buyer name." : "New orders will show up as soon as buyers check out."}</span>
          </div>
        )}
      </div>

      <Drawer open={!!o} onClose={close} title={o ? `Order ${o.id}` : ""} subtitle={o ? `Placed ${fmtDate(o.placedAt)}, ${fmtTime(o.placedAt)}` : ""} footer={footer}>
        {o && (
          <div className="ord-detail">
            {o.status === "cancelled" ? (
              <div className="ord-banner is-bad">Cancelled · {o.cancelReason}</div>
            ) : (
              <ol className="ord-steps">
                {STEPS.map(([key, label]) => {
                  const hit = o.history.find((h) => h.status === key);
                  return (
                    <li key={key} className={hit ? "is-done" : ""}>
                      <span className="ord-dot">{hit && <Icon name="check" size={13} />}</span>
                      <b>{label}</b>
                      <small>{hit ? fmtDate(hit.at) : "—"}</small>
                    </li>
                  );
                })}
              </ol>
            )}

            {short.length > 0 && mode === "view" && (
              <div className="ord-banner is-warn">
                <Icon name="warning" size={17} />
                <span>Not enough stock for {short.map((i) => i.name).join(", ")}. {onManageInventory ? <button type="button" className="ord-link" onClick={onManageInventory}>Update inventory</button> : "Update inventory"} to accept this order.</span>
              </div>
            )}

            {mode === "ship" && (
              <section className="ord-form">
                <h3>Shipment details</h3>
                <label className="sl-field">Courier
                  <select className="sl-select" value={courier} onChange={(e) => setCourier(e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <label className={`sl-field ${trackingError ? "has-error" : ""}`}>Tracking number
                  <input className="sl-input" value={tracking} onChange={(e) => { setTracking(e.target.value); setTrackingError(""); }} placeholder="e.g. LBC 4400 1182 9931" />
                  {trackingError && <span className="sl-field__error">{trackingError}</span>}
                </label>
              </section>
            )}

            {mode === "cancel" && (
              <section className="ord-form">
                <h3>Why are you cancelling?</h3>
                <label className="sl-field">Reason
                  <select className="sl-select" value={reason} onChange={(e) => setReason(e.target.value)}>{CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
                </label>
                {o.status === "processing" && <p className="ord-note">Reserved stock will be returned to your inventory.</p>}
              </section>
            )}

            <section>
              <h3>Items</h3>
              <ul className="ord-items">
                {o.items.map((i) => (
                  <li key={i.productId}><span>{i.name} <small>× {i.qty}</small></span><b>{peso(i.price * i.qty)}</b></li>
                ))}
                <li className="is-muted"><span>Shipping</span><b>{peso(o.shipping)}</b></li>
                <li className="is-total"><span>Total</span><b>{peso(orderTotal(o))}</b></li>
              </ul>
            </section>

            <section>
              <h3>Buyer</h3>
              <p className="ord-buyer"><b>{o.buyer}</b> · {o.phone}</p>
              <p className="ord-addr"><Icon name="location_on" size={16} /> {o.address}</p>
              <p className="ord-pay">{o.payment.method} · <span className={`sl-badge ${o.payment.paid ? "sl-badge--ok" : "sl-badge--warn"}`}>{o.payment.paid ? "Paid" : "Pay on delivery"}</span></p>
            </section>

            {o.tracking && (
              <section>
                <h3>Shipment</h3>
                <p className="ord-buyer"><Icon name="local_shipping" size={16} /> <b>{o.courier}</b> · {o.tracking}</p>
              </section>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}