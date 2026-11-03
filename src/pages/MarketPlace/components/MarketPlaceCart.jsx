import { Link } from "react-router-dom";

export default function MarketPlaceCart({ itemCount = 0 }) {
  return (
    <Link
      className="marketplace-cart-icon"
      to="/store/cart"
      aria-label={`Shopping cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        shopping_cart
      </span>
      {itemCount > 0 && (
        <span className="marketplace-cart-count" aria-hidden="true">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
