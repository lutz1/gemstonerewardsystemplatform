export const packages = [
  {
    id: "emerald",
    name: "Emerald Membership",
    tier: "EMERALD",
    tierColor: "emerald",
    quantity: 1,
    price: 1765,
    totalGems: 90,
    dailyGems: 2,
    features: ["Access to Trainings", "Community Access"],
  },
  {
    id: "sapphire",
    name: "Sapphire Membership",
    tier: "SAPPHIRE",
    tierColor: "sapphire",
    quantity: 1,
    price: 8335,
    totalGems: 270,
    dailyGems: 6,
    features: ["Access to Trainings", "Community Access"],
  },
  {
    id: "diamond",
    name: "Diamond Membership",
    tier: "DIAMOND",
    tierColor: "diamond",
    quantity: 1,
    price: 2200,
    totalGems: 450,
    dailyGems: 10,
    features: ["VIP Support", "Access to Trainings", "Community Access"],
  },
];

export function getPackageById(id) {
  return packages.find((pkg) => pkg.id === id) ?? null;
}

export function calcTotal(pkg) {
  return pkg.quantity * pkg.price;
}

export function formatCurrency(amount) {
  return "₱" + amount.toLocaleString("en-PH");
}