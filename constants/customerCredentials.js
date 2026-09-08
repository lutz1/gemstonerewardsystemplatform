// ============================================================
// DUMMY CUSTOMER CREDENTIALS -- DELETE THIS ENTIRE FILE
// before shipping anywhere near production.
//
// This exists ONLY so the customer login has something fixed to
// check against while there's no real backend/customer-auth system
// yet. A plaintext password sitting in the app bundle is NOT secure
// -- anyone can pull it out of a built app. Replace this with a real
// backend call (Firebase auth, a proper login endpoint, etc.) before
// this app goes anywhere real.
//
// To remove: delete this file, then revert the `login` logic in
// context/AuthContext.jsx back to accepting any non-empty input
// (or wire up real auth).
// ============================================================

export const DUMMY_CUSTOMER_CREDENTIALS = {
  email: "user",
  password: "user",
};