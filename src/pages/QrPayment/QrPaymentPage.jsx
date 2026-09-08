import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import jsQR from "jsqr";
import "./QrPaymentPage.css";
import TopBar from "../../components/TopBar/TopBar";
import { getPackageById, calcTotal, formatCurrency } from "../../utils/PackagesData";
import { confirmQrScan, completePayment } from "../../utils/MockPaymentAPI";
import { addTransaction } from "../../utils/TransactionsData";

const RECEIPT_REDIRECT_SECONDS = 5;

function formatTxDate(date) {
  return date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .toUpperCase();
}

export default function QrPaymentPage() {
  const { packageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const pkg = location.state?.package ?? getPackageById(packageId);
  const total = pkg ? calcTotal(pkg) : 0;

  // "scanning" -> "confirmed" -> "receipt"
  const [stage, setStage] = useState("scanning");
  const [cameraError, setCameraError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [redirectIn, setRedirectIn] = useState(RECEIPT_REDIRECT_SECONDS);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafIdRef = useRef(null);
  const hasConfirmedRef = useRef(false); // guards against double-fire

  // ── Camera setup + real QR detection ────────────────────────────
  // Decodes actual camera frames — nothing proceeds until a real QR
  // code is read. Uses the native BarcodeDetector API when the browser
  // supports it (faster), otherwise decodes frames with jsQR so this
  // works consistently everywhere (Chrome, Firefox, Safari).
  useEffect(() => {
    if (stage !== "scanning" || !pkg) return;

    let cancelled = false;
    let detector = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if ("BarcodeDetector" in window) {
          try {
            detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          } catch {
            detector = null; // unsupported format/config — fall back to jsQR
          }
        }

        scanLoop();
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err?.name === "NotAllowedError"
              ? "Camera access was denied. Please allow camera permissions and retry."
              : "Couldn't access the camera on this device."
          );
        }
      }
    }

    async function scanLoop() {
      if (cancelled || hasConfirmedRef.current) return;
      const video = videoRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (detector) {
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              handleQrDetected(codes[0].rawValue ?? "");
              return;
            }
          } catch {
            // single-frame read hiccup — just try again next frame
          }
        } else {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (result && result.data) {
              handleQrDetected(result.data);
              return;
            }
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(scanLoop);
    }

    startCamera();

    return () => {
      cancelled = true;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pkg]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function handleQrDetected(decodedValue) {
    if (hasConfirmedRef.current) return;
    hasConfirmedRef.current = true;
    stopCamera();
    try {
      const result = await confirmQrScan(pkg, decodedValue);
      setScanResult({ ...result, decodedValue });
      setStage("confirmed");
    } catch {
      setCameraError("Payment confirmation failed. Please try again.");
      hasConfirmedRef.current = false;
    }
  }

  function handleDemoScan() {
    if (!pkg || hasConfirmedRef.current) return;
    handleQrDetected("DEMO-QR-0001");
  }

  async function handleCompletePayment() {
    try {
      const result = await completePayment(pkg, scanResult);
      setReceipt(result);
      addTransaction({
        icon: "shopping_bag",
        iconFill: false,
        label: "Code Purchase",
        sub: `${pkg.name} \u2022 ${pkg.tier}`,
        date: formatTxDate(new Date()),
        amount: `- ${formatCurrency(total)}`,
        amountSub: `Receipt ${result.receiptId}`,
        positive: false,
        status: "Completed",
      });
      setStage("receipt");
    } catch {
      setCameraError("Couldn't complete the payment. Please try again.");
    }
  }

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

            {/* ── Camera / scanner area ─────────────────────── */}
            <div className="qr-scanner-frame">
              {stage === "scanning" && !cameraError && (
                <>
                  <video
                    ref={videoRef}
                    className="qr-video"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <div className="qr-scan-overlay">
                    <div className="qr-scan-box" />
                  </div>
                  <p className="qr-scan-caption">
                    Point your camera at the QR code to pay
                  </p>
                  <button className="qr-demo-btn" type="button" onClick={handleDemoScan}>
                    Use demo QR scan
                  </button>
                </>
              )}

              {stage === "scanning" && cameraError && (
                <div className="qr-camera-error">
                  <span className="material-symbols-outlined qr-error-icon">
                    videocam_off
                  </span>
                  <p>{cameraError}</p>
                </div>
              )}

              {(stage === "confirmed" || stage === "receipt") && (
                <div className="qr-done-state">
                  <span className="material-symbols-outlined qr-done-icon">
                    check_circle
                  </span>
                  <p className="qr-done-text">
                    {stage === "confirmed" ? "QR Code Scanned" : "Payment Complete"}
                  </p>
                </div>
              )}
            </div>

            {/* ── Confirmed: details + Complete Payment ───────── */}
            {stage === "confirmed" && (
              <div className="qr-details-block">
                <div className="qr-detail-rows">
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Scanned Data</span>
                    <span className="qr-detail-value qr-mono">
                      {scanResult?.decodedValue || "—"}
                    </span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Quantity</span>
                    <span className="qr-detail-value">{pkg.quantity} codes</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Price</span>
                    <span className="qr-detail-value">
                      {formatCurrency(pkg.price)} / code
                    </span>
                  </div>
                  <div className="qr-detail-row qr-detail-total">
                    <span className="qr-detail-label">Total</span>
                    <span className="qr-detail-value">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button className="qr-complete-btn" onClick={handleCompletePayment}>
                  Complete Payment
                </button>
              </div>
            )}

            {/* ── Receipt ──────────────────────────────────────── */}
            {stage === "receipt" && receipt && (
              <div className="qr-receipt-block">
                <h3 className="qr-receipt-title">Review Payment Receipt</h3>

                <div className="qr-detail-rows">
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Package</span>
                    <span className="qr-detail-value">{pkg.name}</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Quantity</span>
                    <span className="qr-detail-value">{pkg.quantity} codes</span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Price</span>
                    <span className="qr-detail-value">
                      {formatCurrency(pkg.price)} / code
                    </span>
                  </div>
                  <div className="qr-detail-row">
                    <span className="qr-detail-label">Receipt ID</span>
                    <span className="qr-detail-value qr-mono">
                      {receipt.receiptId}
                    </span>
                  </div>
                  <div className="qr-detail-row qr-detail-total">
                    <span className="qr-detail-label">Total Paid</span>
                    <span className="qr-detail-value">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="qr-receipt-actions">
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
    </div>
  );
}