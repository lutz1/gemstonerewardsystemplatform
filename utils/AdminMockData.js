// TEMP: sample data so the admin screens have something real to render
// and filter against. Replace every export here with real API calls
// once there's an admin backend -- the shapes below are what each
// admin screen currently expects.

export const pendingApprovals = [
  {
    id: "PA-1042",
    customerName: "Marcus Villareal",
    tier: "Diamond",
    amount: 14350,
    referenceNumber: "REF-88213",
    date: "Jul 24, 2026",
  },
  {
    id: "PA-1041",
    customerName: "Jenna Cruz",
    tier: "Sapphire",
    amount: 7790,
    referenceNumber: "REF-88207",
    date: "Jul 24, 2026",
  },
  {
    id: "PA-1040",
    customerName: "Ramon Dela Peña",
    tier: "Emerald",
    amount: 1650,
    referenceNumber: "REF-88199",
    date: "Jul 23, 2026",
  },
  {
    id: "PA-1039",
    customerName: "Alexis Rivera",
    tier: "Sapphire",
    amount: 7790,
    referenceNumber: "REF-88185",
    date: "Jul 23, 2026",
  },
  {
    id: "PA-1038",
    customerName: "Sophia Tan",
    tier: "Emerald",
    amount: 1650,
    referenceNumber: "REF-88170",
    date: "Jul 22, 2026",
  },
];

export const users = [
  {
    id: "U-001",
    name: "Alexis Rivera",
    email: "alexis.rivera@example.com",
    joinDate: "Mar 2022",
    status: "active",
    totalSpent: 42850,
  },
  {
    id: "U-002",
    name: "Marcus Villareal",
    email: "marcus.v@example.com",
    joinDate: "Jan 2023",
    status: "active",
    totalSpent: 28900,
  },
  {
    id: "U-003",
    name: "Jenna Cruz",
    email: "jenna.cruz@example.com",
    joinDate: "Jun 2023",
    status: "active",
    totalSpent: 15600,
  },
  {
    id: "U-004",
    name: "Ramon Dela Peña",
    email: "ramon.dp@example.com",
    joinDate: "Sep 2023",
    status: "suspended",
    totalSpent: 3300,
  },
  {
    id: "U-005",
    name: "Sophia Tan",
    email: "sophia.tan@example.com",
    joinDate: "Feb 2024",
    status: "active",
    totalSpent: 9900,
  },
];

// Sub-category breakdown for the "Total Code Purchase" summary --
// counts/totals across all three membership tiers.
export const purchaseTotalsByTier = [
  { tier: "Emerald", count: 214, total: 353100 },
  { tier: "Sapphire", count: 96, total: 747840 },
  { tier: "Diamond", count: 31, total: 444850 },
];

export function formatPeso(value) {
  return "₱" + value.toLocaleString("en-PH");
}
