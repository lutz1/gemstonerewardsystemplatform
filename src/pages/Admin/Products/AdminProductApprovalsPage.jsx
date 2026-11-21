import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import TopBar from "../../../components/TopBar/TopBar";
import { app } from "../../../firebase";
import {
  SELLER_PRODUCT_STATUS_APPROVED,
  SELLER_PRODUCT_STATUS_PENDING,
  SELLER_PRODUCT_STATUS_REJECTED,
} from "../../MarketPlace/seller/sellerData";
import "../AdminPage.css";
import "./AdminProductApprovalsPage.css";

function formatSubmittedAt(value) {
  if (!value) return "Submission time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Submission time unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function AdminProductApprovalsPage() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [confirmApproval, setConfirmApproval] = useState(null);
  const [confirmRejection, setConfirmRejection] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionReasonError, setRejectionReasonError] = useState("");
  const [approvalPhase, setApprovalPhase] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const getAdminSellerProducts = httpsCallable(getFunctions(app, "asia-southeast1"), "getAdminSellerProducts");
        const { data } = await getAdminSellerProducts();
        setProducts(Array.isArray(data?.products) ? data.products : []);
      } catch (error) {
        console.error("Failed to load seller products:", error);
        setErrorMessage(error?.message || "Could not load product approvals.");
      }
    };
    void load();
  }, []);

  const updateProductStatus = async (product, approvalStatus, reason = "") => {
    setUpdatingProductId(product.id);
    setErrorMessage("");
    try {
      const reviewSellerProduct = httpsCallable(getFunctions(app, "asia-southeast1"), "reviewSellerProduct");
      const { data } = await reviewSellerProduct({
        productId: product.id,
        approvalStatus,
        rejectionReason: reason,
      });
      if (data?.product) {
        setProducts((current) => current.map((item) => item.id === product.id ? data.product : item));
      }
      return Boolean(data?.product);
    } catch (error) {
      console.error("Failed to review seller product:", error);
      setErrorMessage(error?.message || "Could not update product approval.");
      return false;
    } finally {
      setUpdatingProductId(null);
    }
  };

  const confirmProductApproval = async () => {
    const product = confirmApproval;
    if (!product) return;
    setConfirmApproval(null);
    setApprovalPhase("loading");
    const approved = await updateProductStatus(product, SELLER_PRODUCT_STATUS_APPROVED);
    if (!approved) {
      setApprovalPhase(null);
      return;
    }
    setApprovalPhase("success");
    window.setTimeout(() => setApprovalPhase(null), 1800);
  };

  const confirmProductRejection = async () => {
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionReasonError("Enter a reason for rejecting this product.");
      return;
    }

    const product = confirmRejection;
    if (!product) return;
    setConfirmRejection(null);
    setApprovalPhase("loading");
    const rejected = await updateProductStatus(product, SELLER_PRODUCT_STATUS_REJECTED, reason);
    if (!rejected) {
      setApprovalPhase(null);
      return;
    }
    setApprovalPhase("rejected");
    setRejectionReason("");
    window.setTimeout(() => setApprovalPhase(null), 1800);
  };

  const openRejectionConfirmation = (product) => {
    setRejectionReason("");
    setRejectionReasonError("");
    setConfirmRejection(product);
  };

  const visible = products.filter((product) => {
    if (filter === "all") return true;
    return (product.approvalStatus || "") === filter;
  });

  return (
    <div className="admin-root">
      <TopBar userName="Admin" userRole="Administrator" profilePath="/admin/profile" />
      <main className="admin-main">
        <section className="admin-header">
          <p className="admin-eyebrow">Marketplace</p>
          <h1 className="admin-title">Product Approvals</h1>
          <p className="admin-subtitle">Review seller listings before they appear publicly.</p>
        </section>
        {errorMessage && <p className="admin-products-error" role="alert">{errorMessage}</p>}

        <div className="admin-products-stats" aria-label="Product approval status filters">
          {[
            ["pending", SELLER_PRODUCT_STATUS_PENDING, "Pending"],
            ["approved", SELLER_PRODUCT_STATUS_APPROVED, "Approved"],
            ["rejected", SELLER_PRODUCT_STATUS_REJECTED, "Rejected"],
          ].map(([key, status, label]) => (
            <button
              key={key}
              type="button"
              className={`admin-products-stat${filter === status ? " is-active" : ""}`}
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              <div>
                <p>{label}</p>
                <strong>{products.filter((product) => product.approvalStatus === status).length}</strong>
              </div>
            </button>
          ))}
        </div>

        <section className="admin-products-list" aria-label="Seller product approval queue">
          {visible.length ? visible.map((product) => (
            <article className="admin-products-card" key={product.id}>
              {product.images?.[0] ? (
                <img className="admin-products-image" src={product.images[0]} alt="" />
              ) : (
                <div className="admin-products-image is-empty"><span className="material-symbols-outlined">inventory_2</span></div>
              )}
              <div className="admin-products-details">
                <span className="admin-products-category">{product.category || product.type || "Uncategorized"}</span>
                <h2>{product.name}</h2>
                <p>Submitted price: <strong>₱{Number(product.price || 0).toLocaleString("en-PH")}</strong></p>
                <div className="admin-products-submission">
                  <p>Seller: <strong>{product.sellerName || product.sellerId || "Seller unavailable"}</strong></p>
                  {product.sellerEmail && <p>Email: {product.sellerEmail}</p>}
                  <p>Submitted: {formatSubmittedAt(product.submittedAt)}</p>
                </div>
              </div>
              {product.approvalStatus === SELLER_PRODUCT_STATUS_PENDING && (
                <div className="admin-products-actions">
                  <button
                    type="button"
                    className="admin-products-button is-approve"
                    disabled={updatingProductId === product.id}
                    onClick={() => setConfirmApproval(product)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="admin-products-button is-reject"
                    disabled={updatingProductId === product.id}
                    onClick={() => openRejectionConfirmation(product)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          )) : (
            <article className="admin-products-empty">
              <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
              <h2>No {filter} products</h2>
              <p>Seller submissions will appear here.</p>
            </article>
          )}
        </section>
        <Link className="admin-products-back" to="/admin/dashboard">
          Back to Admin Dashboard
        </Link>
      </main>

      {confirmApproval && (
        <div
          className="admin-products-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmApproval(null);
          }}
        >
          <section className="admin-products-confirm" role="dialog" aria-modal="true" aria-labelledby="admin-products-confirm-title">
            <header>
              <h2 id="admin-products-confirm-title">Approve this product?</h2>
              <p><strong>{confirmApproval.name}</strong> will be published in the public marketplace.</p>
            </header>
            <footer>
              <button type="button" className="admin-products-cancel" onClick={() => setConfirmApproval(null)}>
                Cancel
              </button>
              <button type="button" className="admin-products-confirm-button" onClick={confirmProductApproval}>
                Approve product
              </button>
            </footer>
          </section>
        </div>
      )}

      {confirmRejection && (
        <div
          className="admin-products-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmRejection(null);
          }}
        >
          <section className="admin-products-confirm" role="dialog" aria-modal="true" aria-labelledby="admin-products-reject-title">
            <header>
              <h2 id="admin-products-reject-title">Reject this product?</h2>
              <p>Provide a reason for rejecting <strong>{confirmRejection.name}</strong>. The seller will be able to see it.</p>
            </header>
            <div className="admin-products-rejection-field">
              <label htmlFor="admin-products-rejection-reason">Rejection reason</label>
              <textarea
                id="admin-products-rejection-reason"
                value={rejectionReason}
                maxLength={500}
                rows={4}
                aria-invalid={Boolean(rejectionReasonError)}
                aria-describedby={rejectionReasonError ? "admin-products-rejection-error" : undefined}
                onChange={(event) => {
                  setRejectionReason(event.target.value);
                  if (event.target.value.trim()) setRejectionReasonError("");
                }}
                placeholder="Explain what needs to be corrected..."
              />
              {rejectionReasonError && (
                <span id="admin-products-rejection-error" role="alert">{rejectionReasonError}</span>
              )}
            </div>
            <footer>
              <button type="button" className="admin-products-cancel" onClick={() => setConfirmRejection(null)}>
                Cancel
              </button>
              <button type="button" className="admin-products-reject-button" onClick={confirmProductRejection}>
                Reject product
              </button>
            </footer>
          </section>
        </div>
      )}

      {approvalPhase && (
        <div className="admin-products-progress" role="status" aria-live="polite">
          <div className="admin-products-progress-card">
            {approvalPhase === "loading" ? (
              <>
                <span className="admin-products-spinner" aria-hidden="true" />
                <strong>Approving product...</strong>
                <p>Updating the public marketplace listing</p>
              </>
            ) : (
              <>
                <span className={`admin-products-check${approvalPhase === "rejected" ? " is-rejected" : ""}`} aria-hidden="true">
                  <span className="material-symbols-outlined">{approvalPhase === "rejected" ? "close" : "check"}</span>
                </span>
                <strong>{approvalPhase === "rejected" ? "Product rejected" : "Product approved"}</strong>
                <p>{approvalPhase === "rejected" ? "The rejection reason has been sent to the seller." : "The product is now published in the marketplace."}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
