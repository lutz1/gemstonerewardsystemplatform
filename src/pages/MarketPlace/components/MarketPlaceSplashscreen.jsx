import splashImage from "../../../assets/marketsplashscreen.jpg";
import "./MarketPlaceSplashscreen.css";

export default function MarketPlaceSplashscreen({ isLoading, onShopNow }) {
  return (
    <main className="marketplace-splash">
      <div
        className="marketplace-splash-art"
        role="img"
        aria-label="Gemstone Marketplace"
        style={{ backgroundImage: `url("${splashImage}")` }}
      />
      <div className="marketplace-splash-action">
        {isLoading ? (
          <div
            className="marketplace-splash-loading"
            role="status"
            aria-live="polite"
          >
            <span className="marketplace-splash-spinner" aria-hidden="true" />
            <span>Loading marketplace...</span>
          </div>
        ) : (
          <button
            className="marketplace-splash-button"
            type="button"
            onClick={onShopNow}
          >
            Shop Now!
          </button>
        )}
      </div>
    </main>
  );
}
