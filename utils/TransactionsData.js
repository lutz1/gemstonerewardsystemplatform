// Shared transaction log used by TransactionHistoryPage and, once a
// purchase completes, QrPaymentPage. Persisted to localStorage so new
// entries survive navigation — swap for a real API once the backend
// exists (getTransactions/addTransaction are the only two call sites
// that would need to change).

// v2: starts empty (no dummy seed data) — bumped from the original key
// so any old seeded entries already in a browser's localStorage are
// dropped rather than resurfacing.
const STORAGE_KEY = "gemstone_transactions_v2";

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage unavailable (SSR, privacy mode, etc.)
  }
  return [];
}

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    // ignore — worst case, new entries don't persist across reloads
  }
}

export function getTransactions() {
  return loadTransactions();
}

export function addTransaction(transaction) {
  const transactions = loadTransactions();
  const withId = { id: Date.now(), ...transaction };
  const updated = [withId, ...transactions];
  saveTransactions(updated);
  return withId;
}