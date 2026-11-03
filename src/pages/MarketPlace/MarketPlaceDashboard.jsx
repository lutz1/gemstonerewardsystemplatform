import { getFunctions, httpsCallable } from "firebase/functions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import { app } from "../../firebase";
import MarketPlaceCart from "./components/MarketPlaceCart";
import MarketPlaceMessages from "./components/MarketPlaceMessages";
import MarketPlaceSplashscreen from "./components/MarketPlaceSplashscreen";
import MarketPlaceStatus from "./components/MarketPlaceStatus";
import SellerLogin from "./seller/SellerLogin";
import SellerSplashScreen from "./seller/SellerSplashScreen";
import SellerApplication from "./seller/SellerApplication";
import SellerLandingPage from "./seller/SellerLandingPage";
import SellerDashboard from "./seller/SellerDashboard";
import "./MarketPlaceDashboard.css";
import {
  formatMarketplacePrice,
  gemstones,
  getMarketplaceCartIds,
  getMarketplaceSelectedLocationAddress,
  saveMarketplaceCartIds,
} from "./marketplaceData";

const marketplaceBanners = [
  {
    eyebrow: "GROW WITH GEMSTONE",
    title: "Want to become a seller?",
    description: "Share your gemstones with buyers looking for something special.",
    action: "Start your seller journey",
    icon: "storefront",
    theme: "seller",
  },
  {
    eyebrow: "FIND SOMETHING RARE",
    title: "Discover fine gemstones",
    description: "Explore a curated collection of colorful treasures.",
    action: "Explore the collection",
    icon: "diamond",
    theme: "discover",
  },
];

function MarketPlaceBottomNav({ activeItem, onSelect, unreadCount = 0 }) {
  const items = [
    { key: "home", label: "Home", icon: "home" },
    { key: "orders", label: "My Orders", icon: "receipt_long" },
    { key: "inbox", label: "Inbox", icon: "inbox" },
    { key: "account", label: "Account", icon: "person" },
  ];

  return (
    <nav className="marketplace-bottom-nav" aria-label="Marketplace navigation">
      {items.map((item) => (
        <button
          className={`marketplace-bottom-nav-item${activeItem === item.key ? " is-active" : ""}`}
          key={item.key}
          type="button"
          aria-current={activeItem === item.key ? "page" : undefined}
          onClick={() => onSelect(item.key)}
        >
          <span className="marketplace-bottom-nav-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            {item.key === "inbox" && unreadCount > 0 && (
              <span className="marketplace-bottom-nav-badge" aria-hidden="true">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function MarketPlaceDashboardSkeleton() {
  return (
    <div
      className="marketplace-dashboard-skeleton"
      aria-label="Loading Marketplace content"
      role="status"
    >
      <span className="marketplace-skeleton-location" />
      <span className="marketplace-skeleton-search" />
      <div className="marketplace-skeleton-shortcuts">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="marketplace-skeleton-shortcut" key={index}>
            <span />
            <span />
          </div>
        ))}
      </div>
      <span className="marketplace-skeleton-banner" />
      <div className="marketplace-skeleton-heading">
        <span />
        <span />
      </div>
      <span className="marketplace-skeleton-live" />
      <div className="marketplace-skeleton-heading">
        <span />
        <span />
      </div>
      <div className="marketplace-skeleton-products">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="marketplace-skeleton-product" key={index}>
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketPlaceDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { seller } = useAuth();
  const [view, setView] = useState(() =>
    location.state?.openDashboard ? "dashboard" : "splash",
  );
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(() => new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [cartIds, setCartIds] = useState(getMarketplaceCartIds);
  const [deliveryLocation, setDeliveryLocation] = useState(
    getMarketplaceSelectedLocationAddress,
  );
  const [showAll, setShowAll] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [shortcutNotice, setShortcutNotice] = useState("");
  const [sellerApplication, setSellerApplication] = useState(null);
  const [applicationToEditId, setApplicationToEditId] = useState(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isInitialDashboardLoading, setIsInitialDashboardLoading] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState("");
  const touchStartY = useRef(null);
  const pullDistanceRef = useRef(0);

  const refreshUnreadMessageCount = useCallback(async () => {
    const getUserMessages = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserMessages",
    );
    const { data } = await getUserMessages();
    setUnreadMessageCount(
      Number.isSafeInteger(data?.unreadCount) && data.unreadCount > 0
        ? data.unreadCount
        : 0,
    );
  }, []);

  const refreshDashboardContent = useCallback(async () => {
    setIsRefreshing(true);
    setIsInitialDashboardLoading(true);
    setRefreshResult("");

    try {
      setCartIds(getMarketplaceCartIds());
      setDeliveryLocation(getMarketplaceSelectedLocationAddress());
      await refreshUnreadMessageCount();
      setRefreshResult("Marketplace refreshed");
    } catch (error) {
      globalThis.console.error("Could not refresh Marketplace dashboard content.", error);
      setRefreshResult("Could not refresh Marketplace content");
    } finally {
      setIsInitialDashboardLoading(false);
      setIsRefreshing(false);
      setPullDistance(0);
      pullDistanceRef.current = 0;
      touchStartY.current = null;
    }
  }, [refreshUnreadMessageCount]);

  useEffect(() => {
    if (!refreshResult) return undefined;
    const timer = window.setTimeout(() => setRefreshResult(""), 1800);
    return () => window.clearTimeout(timer);
  }, [refreshResult]);

  useEffect(() => {
    if (!shortcutNotice) return undefined;
    const timer = window.setTimeout(() => setShortcutNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [shortcutNotice]);

  const handleTouchStart = (event) => {
    if (isRefreshing || window.scrollY > 0 || event.touches.length !== 1) return;
    if (event.target.closest("button, input, a, textarea, select")) return;
    touchStartY.current = event.touches[0].clientY;
    setRefreshResult("");
  };

  const handleTouchMove = (event) => {
    if (touchStartY.current === null || isRefreshing) return;
    const distance = event.touches[0].clientY - touchStartY.current;
    if (distance > 0) {
      const nextPullDistance = Math.min(distance * 0.5, 76);
      pullDistanceRef.current = nextPullDistance;
      setPullDistance(nextPullDistance);
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const shouldRefresh = pullDistanceRef.current >= 64;
    touchStartY.current = null;
    if (shouldRefresh) {
      void refreshDashboardContent();
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  };

  const handleTouchCancel = () => {
    touchStartY.current = null;
    pullDistanceRef.current = 0;
    setPullDistance(0);
  };

  useEffect(() => {
    if (view !== "loading") return undefined;

    const timer = window.setTimeout(() => setView("dashboard"), 800);
    return () => window.clearTimeout(timer);
  }, [view]);

  const handleSellerJourney = () => setView("seller-landing");
  const handleSellerShortcut = () => {
    setView(seller ? "seller-welcome" : "seller-landing");
  };

  const handleStartSellerJourney = async () => {
    setView("seller-status-checking");
    try {
      const getSellerApplicationStatus = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getSellerApplicationStatus",
      );
      const { data } = await getSellerApplicationStatus();
      if (data?.application) {
        setSellerApplication(data.application);
        setView("seller-status");
      } else {
        setView("seller-application");
      }
    } catch (error) {
      globalThis.console.error("Could not check seller application status.", error);
      setView("seller-status");
    }
  };

  useEffect(() => {
    if (view !== "dashboard" || marketplaceBanners.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % marketplaceBanners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "dashboard") return undefined;

    let isMounted = true;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadMessageCount().catch((error) => {
          if (isMounted) {
            globalThis.console.error(
              "Could not load unread Marketplace message count.",
              error,
            );
          }
        });
      }
    };
    const intervalId = window.setInterval(refreshWhenVisible, 30000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    void refreshUnreadMessageCount()
      .catch((error) => {
        if (isMounted) {
          globalThis.console.error(
            "Could not load unread Marketplace message count.",
            error,
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsInitialDashboardLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [refreshUnreadMessageCount, view]);

  const visibleGemstones = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = gemstones.filter((gemstone) => {
      const matchesQuery =
        !normalizedQuery ||
        `${gemstone.name} ${gemstone.category} ${gemstone.origin}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFeatured = showAll || gemstone.featured || Boolean(normalizedQuery);
      const matchesFavorites = !showFavorites || favorites.has(gemstone.id);

      return matchesQuery && matchesFeatured && matchesFavorites;
    });

    return filtered;
  }, [favorites, query, showAll, showFavorites]);

  const toggleFavorite = (gemstoneId) => {
    setFavorites((currentFavorites) => {
      const nextFavorites = new Set(currentFavorites);
      if (nextFavorites.has(gemstoneId)) {
        nextFavorites.delete(gemstoneId);
      } else {
        nextFavorites.add(gemstoneId);
      }
      return nextFavorites;
    });
  };

  const addToCart = (gemstoneId) => {
    if (cartIds.includes(gemstoneId)) return;

    const updatedCartIds = [...cartIds, gemstoneId];
    saveMarketplaceCartIds(updatedCartIds);
    setCartIds(updatedCartIds);
  };

  if (view === "seller-application") {
    return (
      <SellerApplication
        editApplicationId={applicationToEditId}
        onBack={() => {
          const returnView = applicationToEditId ? "messages" : "seller-landing";
          setApplicationToEditId(null);
          setView(returnView);
        }}
      />
    );
  }

  if (view === "messages") {
    return (
      <div className="marketplace-messages-with-nav">
        <MarketPlaceMessages
          onBack={() => setView("dashboard")}
          onUpdateApplication={(applicationId) => {
            setApplicationToEditId(applicationId || null);
            setView("seller-application");
          }}
        />
        <MarketPlaceBottomNav
          activeItem="inbox"
          unreadCount={unreadMessageCount}
          onSelect={(item) => {
            if (item === "home") setView("dashboard");
            if (item === "orders") setView("orders");
            if (item === "inbox") setView("messages");
            if (item === "account") navigate("/profile");
          }}
        />
      </div>
    );
  }

  if (view === "seller-status") {
    return (
      <MarketPlaceStatus
        onBack={() => setView("seller-landing")}
        onStartApplication={() => {
          setApplicationToEditId(null);
          setView("seller-application");
        }}
        initialApplication={sellerApplication}
      />
    );
  }

  if (view === "seller-status-checking") {
    return <LoadingScreen label="Checking your seller application..." />;
  }

  if (view === "seller-landing") {
    return (
      <SellerLandingPage
        onBack={() => setView("dashboard")}
        onStartSellerJourney={handleStartSellerJourney}
      />
    );
  }

  if (view === "seller-welcome") {
    return (
      <SellerSplashScreen
        onBack={() => setView("dashboard")}
        onGetStarted={() => setView("seller-login")}
      />
    );
  }

  if (view === "seller-login") {
    return (
      <SellerLogin
        onBack={() => setView("seller-welcome")}
        onSuccess={() => setView("seller-dashboard")}
      />
    );
  }

  if (view === "seller-dashboard") {
    return <SellerDashboard />;
  }

  if (view === "orders") {
    return (
      <div className="marketplace-root">
        <header className="marketplace-header marketplace-dashboard-header">
          <button
            className="marketplace-header-button"
            type="button"
            aria-label="Back to Marketplace"
            onClick={() => setView("dashboard")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back_ios
            </span>
          </button>
          <h1>My Orders</h1>
          <span />
        </header>
        <main className="marketplace-orders-empty">
          <span className="material-symbols-outlined" aria-hidden="true">
            receipt_long
          </span>
          <h2>Marketplace orders are coming soon</h2>
          <p>Your gemstone purchases will appear here.</p>
        </main>
        <MarketPlaceBottomNav
          activeItem="orders"
          unreadCount={unreadMessageCount}
          onSelect={(item) => {
            if (item === "home") setView("dashboard");
            if (item === "orders") setView("orders");
            if (item === "inbox") setView("messages");
            if (item === "account") navigate("/profile");
          }}
        />
      </div>
    );
  }

  if (view !== "dashboard") {
    return (
      <MarketPlaceSplashscreen
        isLoading={view === "loading"}
        onShopNow={() => setView("loading")}
      />
    );
  }

  return (
    <div className="marketplace-root">
      <header className="marketplace-header marketplace-dashboard-header">
        <button
          className="marketplace-header-button"
          type="button"
          aria-label="Back to dashboard"
          onClick={() => navigate("/dashboard")}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back_ios
          </span>
        </button>
        <h1>Market Place</h1>
        <div className="marketplace-dashboard-header-actions">
          <button
            className={`marketplace-header-favorites${showFavorites ? " is-active" : ""}`}
            type="button"
            aria-label={`Show favorites, ${favorites.size} saved`}
            aria-pressed={showFavorites}
            onClick={() => setShowFavorites((current) => !current)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              favorite
            </span>
            {favorites.size > 0 && (
              <span className="marketplace-favorites-count" aria-hidden="true">
                {favorites.size > 99 ? "99+" : favorites.size}
              </span>
            )}
          </button>
          <MarketPlaceCart itemCount={cartIds.length} />
          <a
            className="marketplace-header-customer-service"
            href="mailto:support@gemstonecode.com"
            aria-label="Contact customer service"
            title="Contact customer service"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              support_agent
            </span>
          </a>
        </div>
      </header>

      <div
        className={`marketplace-pull-indicator${isRefreshing ? " is-refreshing" : ""}`}
        style={{
          height: `${isRefreshing ? 48 : Math.max(pullDistance, refreshResult ? 40 : 0)}px`,
        }}
        role="status"
        aria-live="polite"
      >
        {(pullDistance > 0 || isRefreshing || refreshResult) && (
          <>
            <span className="material-symbols-outlined" aria-hidden="true">
              {isRefreshing
                ? "progress_activity"
                : refreshResult
                  ? refreshResult === "Marketplace refreshed"
                    ? "check_circle"
                    : "error_outline"
                  : "south"}
            </span>
            <span>
              {isRefreshing
                ? "Refreshing marketplace..."
                : pullDistance >= 64
                  ? "Release to refresh"
                  : refreshResult || "Pull down to refresh"}
            </span>
          </>
        )}
      </div>

      <main
        className="marketplace-content"
        aria-busy={isInitialDashboardLoading}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {isInitialDashboardLoading ? (
          <MarketPlaceDashboardSkeleton />
        ) : (
          <>
        <div
          className="marketplace-dashboard-location"
          aria-label={`Delivery location: ${deliveryLocation}`}
          title={deliveryLocation}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            location_on
          </span>
          <span>{deliveryLocation}</span>
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
        </div>
        <label className="marketplace-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search gemstones..."
            aria-label="Search gemstones"
          />
        </label>

        <nav className="marketplace-shortcuts" aria-label="Marketplace shortcuts">
          <button
            className="marketplace-shortcut"
            type="button"
            onClick={() => setView("orders")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              receipt_long
            </span>
            <span>My Orders</span>
          </button>
          <button
            className="marketplace-shortcut"
            type="button"
            onClick={() => setShortcutNotice("My Promo Code is coming soon.")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              sell
            </span>
            <span>My Promo Code</span>
          </button>
          <button
            className="marketplace-shortcut"
            type="button"
            onClick={() => setShortcutNotice("My Voucher is coming soon.")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              confirmation_number
            </span>
            <span>My Voucher</span>
          </button>
          <button
            className="marketplace-shortcut"
            type="button"
            onClick={() => setShortcutNotice("My Activity is coming soon.")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              history
            </span>
            <span>My Activity</span>
          </button>
          <button
            className="marketplace-shortcut"
            type="button"
            onClick={handleSellerShortcut}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              storefront
            </span>
            <span>{seller ? "Manage My Shop" : "Be a Seller"}</span>
          </button>
          <button
            className="marketplace-shortcut"
            type="button"
            onClick={() => navigate("/help")}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              help
            </span>
            <span>Help</span>
          </button>
        </nav>

        {shortcutNotice && (
          <p className="marketplace-shortcut-notice" role="status" aria-live="polite">
            {shortcutNotice}
          </p>
        )}

        <section
          className="marketplace-banner"
          aria-label="Marketplace highlights"
          aria-roledescription="carousel"
        >
          <div
            className="marketplace-banner-track"
            style={{ "--active-banner": activeBanner }}
            aria-live="polite"
          >
            {marketplaceBanners.map((banner, index) => (
              <article
                className={`marketplace-banner-slide marketplace-banner-${banner.theme}`}
                key={banner.theme}
                aria-hidden={index !== activeBanner}
                aria-label={`${index + 1} of ${marketplaceBanners.length}: ${banner.title}`}
                aria-roledescription="slide"
              >
                <div className="marketplace-banner-copy">
                  <p className="marketplace-banner-eyebrow">{banner.eyebrow}</p>
                  <h2>{banner.title}</h2>
                  <p className="marketplace-banner-description">
                    {banner.description}
                  </p>
                  {banner.theme === "seller" ? (
                    <button
                      className="marketplace-banner-action"
                      type="button"
                      tabIndex={index === activeBanner ? 0 : -1}
                      onClick={handleSellerJourney}
                    >
                      {banner.action}
                      <span className="material-symbols-outlined" aria-hidden="true">
                        arrow_forward
                      </span>
                    </button>
                  ) : (
                    <span className="marketplace-banner-action">
                      {banner.action}
                      <span className="material-symbols-outlined" aria-hidden="true">
                        arrow_forward
                      </span>
                    </span>
                  )}
                </div>
                <span className="marketplace-banner-art" aria-hidden="true">
                  <span className="material-symbols-outlined">{banner.icon}</span>
                </span>
              </article>
            ))}
          </div>
          <div className="marketplace-banner-controls">
            <div className="marketplace-banner-dots" aria-label="Choose banner">
              {marketplaceBanners.map((banner, index) => (
                <button
                  key={banner.theme}
                  type="button"
                  className={index === activeBanner ? "is-active" : ""}
                  aria-label={`Show banner ${index + 1}: ${banner.title}`}
                  aria-current={index === activeBanner ? "true" : undefined}
                  onClick={() => setActiveBanner(index)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="marketplace-live-section" aria-labelledby="marketplace-live-title">
          <div className="marketplace-section-heading">
            <h2 id="marketplace-live-title">Live Selling</h2>
          </div>
          <div className="marketplace-live-coming-soon">
            <span className="material-symbols-outlined" aria-hidden="true">
              videocam
            </span>
            <div>
              <h3>Coming Soon</h3>
              <p>Live gemstone showcases are on the way.</p>
            </div>
          </div>
        </section>

        <section className="marketplace-listing" aria-labelledby="marketplace-featured-title">
          <div className="marketplace-section-heading">
            <h2 id="marketplace-featured-title">
              {showFavorites
                ? "Favorite Gemstones"
                : query || showAll
                  ? "Gemstones"
                  : "Featured Gemstones"}
            </h2>
            <button
              className="marketplace-view-all"
              type="button"
              onClick={() => {
                if (showFavorites) {
                  setShowFavorites(false);
                  setShowAll(true);
                  return;
                }
                setShowAll((current) => !current);
              }}
            >
              {showFavorites ? "All Gemstones" : showAll ? "Featured" : "View All"}
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </div>

          {visibleGemstones.length ? (
            <div className="marketplace-grid">
              {visibleGemstones.map((gemstone, index) => {
                const isFavorite = favorites.has(gemstone.id);
                return (
                  <article className="marketplace-card" key={gemstone.id}>
                    <div className={`marketplace-card-image marketplace-gem-${gemstone.color}`}>
                      <img src={gemstone.image} alt={gemstone.name} />
                      {index === 0 && !query && !showAll && !showFavorites && (
                        <span className="marketplace-featured-tag">Featured</span>
                      )}
                      <button
                        className={`marketplace-favorite${isFavorite ? " is-favorite" : ""}`}
                        type="button"
                        aria-label={
                          isFavorite
                            ? `Remove ${gemstone.name} from favorites`
                            : `Add ${gemstone.name} to favorites`
                        }
                        aria-pressed={isFavorite}
                        onClick={() => toggleFavorite(gemstone.id)}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          favorite
                        </span>
                      </button>
                    </div>
                    <div className="marketplace-card-details">
                      <h3>{gemstone.name}</h3>
                      <p>
                        {gemstone.carat} <span aria-hidden="true">·</span> {gemstone.origin}
                      </p>
                      <strong>{formatMarketplacePrice(gemstone.price)}</strong>
                      <div className="marketplace-card-meta">
                        <span
                          className="marketplace-card-rating"
                          aria-label={`Rated ${gemstone.rating} out of 5`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            star
                          </span>
                          {gemstone.rating.toFixed(1)}
                        </span>
                        <span>{gemstone.sold} sold</span>
                      </div>
                      <button
                        className="marketplace-add-to-cart"
                        type="button"
                        disabled={cartIds.includes(gemstone.id)}
                        onClick={() => addToCart(gemstone.id)}
                      >
                        {cartIds.includes(gemstone.id) ? "Added to cart" : "Add to cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="marketplace-empty" role="status">
              {showFavorites
                ? "No favorites yet. Tap the heart on a gemstone to save it here."
                : "No gemstones found. Try another search or category."}
            </p>
          )}
        </section>
          </>
        )}
      </main>
      <MarketPlaceBottomNav
        activeItem="home"
        unreadCount={unreadMessageCount}
        onSelect={(item) => {
          if (item === "home") setView("dashboard");
          if (item === "orders") setView("orders");
          if (item === "inbox") setView("messages");
          if (item === "account") navigate("/profile");
        }}
      />
    </div>
  );
}
