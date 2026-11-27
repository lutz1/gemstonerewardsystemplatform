// Marketplace products now come only from approved seller listings
// (getPublicSellerProducts). There is no mock product data in this file.

export const MARKETPLACE_CATEGORIES = [
  { id: "cologne", label: "Cologne", icon: "water_drop" },
  { id: "soap", label: "Soap", icon: "clean_hands" },
  { id: "coffee", label: "Coffee", icon: "local_cafe" },
  { id: "skincare", label: "Skincare", icon: "spa" },
  { id: "snacks", label: "Snacks", icon: "cookie" },
  { id: "beverages", label: "Beverages", icon: "emoji_food_beverage" },
  { id: "home-care", label: "Home Care", icon: "home" },
  { id: "fashion", label: "Fashion", icon: "checkroom" },
  { id: "health", label: "Health", icon: "health_and_safety" },
  { id: "others", label: "Others", icon: "more_horiz" },
];

export const MARKETPLACE_OTHER_CATEGORY_ID = "others";

export const MARKETPLACE_CART_STORAGE_KEY = "gemstone-marketplace-cart";
const MARKETPLACE_CART_QUANTITIES_KEY = "gemstone-marketplace-cart-quantities";
export const MARKETPLACE_LOCATIONS_STORAGE_KEY =
  "gemstone-marketplace-saved-locations";
export const MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY =
  "gemstone-marketplace-selected-location";
export const DEFAULT_MARKETPLACE_LOCATION =
  "Visayan Village, Tagum City, Davao del Norte, Philippines";

export function getMarketplaceCategory(categoryId) {
  return (
    MARKETPLACE_CATEGORIES.find((category) => category.id === categoryId) ||
    MARKETPLACE_CATEGORIES[MARKETPLACE_CATEGORIES.length - 1]
  );
}

function matchMarketplaceCategoryId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const match = MARKETPLACE_CATEGORIES.find(
    (category) =>
      category.id === normalized || category.label.toLowerCase() === normalized,
  );
  return match ? match.id : MARKETPLACE_OTHER_CATEGORY_ID;
}

function parseCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function parseText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

// Converts a seller listing into the shape used by the marketplace UI.
// Optional fields (stock, brand, size, description, ...) are only filled in
// when the seller listing actually has them.
export function normalizeMarketplaceProduct(product) {
  const price = Number(product?.price);
  if (!product?.id || !Number.isFinite(price)) return null;

  const rating = Number(product.rating);
  const images = Array.isArray(product.images)
    ? product.images.filter((image) => typeof image === "string" && image)
    : [];

  return {
    id: String(product.id),
    name: product.name || "Untitled product",
    category: matchMarketplaceCategoryId(product.category || product.type),
    price,
    image: images[0] || "",
    images,
    description: parseText(product.description),
    brand: parseText(product.brand),
    size: parseText(product.size, product.volume, product.weight),
    stock:
      parseCount(product.stock) ??
      parseCount(product.quantity) ??
      parseCount(product.inventory),
    shopName: parseText(product.shopName, product.sellerName),
    shipsFrom: parseText(product.shipsFrom, product.sellerLocation, product.location),
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    sold: parseCount(product.sold) ?? 0,
  };
}

// Small snapshot saved in the cart (no gallery or long description).
export function toMarketplaceCartItem(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    shopName: product.shopName,
    rating: product.rating,
    sold: product.sold,
    stock: product.stock,
  };
}

export function getMarketplaceSelectedLocationAddress() {
  const savedLocationId = globalThis.localStorage.getItem(
    MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY,
  );
  const savedLocations = globalThis.localStorage.getItem(
    MARKETPLACE_LOCATIONS_STORAGE_KEY,
  );
  if (!savedLocationId || !savedLocations) return DEFAULT_MARKETPLACE_LOCATION;

  try {
    const locations = JSON.parse(savedLocations);
    const selectedLocation = Array.isArray(locations)
      ? locations.find((location) => location.id === savedLocationId)
      : null;
    if (selectedLocation && typeof selectedLocation.address === "string") {
      return selectedLocation.address;
    }
    return DEFAULT_MARKETPLACE_LOCATION;
  } catch (error) {
    globalThis.console.error("Could not read the selected delivery location.", error);
    return DEFAULT_MARKETPLACE_LOCATION;
  }
}

// The cart stores product snapshots (not just ids) because products are no
// longer a fixed local list. Old id-only carts are ignored automatically.
export function getMarketplaceCartItems() {
  const savedCart = globalThis.localStorage.getItem(
    MARKETPLACE_CART_STORAGE_KEY,
  );
  if (!savedCart) return [];

  let items;
  try {
    items = JSON.parse(savedCart);
  } catch (error) {
    globalThis.console.error("Could not parse the saved marketplace cart.", error);
    return [];
  }
  if (!Array.isArray(items)) {
    globalThis.console.error("Saved marketplace cart must be an array.");
    return [];
  }

  const seenIds = new Set();
  return items.filter((item) => {
    if (
      !item ||
      typeof item.id !== "string" ||
      !Number.isFinite(item.price) ||
      seenIds.has(item.id)
    ) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });
}

export function getMarketplaceCartIds() {
  return getMarketplaceCartItems().map((item) => item.id);
}

export function saveMarketplaceCartItems(items) {
  globalThis.localStorage.setItem(
    MARKETPLACE_CART_STORAGE_KEY,
    JSON.stringify(items),
  );
}

export function getMarketplaceCartQuantities() {
  const savedQuantities = globalThis.localStorage.getItem(
    MARKETPLACE_CART_QUANTITIES_KEY,
  );
  if (!savedQuantities) return {};

  let quantities;
  try {
    quantities = JSON.parse(savedQuantities);
  } catch (error) {
    globalThis.console.error(
      "Could not parse saved marketplace cart quantities.",
      error,
    );
    return {};
  }
  if (!quantities || typeof quantities !== "object" || Array.isArray(quantities)) {
    globalThis.console.error("Saved marketplace cart quantities must be an object.");
    return {};
  }

  return Object.fromEntries(
    Object.entries(quantities).filter(
      ([, quantity]) => Number.isSafeInteger(quantity) && quantity > 0,
    ),
  );
}

export function saveMarketplaceCartQuantities(quantities) {
  globalThis.localStorage.setItem(
    MARKETPLACE_CART_QUANTITIES_KEY,
    JSON.stringify(quantities),
  );
}

// Philippine peso. Whole amounts show without decimals (₱299), others with two (₱299.50).
export function formatMarketplacePrice(price) {
  const amount = Number(price) || 0;
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}