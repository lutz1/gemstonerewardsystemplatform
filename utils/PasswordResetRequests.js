// TEMP mock data -- no backend yet. Mirrors the same pattern as
// AdminMockData.js (pendingApprovals, etc): a plain in-memory array
// that screens mutate directly, since there's nothing persistent to
// call yet. Replace with a real API once one exists.
import { users } from "@/utils/AdminMockData";

export const passwordResetRequests = [
  {
    id: "pr-1001",
    customerName: "Jane Dela Cruz",
    email: "jane.delacruz@email.com",
    requestedAt: "2 hours ago",
  },
  {
    id: "pr-1002",
    customerName: "Mark Santos",
    email: "mark.santos@email.com",
    requestedAt: "5 hours ago",
  },
];

// Best-effort match against the mock users list so the admin panel
// can show a name instead of just an email. Falls back gracefully if
// no match is found (e.g. the email doesn't belong to any mock user).
function findCustomerName(email) {
  const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return match ? match.name : "Unknown User";
}

// Called from the customer-facing forgot-password screen when someone
// submits a request. Pushes into the shared array so it shows up in
// the admin Users page's pending panel and the Dashboard stat card.
export function addPasswordResetRequest({ email }) {
  passwordResetRequests.push({
    id: `pr-${Date.now()}`,
    email,
    customerName: findCustomerName(email),
    requestedAt: "Just now",
  });
}