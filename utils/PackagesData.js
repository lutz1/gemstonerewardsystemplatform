// REPLACES the old quantity/price-per-code model with flat membership
// tiers. If your old PackagesData.js had other exports beyond what's
// used by Products/PackageDetail/QrPayment, merge those back in --
// I never saw the original file, only how its exports were used
// elsewhere, so this is a rebuild based on that usage.

export const packages = [
  {
    id: "emerald",
    tier: "EMERALD",
    tierColor: "emerald",
    price: 1650,
    totalGems: 90,
    dailyGems: 2,
    features: ["Access to Trainings", "Community Access"],
  },
  {
    id: "sapphire",
    tier: "SAPPHIRE",
    tierColor: "sapphire",
    price: 7790,
    totalGems: 270,
    dailyGems: 6,
    features: ["Access to Trainings", "Community Access"],
  },
  {
    id: "diamond",
    tier: "DIAMOND",
    tierColor: "diamond",
    price: 14350,
    totalGems: 450,
    dailyGems: 10,
    features: ["VIP Support", "Access to Trainings", "Community Access"],
  },
];

export function formatCurrency(amount) {
  return "₱" + amount.toLocaleString("en-PH");
}

// TEMP: with flat membership pricing there's no more quantity x
// unit-price math -- this just returns the price directly. Kept as a
// function (not inlined at call sites) so PackageDetail/QrPayment
// don't need to change if pricing logic gets more complex later
// (e.g. discounts, promo codes).
export function calcTotal(pkg) {
  return pkg.price;
}

export function getPackageById(id) {
  return packages.find((p) => p.id === id) ?? null;
}
