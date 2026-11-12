// Seller Center — shared constants, helpers and mock data.
// Replace initialProducts / initialOrders with Firestore reads when ready (see SellerContext.jsx).

export const GEM_TYPES = ["Ruby", "Sapphire", "Emerald", "Diamond", "Amethyst", "Topaz", "Opal", "Garnet"];
export const GEM_COLORS = {
  Ruby: "#e0314b", Sapphire: "#1a56db", Emerald: "#0f9d6b", Diamond: "#8fd3f4",
  Amethyst: "#8b5cf6", Topaz: "#f59e0b", Opal: "#7dd3c0", Garnet: "#9f1239",
};
export const CERTS = ["GIA", "IGI", "GRS", "None"];
export const COURIERS = ["LBC Express", "J&T Express", "JRS Express", "Grab Express"];
export const CANCEL_REASONS = ["Out of stock", "Buyer requested", "Payment not received", "Other"];
export const LOW_STOCK_AT = 3;

export const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH");
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

// draft | out | low | active
export const stockState = (p) =>
  p.status === "draft" ? "draft" : p.stock === 0 ? "out" : p.stock <= LOW_STOCK_AT ? "low" : "active";

export const orderSubtotal = (o) => o.items.reduce((s, i) => s + i.price * i.qty, 0);
export const orderTotal = (o) => orderSubtotal(o) + o.shipping;

export const initialProducts = [
  { id: "p1", sku: "GM-RU-001", name: "Burmese Ruby, Pigeon Blood", type: "Ruby", carat: 2.15, origin: "Mogok, Myanmar", cert: "GRS", price: 185000, stock: 4, status: "active", description: "Unheated, vivid red with excellent clarity." },
  { id: "p2", sku: "GM-SA-002", name: "Ceylon Blue Sapphire", type: "Sapphire", carat: 3.02, origin: "Ratnapura, Sri Lanka", cert: "GIA", price: 142000, stock: 2, status: "active", description: "Cornflower blue, cushion cut." },
  { id: "p3", sku: "GM-EM-003", name: "Colombian Emerald", type: "Emerald", carat: 1.8, origin: "Muzo, Colombia", cert: "IGI", price: 96500, stock: 6, status: "active", description: "Deep green, minor oil treatment." },
  { id: "p4", sku: "GM-DI-004", name: "Round Brilliant Diamond", type: "Diamond", carat: 1.01, origin: "Botswana", cert: "GIA", price: 320000, stock: 1, status: "active", description: "D color, VVS1, excellent cut." },
  { id: "p5", sku: "GM-AM-005", name: "Brazilian Amethyst, Oval", type: "Amethyst", carat: 5.4, origin: "Minas Gerais, Brazil", cert: "None", price: 8900, stock: 24, status: "active", description: "Rich purple, eye-clean." },
  { id: "p6", sku: "GM-TO-006", name: "Imperial Topaz", type: "Topaz", carat: 4.25, origin: "Ouro Preto, Brazil", cert: "IGI", price: 54000, stock: 0, status: "active", description: "Natural orange-pink, pear cut." },
  { id: "p7", sku: "GM-OP-007", name: "Ethiopian Welo Opal", type: "Opal", carat: 2.6, origin: "Wollo, Ethiopia", cert: "None", price: 18500, stock: 11, status: "active", description: "Strong play-of-color." },
  { id: "p8", sku: "GM-GA-008", name: "Rhodolite Garnet", type: "Garnet", carat: 3.1, origin: "Tanzania", cert: "None", price: 7200, stock: 9, status: "draft", description: "Raspberry red, round cut." },
];

const h = (status, at) => ({ status, at });
// Mock dates relative to today so the payout hold period always has something to show.
const ago = (days, hour = 10) => { const t = new Date(); t.setDate(t.getDate() - days); t.setHours(hour, 0, 0, 0); return t.toISOString(); };

export const initialOrders = [
  { id: "GM-10483", buyer: "Carlo Mendoza", phone: "0918 220 7741", address: "22 Rizal Ave., Dipolog City, Zamboanga del Norte", placedAt: "2026-11-07T10:40:00", items: [{ productId: "p4", name: "Round Brilliant Diamond", qty: 2, price: 320000 }], shipping: 350, payment: { method: "Bank transfer", paid: true }, status: "new", history: [h("new", "2026-11-07T10:40:00")] },
  { id: "GM-10482", buyer: "Marco Villanueva", phone: "0917 555 0142", address: "Blk 4 Lot 12 Sunrise Hills, Dipolog City, Zamboanga del Norte", placedAt: "2026-11-07T09:12:00", items: [{ productId: "p2", name: "Ceylon Blue Sapphire", qty: 1, price: 142000 }], shipping: 250, payment: { method: "GCash", paid: true }, status: "new", history: [h("new", "2026-11-07T09:12:00")] },
  { id: "GM-10481", buyer: "Janelle Cruz", phone: "0926 018 3345", address: "Purok 3, Barangay Miputak, Dipolog City", placedAt: "2026-11-06T18:05:00", items: [{ productId: "p5", name: "Brazilian Amethyst, Oval", qty: 2, price: 8900 }, { productId: "p7", name: "Ethiopian Welo Opal", qty: 1, price: 18500 }], shipping: 180, payment: { method: "Cash on delivery", paid: false }, status: "new", history: [h("new", "2026-11-06T18:05:00")] },
  { id: "GM-10478", buyer: "Rafael Santos", phone: "0905 771 2290", address: "88 Quezon St., Cagayan de Oro City", placedAt: "2026-11-05T14:30:00", items: [{ productId: "p3", name: "Colombian Emerald", qty: 1, price: 96500 }], shipping: 300, payment: { method: "GCash", paid: true }, status: "processing", history: [h("new", "2026-11-05T14:30:00"), h("processing", "2026-11-05T15:02:00")] },
  { id: "GM-10475", buyer: "Elena Dizon", phone: "0939 664 1108", address: "5 Magsaysay Rd., Pagadian City", placedAt: "2026-11-03T11:15:00", items: [{ productId: "p1", name: "Burmese Ruby, Pigeon Blood", qty: 1, price: 185000 }], shipping: 300, payment: { method: "Bank transfer", paid: true }, status: "shipped", courier: "LBC Express", tracking: "LBC 4400 1182 9931", history: [h("new", "2026-11-03T11:15:00"), h("processing", "2026-11-03T12:00:00"), h("shipped", "2026-11-04T09:20:00")] },
  { id: "GM-10470", buyer: "Paolo Reyes", phone: "0998 302 5567", address: "14 Bonifacio St., Zamboanga City", placedAt: "2026-10-29T16:45:00", items: [{ productId: "p4", name: "Round Brilliant Diamond", qty: 1, price: 320000 }], shipping: 350, payment: { method: "Bank transfer", paid: true }, status: "completed", courier: "J&T Express", tracking: "JT 7781 2045 3312", history: [h("new", "2026-10-29T16:45:00"), h("processing", "2026-10-29T17:10:00"), h("shipped", "2026-10-30T10:00:00"), h("completed", "2026-11-02T13:25:00")] },
  { id: "GM-10466", buyer: "Maricel Tan", phone: "0921 449 8802", address: "Purok 7, Dapitan City", placedAt: "2026-10-27T08:20:00", items: [{ productId: "p6", name: "Imperial Topaz", qty: 1, price: 54000 }], shipping: 200, payment: { method: "GCash", paid: false }, status: "cancelled", cancelReason: "Payment not received", history: [h("new", "2026-10-27T08:20:00"), h("cancelled", "2026-10-28T09:00:00")] },
  { id: "GM-10461", buyer: "Nina Aquino", phone: "0915 330 4471", address: "9 Del Pilar St., Dipolog City", placedAt: ago(5), items: [{ productId: "p7", name: "Ethiopian Welo Opal", qty: 3, price: 18500 }], shipping: 200, payment: { method: "GCash", paid: true }, status: "completed", courier: "J&T Express", tracking: "JT 5520 8841 2207", history: [h("new", ago(5)), h("processing", ago(5, 12)), h("shipped", ago(4)), h("completed", ago(1))] },
  { id: "GM-10455", buyer: "Diego Ramos", phone: "0927 884 1190", address: "31 Mabini St., Oroquieta City", placedAt: ago(20), items: [{ productId: "p5", name: "Brazilian Amethyst, Oval", qty: 5, price: 8900 }, { productId: "p7", name: "Ethiopian Welo Opal", qty: 2, price: 18500 }], shipping: 250, payment: { method: "Bank transfer", paid: true }, status: "completed", courier: "LBC Express", tracking: "LBC 3310 7742 1096", history: [h("new", ago(20)), h("processing", ago(20, 12)), h("shipped", ago(19)), h("completed", ago(16))] },
  { id: "GM-10440", buyer: "Sofia Lim", phone: "0906 215 3380", address: "12 Burgos St., Pagadian City", placedAt: ago(30), items: [{ productId: "p3", name: "Colombian Emerald", qty: 1, price: 96500 }], shipping: 300, payment: { method: "GCash", paid: true }, status: "completed", courier: "JRS Express", tracking: "JRS 9921 0045 6613", history: [h("new", ago(30)), h("processing", ago(30, 12)), h("shipped", ago(29)), h("completed", ago(24))] },
];

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

export const initialPayoutMethods = [
  { id: "m1", type: "GCash", label: "GCash · 0917 555 0142" },
  { id: "m2", type: "Bank", label: "BDO · •••• 4821" },
];

export const initialPayouts = [
  { id: "PO-2036", amount: 80000, method: "BDO · •••• 4821", requestedAt: ago(3, 15), status: "processing" },
  { id: "PO-2031", amount: 150000, method: "GCash · 0917 555 0142", requestedAt: ago(9, 11), status: "paid" },
];

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
export const initialPromotions = [
  { id: "promo-1", name: "Weekend gem sale", type: "percent", value: 10, code: "GEM10", minSpend: 5000, scope: "all", productIds: [], startsAt: dayStr(-3), endsAt: dayStr(4), limit: 100, used: 37, sales: 128400, enabled: true },
  { id: "promo-2", name: "Free shipping over ₱20,000", type: "shipping", value: 0, code: "", minSpend: 20000, scope: "all", productIds: [], startsAt: dayStr(-10), endsAt: dayStr(20), limit: null, used: 22, sales: 612000, enabled: true },
  { id: "promo-3", name: "Sapphire season", type: "amount", value: 5000, code: "SAPPHIRE5K", minSpend: 0, scope: "selected", productIds: ["p2"], startsAt: dayStr(5), endsAt: dayStr(19), limit: 20, used: 0, sales: 0, enabled: true },
  { id: "promo-4", name: "Welcome new buyers", type: "amount", value: 300, code: "WELCOME300", minSpend: 2000, scope: "all", productIds: [], startsAt: dayStr(-14), endsAt: dayStr(45), limit: 200, used: 9, sales: 34200, enabled: false },
  { id: "promo-5", name: "Amethyst & opal clearance", type: "percent", value: 15, code: "", minSpend: 0, scope: "selected", productIds: ["p5", "p7"], startsAt: dayStr(-30), endsAt: dayStr(-2), limit: 50, used: 41, sales: 96800, enabled: true },
];

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
    name: "Gemstone Market",
    tagline: "Certified natural gemstones, shipped safely across Mindanao.",
    phone: "0917 555 0142",
    email: "aria@gemstonemarket.ph",
    city: "Dipolog City, Zamboanga del Norte",
    vacation: false,
  },
  shipping: {
    couriers: ["LBC Express", "J&T Express"],
    handling: "1-2",
    freeAbove: 20000, // 0 = off
    shipFrom: "22 Rizal Ave., Dipolog City, Zamboanga del Norte",
  },
  notifications: {
    newOrder: { push: true, email: true },
    lowStock: { push: true, email: false },
    payout: { push: true, email: true },
    promoEnding: { push: false, email: true },
    messages: { push: true, email: false },
  },
  account: {
    displayName: "Aria Reyes",
    email: "aria@gemstonemarket.ph",
  },
};