import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { MdDiamond, MdDownload, MdShare } from "react-icons/md";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import { calcTotal, formatCurrency, getPackageById } from "../../utils/PackagesData";
import "./QrPaymentPage.css";

const RECEIPT_REDIRECT_SECONDS = 5;

const SERVICE_FEES = {
  emerald: 50,
  sapphire: 150,
  diamond: 250,
};

function formatReceiptDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function QrPaymentPage() {
  const { packageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const pkg = location.state?.package ?? getPackageById(packageId);
  const total = pkg ? calcTotal(pkg) : 0;
  const serviceFee = pkg ? SERVICE_FEES[pkg.id] || 0 : 0;
  const orderTotal = total + serviceFee;

  // "confirmed" -> "receipt"
  const [stage, setStage] = useState("confirmed");
  const [paymentError, setPaymentError] = useState(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [redirectIn, setRedirectIn] = useState(RECEIPT_REDIRECT_SECONDS);

  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  async function handleCompletePayment() {
    setIsCompletingPayment(true);
    setShowPaymentConfirmation(false);
    setPaymentError(null);
    try {
      const completePurchase = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "completePurchase",
      );
      const { data: result } = await completePurchase({ packageId: pkg.id });
      setReceipt(result);
      setIsCompletingPayment(false);
      setPaymentSucceeded(true);
      window.setTimeout(() => {
        setPaymentSucceeded(false);
        setStage("receipt");
      }, 1100);
    } catch (error) {
      setPaymentError(
        error?.message ||
          `Couldn't complete the payment. Wallet balance must cover ${formatCurrency(orderTotal)}.`,
      );
      setIsCompletingPayment(false);
      setShowPaymentConfirmation(false);
    }
  }

  const invoiceNumber = receipt?.receiptId
    ? receipt.invoiceNo || `INV-${receipt.receiptId.replace(/^RCPT-/, "")}`
    : "—";

  const handleSaveReceipt = () => window.print();

  const handleShareReceipt = async () => {
    const receiptText = `${pkg.name} - ${formatCurrency(total)}\nReceipt: ${receipt?.receiptId || "—"}`;
    if (navigator.share) {
      await navigator.share({ title: "Gemstone Code receipt", text: receiptText });
      return;
    }
    await navigator.clipboard?.writeText(receiptText);
  };

  // ── Receipt: 5s auto-redirect regardless of button click ──
  useEffect(() => {
    if (stage !== "receipt") return;

    setRedirectIn(RECEIPT_REDIRECT_SECONDS);
    const tick = setInterval(() => {
      setRedirectIn((s) => Math.max(0, s - 1));
    }, 1000);
    const redirectTimer = setTimeout(() => {
      navigate("/dashboard");
    }, RECEIPT_REDIRECT_SECONDS * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(redirectTimer);
    };
  }, [stage, navigate]);

  function handleBackToMerchant() {
    navigate("/dashboard");
  }

  if (!pkg) {
    return (
      <div className="qr-root">
        <TopBar />
        <main className="qr-main qr-notfound">
          <p className="qr-notfound-text">We couldn't find that package.</p>
          <Link className="qr-notfound-link" to="/purchase-codes">
            Back to Purchase Codes
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="qr-root">
      <div className="qr-glow qr-glow-tr" />
      <div className="qr-glow qr-glow-bl" />

      <TopBar />

      <main className="qr-main">
        <div className="qr-content">

          {stage !== "receipt" && (
            <Link
              className="qr-back-link"
              to={`/purchase-codes/package/${pkg.id}`}
              state={{ package: pkg }}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Package
            </Link>
          )}

          <div className="qr-glass-panel qr-card">

            {/* ── Confirmed: details + Complete Payment ───────── */}
            {stage === "confirmed" && (
              <div className="qr-details-block">
                <div className="qr-review-heading">
                  <div>
                    <p className="qr-review-eyebrow">Purchase review</p>
                    <h2>Review your order</h2>
                    <p>Check the membership details before completing payment.</p>
                  </div>
                  <span className="qr-review-confirmed">Ready to pay</span>
                </div>

                <div className="qr-order-table" role="table" aria-label="Purchase order">
                  <div className="qr-order-row qr-order-header" role="row">
                    <span role="columnheader">Product</span>
                    <span role="columnheader">Qty</span>
                    <span role="columnheader">Total Amount</span>
                  </div>
                  <div className="qr-order-row" role="row">
                    <div className="qr-order-product" role="cell">
                      <span className="qr-gem-icon" aria-hidden="true">
                        <MdDiamond size={18} />
                      </span>
                      <span>
                        <strong>{pkg.name}</strong>
                        <small>{pkg.tier} Membership</small>
                      </span>
                    </div>
                    <span className="qr-order-qty" role="cell">x {pkg.quantity}</span>
                    <strong className="qr-order-total" role="cell">
                      {formatCurrency(orderTotal)}
                    </strong>
                  </div>
                </div>

                <div className="qr-review-fees">
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Service Fee</span>
                    <span className="qr-detail-value">{formatCurrency(serviceFee)}</span>
                  </div>
                  <div className="qr-detail-row qr-detail-total">
                    <span className="qr-detail-label">Total Amount</span>
                    <span className="qr-detail-value">{formatCurrency(orderTotal)}</span>
                  </div>
                </div>

                {paymentError && <p className="qr-payment-error" role="alert">{paymentError}</p>}

                <button
                  className="qr-complete-btn"
                  type="button"
                  onClick={() => setShowPaymentConfirmation(true)}
                >
                  Complete Payment
                </button>
              </div>
            )}

            {/* ── Receipt ──────────────────────────────────────── */}
            {stage === "receipt" && receipt && (
              <div className="qr-receipt-block">
                <div className="qr-receipt-heading">
                  <div className="qr-receipt-check" aria-hidden="true">✓</div>
                  <div>
                    <h3 className="qr-receipt-title">Purchase Successfully!</h3>
                    <p className="qr-receipt-caption">Your payment has been confirmed.</p>
                  </div>
                </div>

                <div className="qr-detail-rows">
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Service Fee</span>
                    <span className="qr-detail-value">{formatCurrency(receipt.serviceFee || 0)}</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Total Amount</span>
                    <span className="qr-detail-value qr-receipt-total-value">{formatCurrency(receipt.total ?? total)}</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">GEMS Earned</span>
                    <span className="qr-detail-value qr-receipt-total-value">+{receipt.earnedGems ?? 0} GEMS</span>
                  </div>
                  <div className="qr-receipt-payment-method">
                    <MdDiamond size={18} />
                    <span>Pay via Wallet</span>
                  </div>
                </div>

                <div className="qr-receipt-divider"><span>Details</span></div>

                <div className="qr-detail-rows qr-receipt-details">
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Product</span>
                    <span className="qr-detail-value">{pkg.name} x {pkg.quantity}</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Created on</span>
                    <span className="qr-detail-value">{formatReceiptDate(receipt.completedAt)}</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Reference no.</span>
                    <span className="qr-detail-value qr-mono">{receipt.transactionId || "—"}</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Invoice no.</span>
                    <span className="qr-detail-value qr-mono">{invoiceNumber}</span>
                  </div>
                </div>

                <div className="qr-receipt-actions">
                  <button className="qr-receipt-action-btn" type="button" onClick={handleSaveReceipt}>
                    <MdDownload size={18} />
                    Save Image
                  </button>
                  <button className="qr-receipt-action-btn" type="button" onClick={handleShareReceipt}>
                    <MdShare size={18} />
                    Share
                  </button>
                </div>

                <div className="qr-receipt-navigation">
                  <button className="qr-merchant-btn" onClick={handleBackToMerchant}>
                    Back to Merchant
                  </button>
                  <Link className="qr-history-link" to="/transactions">
                    View Transaction History
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
                <p className="qr-redirect-note">
                  Redirecting to your dashboard in {redirectIn}s…
                </p>
              </div>
            )}

          </div>
        </div>
      </main>

      {showPaymentConfirmation && (
        <div
          className="qr-confirmation-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCompletingPayment) {
              setShowPaymentConfirmation(false);
            }
          }}
        >
          <section
            className="qr-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-confirmation-title"
          >
            <div className="qr-confirmation-icon" aria-hidden="true">
              <MdDiamond size={24} />
            </div>
            <h2 id="payment-confirmation-title">Confirm payment?</h2>
            <p>
              Complete your purchase of {pkg.name} for {formatCurrency(orderTotal)}?
            </p>
            <div className="qr-confirmation-actions">
              <button
                className="qr-confirmation-cancel"
                type="button"
                disabled={isCompletingPayment}
                onClick={() => setShowPaymentConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="qr-confirmation-confirm"
                type="button"
                disabled={isCompletingPayment}
                onClick={handleCompletePayment}
              >
                {isCompletingPayment ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </section>
        </div>
      )}

      {(isCompletingPayment || paymentSucceeded) && (
        <div className="qr-payment-status-backdrop" role="status" aria-live="polite">
          <div className="qr-payment-status-modal">
            {paymentSucceeded ? (
              <div className="qr-success-animation" aria-hidden="true">✓</div>
            ) : (
              <span className="qr-payment-spinner" aria-hidden="true" />
            )}
            <h2>{paymentSucceeded ? "Payment Successful" : "Processing Payment"}</h2>
            <p>
              {paymentSucceeded
                ? "Preparing your final receipt..."
                : "Please wait while we confirm your payment."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}