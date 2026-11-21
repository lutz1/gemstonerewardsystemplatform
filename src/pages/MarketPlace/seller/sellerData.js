// Seller Center — shared constants and data helpers.

export const GEM_TYPES = ["Ruby", "Sapphire", "Emerald", "Diamond", "Amethyst", "Topaz", "Opal", "Garnet"];
export const GEM_COLORS = {
  Ruby: "#e0314b", Sapphire: "#1a56db", Emerald: "#0f9d6b", Diamond: "#8fd3f4",
  Amethyst: "#8b5cf6", Topaz: "#f59e0b", Opal: "#7dd3c0", Garnet: "#9f1239",
};
export const CERTS = ["GIA", "IGI", "GRS", "None"];
export const COURIERS = ["LBC Express", "J&T Express", "JRS Express", "Grab Express"];
export const CANCEL_REASONS = ["Out of stock", "Buyer requested", "Payment not received", "Other"];
export const LOW_STOCK_AT = 3;
export const SELLER_PRODUCT_STATUS_PENDING = "pending";
export const SELLER_PRODUCT_STATUS_APPROVED = "approved";
export const SELLER_PRODUCT_STATUS_REJECTED = "rejected";

export const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH");
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

// rejected | pending | out | low | active
export const stockState = (p) =>
  p.approvalStatus === SELLER_PRODUCT_STATUS_REJECTED || p.status === "rejected" ? "rejected" :
  p.approvalStatus === SELLER_PRODUCT_STATUS_PENDING ? "pending" :
  p.stock === 0 ? "out" : p.stock <= LOW_STOCK_AT ? "low" : "active";

export const orderSubtotal = (o) =>
  (Array.isArray(o?.items) ? o.items : []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0,
  );
export const orderTotal = (o) => orderSubtotal(o) + Number(o?.shipping || 0);

// ---------- Payouts ----------
export const PLATFORM_FEE = 0.05; // taken from item subtotal (assumed rate, set to your real commission)
export const HOLD_DAYS = 3; // earnings are released this many days after delivery
export const MIN_PAYOUT = 500;

export const completedAt = (o) => o.history.find((x) => x.status === "completed")?.at;

const netOf = (o) => orderSubtotal(o) - Math.round(orderSubtotal(o) * PLATFORM_FEE);

export const earningOf = (o) => {
  const gross = orderSubtotal(o);
  const fee = Math.round(gross * PLATFORM_FEE);
  const done = completedAt(o);
  return { gross, fee, net: gross - fee, done, releaseAt: new Date(new Date(done).getTime() + HOLD_DAYS * 86400000).toISOString() };
};

// Everything the Payouts page shows, derived from orders + withdrawal requests.
export const payoutSummary = (orders, payouts) => {
  const now = Date.now();
  let released = 0, onHold = 0, incoming = 0, incomingCount = 0, heldCount = 0;
  const earnings = [];
  orders.forEach((o) => {
    if (o.status === "completed") {
      const e = earningOf(o);
      const isReleased = new Date(e.releaseAt).getTime() <= now;
      if (isReleased) released += e.net; else { onHold += e.net; heldCount++; }
      earnings.push({ order: o, ...e, released: isReleased });
    } else if (["processing", "shipped"].includes(o.status)) {
      incoming += netOf(o); incomingCount++;
    }
  });
  const sum = (list) => list.reduce((s, p) => s + p.amount, 0);
  earnings.sort((a, b) => new Date(b.done) - new Date(a.done));
  return {
    earnings, onHold, heldCount, incoming, incomingCount,
    available: Math.max(0, released - sum(payouts.filter((p) => p.status !== "rejected"))),
    paidOut: sum(payouts.filter((p) => p.status === "paid")),
    pending: sum(payouts.filter((p) => p.status === "processing")),
  };
};

// ---------- Promotions ----------
export const PROMO_TYPES = [
  { key: "percent", label: "Percent off", icon: "percent" },
  { key: "amount", label: "Peso off", icon: "payments" },
  { key: "shipping", label: "Free shipping", icon: "local_shipping" },
];
export const PROMO_FILTERS = ["all", "active", "scheduled", "paused", "ended"];

// Local YYYY-MM-DD, n days from today. Matches <input type="date"> values.
export const dayStr = (n = 0) => {
  const t = new Date();
  t.setDate(t.getDate() + n);
  return t.toLocaleDateString("en-CA");
};

// ended | paused | scheduled | active  (an ended promo can't be resumed)
export const promoStatus = (p) => {
  const today = dayStr();
  if (p.endsAt < today || (p.limit && p.used >= p.limit)) return "ended";
  if (!p.enabled) return "paused";
  if (p.startsAt > today) return "scheduled";
  return "active";
};

export const promoValueLabel = (p) =>
  p.type === "percent" ? `${p.value}% off` : p.type === "amount" ? `${peso(p.value)} off` : "Free shipping";

// scope: "all" | "selected" (productIds). limit: null = unlimited. used/sales are redemption stats.
// ---------- Settings ----------
export const HANDLING_OPTIONS = [
  { key: "same-day", label: "Same day" },
  { key: "1-2", label: "1–2 days" },
  { key: "3-5", label: "3–5 days" },
];

export const NOTIFY_EVENTS = [
  { key: "newOrder", label: "New orders", hint: "When a buyer places an order" },
  { key: "lowStock", label: "Low stock", hint: `When a listing drops to ${LOW_STOCK_AT} or fewer` },
  { key: "payout", label: "Payouts", hint: "When earnings are released or a withdrawal is paid" },
  { key: "promoEnding", label: "Promotions ending", hint: "A day before a promotion expires" },
  { key: "messages", label: "Buyer messages", hint: "When a buyer sends you a message" },
];

export const initialSettings = {
  store: {
    name: "",
    tagline: "",
    phone: "",
    email: "",
    city: "",
    vacation: false,
  },
  shipping: {
    couriers: [],
    handling: "",
    freeAbove: 0,
    shipFrom: "",
  },
  notifications: {
    newOrder: { push: false, email: false },
    lowStock: { push: false, email: false },
    payout: { push: false, email: false },
    promoEnding: { push: false, email: false },
    messages: { push: false, email: false },
  },
  account: {
    displayName: "",
    email: "",
  },
};