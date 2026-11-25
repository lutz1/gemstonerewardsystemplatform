import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./MarketPlaceCart.css";
import "./MarketPlaceDashboard.css";
import {
  formatMarketplacePrice,
  getMarketplaceCartItems,
  getMarketplaceCartQuantities,
  getMarketplaceCategory,
  getMarketplaceSelectedLocationAddress,
  saveMarketplaceCartItems,
  saveMarketplaceCartQuantities,
} from "./marketplaceData";
import MarketplaceSavedLocations from "./MarketplaceSavedLocations";

export default function MarketPlaceCart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(getMarketplaceCartItems);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(getMarketplaceCartItems().map((item) => item.id)),
  );
  const [quantities, setQuantities] = useState(getMarketplaceCartQuantities);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(
    getMarketplaceSelectedLocationAddress,
  );
  const selectedItems = cartItems.filter((item) => selectedIds.has(item.id));
  const subtotal = selectedItems.reduce(
    (total, item) => total + item.price * (quantities[item.id] || 1),
    0,
  );
  const allItemsSelected =
    cartItems.length > 0 && selectedItems.length === cartItems.length;

  const toggleItemSelection = (productId) => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(productId)) nextIds.delete(productId);
      else nextIds.add(productId);
      return nextIds;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      allItemsSelected ? new Set() : new Set(cartItems.map((item) => item.id)),
    );
  };

  const updateQuantity = (productId, amount) => {
    const updatedQuantities = {
      ...quantities,
      [productId]: Math.max(1, (quantities[productId] || 1) + amount),
    };
    saveMarketplaceCartQuantities(updatedQuantities);
    setQuantities(updatedQuantities);
  };

  const removeFromCart = (productId) => {
    const updatedCartItems = cartItems.filter((item) => item.id !== productId);
    const updatedSelectedIds = new Set(selectedIds);
    updatedSelectedIds.delete(productId);
    const updatedQuantities = { ...quantities };
    delete updatedQuantities[productId];
    saveMarketplaceCartItems(updatedCartItems);
    saveMarketplaceCartQuantities(updatedQuantities);
    setCartItems(updatedCartItems);
    setSelectedIds(updatedSelectedIds);
    setQuantities(updatedQuantities);
  };

  return (
    <div className="marketplace-root marketplace-cart-page">
      <header className="marketplace-header marketplace-cart-header">
        <button
          className="marketplace-header-button"
          type="button"
          aria-label="Back to marketplace"
          onClick={() => navigate("/store", { state: { openDashboard: true } })}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back_ios
          </span>
        </button>
        <div className="marketplace-cart-header-title">
          <h1>My Cart ({cartItems.length})</h1>
          <button
            className="marketplace-cart-location"
            type="button"
            aria-label={`Delivery location: ${deliveryLocation}. Change address`}
            onClick={() => setIsLocationSheetOpen(true)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              location_on
            </span>
            <span className="marketplace-cart-location-address">
              {deliveryLocation}
            </span>
            <span className="material-symbols-outlined marketplace-cart-location-chevron" aria-hidden="true">
              chevron_right
            </span>
          </button>
        </div>
        <button
          className="marketplace-cart-header-edit"
          type="button"
          onClick={() => setIsEditing((editing) => !editing)}
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </header>

      <main className="marketplace-content marketplace-cart-content">
        {cartItems.length === 0 ? (
          <section className="marketplace-cart-empty" aria-live="polite">
            <span className="material-symbols-outlined" aria-hidden="true">
              shopping_bag
            </span>
            <h3>Your cart is empty</h3>
            <p>Browse the categories and add something you like.</p>
            <Link className="marketplace-cart-continue" to="/store" state={{ openDashboard: true }}>
              Start shopping
            </Link>
          </section>
        ) : (
          <div className="marketplace-cart-layout">
            <section
              className="marketplace-cart-items"
              aria-label="Items in your cart"
            >
              <div className="marketplace-cart-shop">
                <label className="marketplace-cart-checkbox">
                  <input
                    type="checkbox"
                    checked={allItemsSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all products"
                  />
                  <span aria-hidden="true" />
                </label>
                <span className="marketplace-cart-shop-name">Market Place</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_right
                </span>
              </div>

              {cartItems.map((item) => (
                <article className="marketplace-cart-item" key={item.id}>
                  <label className="marketplace-cart-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                    <span aria-hidden="true" />
                  </label>
                  <div className="marketplace-cart-item-image">
                    {item.image && <img src={item.image} alt={item.name} />}
                  </div>
                  <div className="marketplace-cart-item-details">
                    <p>{getMarketplaceCategory(item.category).label}</p>
                    <h3>{item.name}</h3>
                    {item.shopName && <span>{item.shopName}</span>}
                    <div className="marketplace-cart-item-actions">
                      <strong>{formatMarketplacePrice(item.price)}</strong>
                      <div
                        className="marketplace-cart-quantity"
                        aria-label={`Quantity: ${quantities[item.id] || 1}`}
                      >
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          disabled={(quantities[item.id] || 1) <= 1}
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            remove
                          </span>
                        </button>
                        <span aria-live="polite">{quantities[item.id] || 1}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          disabled={
                            Number.isFinite(item.stock) &&
                            (quantities[item.id] || 1) >= item.stock
                          }
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            add
                          </span>
                        </button>
                      </div>
                    </div>
                    {(item.rating || item.sold > 0) && (
                      <span className="marketplace-cart-item-rating">
                        {item.rating ? (
                          <>
                            <span className="material-symbols-outlined" aria-hidden="true">
                              star
                            </span>
                            {item.rating.toFixed(1)}
                            {item.sold > 0 && " · "}
                          </>
                        ) : null}
                        {item.sold > 0 && `${item.sold} sold`}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      className="marketplace-cart-remove"
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => removeFromCart(item.id)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        delete
                      </span>
                    </button>
                  )}
                </article>
              ))}
              <Link className="marketplace-cart-keep-shopping" to="/store" state={{ openDashboard: true }}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_back
                </span>
                Continue shopping
              </Link>
            </section>

          </div>
        )}
      </main>

      {cartItems.length > 0 && (
        <div className="marketplace-cart-dock">
          <div className="marketplace-cart-promo">
            Get <strong>₱200.00 bonus</strong> for ₱1,500.00 order
          </div>
          <div className="marketplace-cart-dock-actions">
            <label className="marketplace-cart-dock-select">
              <span className="marketplace-cart-checkbox">
                <input
                  type="checkbox"
                  checked={allItemsSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all products"
                />
                <span aria-hidden="true" />
              </span>
              <span>All</span>
            </label>
            <strong
              className="marketplace-cart-dock-total"
              aria-live="polite"
              aria-label={`Selected total: ${formatMarketplacePrice(subtotal)}`}
            >
              {formatMarketplacePrice(subtotal)}
            </strong>
            <button
              className="marketplace-cart-checkout"
              type="button"
              disabled={selectedItems.length === 0}
            >
              Check out
            </button>
          </div>
        </div>
      )}
      {isLocationSheetOpen && (
        <MarketplaceSavedLocations
          onClose={() => setIsLocationSheetOpen(false)}
          onSelectLocation={(location) =>
            setDeliveryLocation(location.address)
          }
        />
      )}
    </div>
  );
}