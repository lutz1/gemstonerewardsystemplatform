// ============================================================
// DUMMY ADMIN CREDENTIALS -- DELETE THIS ENTIRE FILE
// before shipping anywhere near production.
//
// This exists ONLY so the admin panel has something to check
// against while there's no real backend/admin-auth system yet.
// A plaintext password sitting in the app bundle is NOT secure --
// anyone can pull it out of a built app. Replace this with a real
// backend call (Firebase custom claims, a proper admin auth
// endpoint, etc.) before this app goes anywhere real.
//
// To remove: delete this file, then remove the `loginAsAdmin`
// logic in context/AuthContext.jsx that imports it.
// ============================================================

export const DUMMY_ADMIN_CREDENTIALS = {
  email: "admin",
  password: "admin",
};
