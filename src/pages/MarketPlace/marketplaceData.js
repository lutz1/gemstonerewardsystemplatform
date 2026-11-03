import diamondImage from "../../assets/diamond_card_products.png";
import emeraldImage from "../../assets/emerald_card_products.png";
import sapphireImage from "../../assets/sapphire_card_products.png";

export const gemstones = [
  {
    id: "emerald-colombia",
    name: "Natural Emerald",
    category: "Emerald",
    carat: "5.12 ct",
    origin: "Colombia",
    price: 22500,
    rating: 4.9,
    sold: 128,
    image: emeraldImage,
    featured: true,
    color: "emerald",
  },
  {
    id: "ruby-myanmar",
    name: "Ruby (Pigeon Blood)",
    category: "Ruby",
    carat: "1.76 ct",
    origin: "Myanmar",
    price: 18500,
    rating: 4.8,
    sold: 86,
    image: sapphireImage,
    featured: true,
    color: "ruby",
  },
  {
    id: "sapphire-kashmir",
    name: "Blue Sapphire",
    category: "Sapphire",
    carat: "3.24 ct",
    origin: "Kashmir",
    price: 16200,
    rating: 4.9,
    sold: 64,
    image: sapphireImage,
    featured: true,
    color: "sapphire",
  },
  {
    id: "sapphire-srilanka",
    name: "Yellow Sapphire",
    category: "Sapphire",
    carat: "3.76 ct",
    origin: "Sri Lanka",
    price: 7900,
    rating: 4.7,
    sold: 42,
    image: sapphireImage,
    featured: true,
    color: "yellow",
  },
  {
    id: "diamond-botswana",
    name: "Brilliant Diamond",
    category: "Diamond",
    carat: "2.08 ct",
    origin: "Botswana",
    price: 31900,
    rating: 5.0,
    sold: 23,
    image: diamondImage,
    featured: false,
    color: "diamond",
  },
  {
    id: "emerald-zambia",
    name: "Garden Emerald",
    category: "Emerald",
    carat: "2.64 ct",
    origin: "Zambia",
    price: 12400,
    rating: 4.8,
    sold: 37,
    image: emeraldImage,
    featured: false,
    color: "emerald",
  },
];

export const MARKETPLACE_CART_STORAGE_KEY = "gemstone-marketplace-cart";
const MARKETPLACE_CART_QUANTITIES_KEY = "gemstone-marketplace-cart-quantities";
export const MARKETPLACE_LOCATIONS_STORAGE_KEY =
  "gemstone-marketplace-saved-locations";
export const MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY =
  "gemstone-marketplace-selected-location";
export const DEFAULT_MARKETPLACE_LOCATION =
  "Visayan Village, Tagum City, Davao del Norte, Philippines";

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

export function getMarketplaceCartIds() {
  const savedCart = globalThis.localStorage.getItem(
    MARKETPLACE_CART_STORAGE_KEY,
  );
  if (!savedCart) return [];

  let cartIds;
  try {
    cartIds = JSON.parse(savedCart);
  } catch (error) {
    globalThis.console.error("Could not parse the saved marketplace cart.", error);
    return [];
  }
  if (!Array.isArray(cartIds)) {
    globalThis.console.error("Saved marketplace cart must be an array.");
    return [];
  }

  return [...new Set(cartIds)].filter(
    (id) =>
      typeof id === "string" && gemstones.some((gemstone) => gemstone.id === id),
  );
}

export function saveMarketplaceCartIds(cartIds) {
  globalThis.localStorage.setItem(
    MARKETPLACE_CART_STORAGE_KEY,
    JSON.stringify(cartIds),
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
      ([id, quantity]) =>
        gemstones.some((gemstone) => gemstone.id === id) &&
        Number.isSafeInteger(quantity) &&
        quantity > 0,
    ),
  );
}

export function saveMarketplaceCartQuantities(quantities) {
  globalThis.localStorage.setItem(
    MARKETPLACE_CART_QUANTITIES_KEY,
    JSON.stringify(quantities),
  );
}

export function formatMarketplacePrice(price) {
  return `$${price.toLocaleString("en-US")}`;
}
