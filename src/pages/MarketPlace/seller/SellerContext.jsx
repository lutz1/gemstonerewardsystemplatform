import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "./components/Icon";
import "./components/SellerUI.css";
import { initialOrders, initialPayoutMethods, initialPayouts, initialProducts, stockState } from "./sellerData";

// Single source of truth for the Seller Center, so Inventory and Orders stay in sync
// (accepting an order deducts stock, cancelling an accepted order restores it).
// Wrap <SellerDashboard /> with <SellerProvider>. The provider also renders the toast
// and the --sl-* design tokens used by the seller pages.
//
// To go live, replace the useState initialisers with data loaded through your
// asia-southeast1 callable functions (same pattern as getUserMessages) and make the
// actions below call a function before updating local state.

const SellerContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useSeller = () => useContext(SellerContext);

export function SellerProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [payoutMethods] = useState(initialPayoutMethods);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const saveProduct = (p) =>
    setProducts((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list]));

  const removeProduct = (id) => setProducts((list) => list.filter((p) => p.id !== id));

  const adjustStock = (id, delta) =>
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)));

  const setOrderStatus = (id, status, extra = {}) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (status === "processing") order.items.forEach((i) => adjustStock(i.productId, -i.qty));
    if (status === "cancelled" && order.status === "processing") order.items.forEach((i) => adjustStock(i.productId, i.qty));
    setOrders((list) =>
      list.map((o) =>
        o.id === id ? { ...o, ...extra, status, history: [...o.history, { status, at: new Date().toISOString() }] } : o
      )
    );
  };

  // Creates a withdrawal request; admins review it before it is paid.
  const requestPayout = ({ amount, method }) =>
    setPayouts((list) => [
      { id: `PO-${String(Date.now()).slice(-5)}`, amount, method, requestedAt: new Date().toISOString(), status: "processing" },
      ...list,
    ]);

  // For sidebar badges in SellerDashboard.
  const counts = useMemo(
    () => ({
      newOrders: orders.filter((o) => o.status === "new").length,
      lowStock: products.filter((p) => ["low", "out"].includes(stockState(p))).length,
    }),
    [orders, products]
  );

  return (
    <SellerContext.Provider
      value={{ products, orders, payouts, payoutMethods, counts, notify, saveProduct, removeProduct, adjustStock, setOrderStatus, requestPayout }}
    >
      <div className="sl-root">
        {children}
        {toast && (
          <div className="sl-toast" role="status">
            <Icon name="check_circle" size={18} /> {toast}
          </div>
        )}
      </div>
    </SellerContext.Provider>
  );
}