import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { app, auth, storage } from "../../../firebase";
import Icon from "./components/Icon";
import "./components/SellerUI.css";
import { stockState } from "./sellerData";

// Single source of truth for the Seller Center, so Inventory and Orders stay in sync
// (accepting an order deducts stock, cancelling an accepted order restores it).
// Wrap <SellerDashboard /> with <SellerProvider>. The provider also renders the toast
// and the --sl-* design tokens used by the seller pages.
//
// To go live, replace the useState initialisers with data loaded through your
// asia-southeast1 callable functions (same pattern as getUserMessages) and make the
// actions below call a function before updating local state.

const SellerContext = createContext(null);
const sellerFunctions = getFunctions(app, "asia-southeast1");

const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSeller = () => useContext(SellerContext);

export function SellerProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutMethods] = useState([]);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    let active = true;
    httpsCallable(sellerFunctions, "getSellerProducts")()
      .then(({ data }) => {
        if (!active) return;
        if (Array.isArray(data?.products)) setProducts(data.products);
      })
      .catch((error) => console.error("Failed to load seller products:", error));
    return () => { active = false; };
  }, []);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const saveProduct = async (p) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Sign in again before publishing a product.");
      const imageUrls = [];
      for (let index = 0; index < (p.images || []).length; index += 1) {
        const image = p.images[index];
        if (typeof image !== "string") continue;
        if (!image.startsWith("data:image/")) {
          imageUrls.push(image);
          continue;
        }
        const blob = await dataUrlToBlob(image);
        const imageRef = ref(storage, `seller-products/${uid}/${p.id || `p${Date.now()}`}/${index + 1}.jpg`);
        await uploadBytes(imageRef, blob, { contentType: "image/jpeg" });
        imageUrls.push(await getDownloadURL(imageRef));
      }
      const payload = { ...p, images: imageUrls };
      const { data } = await httpsCallable(sellerFunctions, "submitSellerProduct")(payload);
      if (data?.product) {
        setProducts((list) => {
          const next = list.some((x) => x.id === data.product.id)
            ? list.map((x) => (x.id === data.product.id ? data.product : x))
            : [data.product, ...list];
          return next;
        });
      }
      return data?.product || p;
    } catch (error) {
      console.error("Failed to save seller product:", error);
      notify(error?.message || "Could not save product.");
      throw error;
    }
  };

  const removeProduct = async (id) => {
    const target = products.find((product) => product.id === id);
    if (!target || target.approvalStatus === "pending") {
      throw new Error("This product cannot be deleted right now.");
    }
    const { data } = await httpsCallable(sellerFunctions, "deleteSellerProduct")({ productId: id });
    if (data?.success !== true) {
      throw new Error("The product and its images could not be deleted.");
    }
    setProducts((list) => list.filter((product) => product.id !== id));
  };

  const adjustStock = (id, delta) =>
    setProducts((list) => {
      const target = list.find((p) => p.id === id);
      if (["pending", "rejected"].includes(target?.approvalStatus)) return list;
      const next = list.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) {
        void httpsCallable(sellerFunctions, "updateSellerProductStock")({
          productId: id,
          stock: updated.stock,
        }).catch((error) => console.error("Failed to update seller product stock:", error));
      }
      return next;
    });

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