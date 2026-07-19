/**
 * ============================================================
 *  ⚠️  MOCK / TEMPORARY FILE — DELETE WHEN REAL BACKEND EXISTS
 * ============================================================
 * This simulates the two backend calls the payment flow needs:
 *   1. confirmQrScan   — "the QR code was scanned, is this payment valid?"
 *   2. completePayment — "finalize the payment, give me a receipt"
 *
 * Both just resolve after a short delay with dummy data so the
 * frontend flow (QRPaymentPage) can be built and tested end-to-end.
 * Swap the function bodies for real fetch() calls to your API and
 * this file can be deleted — nothing else needs to change except
 * the two imports in QrPaymentPage.jsx.
 * ============================================================
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simulates: "backend verifies the scanned QR and marks it as paid"
export async function confirmQrScan(pkg) {
  await delay(800); // pretend network round-trip
  return {
    success: true,
    transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
    scannedAt: new Date().toISOString(),
  };
}

// Simulates: "backend finalizes payment and returns a receipt"
export async function completePayment(pkg, scanResult) {
  await delay(1000);
  return {
    success: true,
    receiptId: `RCPT-${Date.now().toString(36).toUpperCase()}`,
    transactionId: scanResult?.transactionId ?? null,
    completedAt: new Date().toISOString(),
  };
}