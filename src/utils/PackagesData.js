// Dummy package catalog for the purchase flow.
// Swap this for a real API call once the backend endpoint exists —
// everything downstream just expects an object shaped like one of these.

export const packages = [
  {
    id: "package-1",
    name: "Package 1",
    tier: "Standard Tier",
    tierColor: "muted",
    quantity: 5,
    price: 99.0,
  },
  {
    id: "package-2",
    name: "Package 2",
    tier: "Executive Tier",
    tierColor: "primary",
    quantity: 10,
    price: 149.0,
  },
  {
    id: "package-3",
    name: "Package 3",
    tier: "Platinum Tier",
    tierColor: "platinum",
    quantity: 20,
    price: 249.0,
  },
];

export function getPackageById(id) {
  return packages.find((pkg) => pkg.id === id) ?? null;
}

export function calcTotal(pkg) {
  return pkg.quantity * pkg.price;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}