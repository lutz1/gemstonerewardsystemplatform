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
import "./MarketPlaceDashboard.css";
import {
  MARKETPLACE_CATEGORIES,
  formatMarketplacePrice,
  getMarketplaceCartItems,
  getMarketplaceCartQuantities,
  getMarketplaceCategory,
  getMarketplaceSelectedLocationAddress,
  normalizeMarketplaceProduct,
  saveMarketplaceCartItems,
  saveMarketplaceCartQuantities,
  toMarketplaceCartItem,
} from "./marketplaceData";
import "./MarketPlaceShop.css";
import SellerApplication from "./seller/SellerApplication";
import SellerDashboard from "./seller/SellerDashboard";
import SellerLandingPage from "./seller/SellerLandingPage";
import SellerLogin from "./seller/SellerLogin";
import SellerSplashScreen from "./seller/SellerSplashScreen";

const marketplaceBanners = [
  {
    eyebrow: "SELL ON MARKET PLACE",
    title: "Want to become a seller?",
    description: "Reach buyers looking for cologne, soap, coffee and more.",
    action: "Start your seller journey",
    icon: "storefront",
    theme: "seller",
  },
  {
    eyebrow: "SHOP EVERYDAY FINDS",
    title: "Everything you need, in one place",
    description: "Browse categories and discover products from our sellers.",
    action: "Start shopping",
    icon: "shopping_bag",
    theme: "discover",
  },
];

const UNKNOWN_SHOP_KEY = "unknown-seller";

// Reads the seller identifier from a raw seller listing (whichever field the
// backend provides). Falls back to the shop name when there is no id.
function getRawSellerId(rawProduct) {
  const candidates = [
    rawProduct?.sellerId,
    rawProduct?.sellerUid,
    rawProduct?.sellerUserId,
    rawProduct?.ownerId,
    rawProduct?.shopId,
    rawProduct?.seller?.id,
    rawProduct?.seller?.uid,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

// Every product belongs to exactly one shop. Products from the same seller
// share the same key, which is what the seller page groups by.
function getShopKey(product) {
  if (product.sellerId) return `id:${product.sellerId}`;
  if (product.shopName) return `name:${product.shopName.trim().toLowerCase()}`;
  return UNKNOWN_SHOP_KEY;
}

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

function MarketPlaceProductGallery({ images, name, fallbackIcon }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  if (images.length === 0) {
    return (
      <div className="marketplace-detail-gallery marketplace-detail-gallery-empty">
        <span className="material-symbols-outlined" aria-hidden="true">
          {fallbackIcon}
        </span>
      </div>
    );
  }

  const showPhoto = (index) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="marketplace-detail-gallery">
      <div
        className="marketplace-detail-gallery-track"
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
        }}
      >
        {images.map((image, index) => (
          <img
            key={`${index}-${image}`}
            src={image}
            alt={`${name}, photo ${index + 1} of ${images.length}`}
            loading={index === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <span className="marketplace-detail-gallery-count" aria-hidden="true">
            {activeIndex + 1}/{images.length}
          </span>
          <div className="marketplace-detail-thumbs">
            {images.map((image, index) => (
              <button
                className={index === activeIndex ? "is-active" : ""}
                key={`${index}-${image}`}
                type="button"
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => showPhoto(index)}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MarketPlaceProductSkeleton({ count = 4 }) {
  return (
    <div className="marketplace-skeleton-products" role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <div className="marketplace-skeleton-product" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
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
      <span className="marketplace-skeleton-banner" />
      <div className="marketplace-skeleton-categories">
        {Array.from({ length: 10 }, (_, index) => (
          <div className="marketplace-skeleton-category" key={index}>
            <span />
            <span />
          </div>
        ))}
      </div>
      <div className="marketplace-skeleton-heading">
        <span />
        <span />
      </div>
      <MarketPlaceProductSkeleton />
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
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedShopKey, setSelectedShopKey] = useState("");
  const [shopQuery, setShopQuery] = useState("");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [favorites, setFavorites] = useState(() => new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [cartItems, setCartItems] = useState(getMarketplaceCartItems);
  const [deliveryLocation, setDeliveryLocation] = useState(
    getMarketplaceSelectedLocationAddress,
  );
  const [approvedSellerProducts, setApprovedSellerProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
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
  const listingRef = useRef(null);
  const scrollPositionRef = useRef(null);

  const cartIds = useMemo(() => cartItems.map((item) => item.id), [cartItems]);

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

  const loadApprovedProducts = useCallback(async () => {
    try {
      const getPublicSellerProducts = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getPublicSellerProducts",
      );
      const { data } = await getPublicSellerProducts();
      setApprovedSellerProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (error) {
      globalThis.console.error("Failed to load public seller products:", error);
      setApprovedSellerProducts([]);
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  const refreshDashboardContent = useCallback(async () => {
    setIsRefreshing(true);
    setIsInitialDashboardLoading(true);
    setRefreshResult("");

    try {
      setCartItems(getMarketplaceCartItems());
      setDeliveryLocation(getMarketplaceSelectedLocationAddress());
      await Promise.all([refreshUnreadMessageCount(), loadApprovedProducts()]);
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
  }, [loadApprovedProducts, refreshUnreadMessageCount]);

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

  useEffect(() => {
    void loadApprovedProducts();
    window.addEventListener("focus", loadApprovedProducts);
    return () => window.removeEventListener("focus", loadApprovedProducts);
  }, [loadApprovedProducts]);

  useEffect(() => {
    if (view !== "dashboard" || scrollPositionRef.current === null) return;
    const scrollY = scrollPositionRef.current;
    scrollPositionRef.current = null;
    window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }, [view]);

  const products = useMemo(
    () =>
      approvedSellerProducts
        .map((rawProduct) => {
          const product = normalizeMarketplaceProduct(rawProduct);
          if (!product) return null;
          return { ...product, sellerId: getRawSellerId(rawProduct) };
        })
        .filter(Boolean),
    [approvedSellerProducts],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const categoryLabel = getMarketplaceCategory(product.category).label;
      const matchesQuery =
        !normalizedQuery ||
        `${product.name} ${categoryLabel} ${product.shopName}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = !activeCategory || product.category === activeCategory;
      const matchesFavorites = !showFavorites || favorites.has(product.id);

      return matchesQuery && matchesCategory && matchesFavorites;
    });
  }, [activeCategory, favorites, products, query, showFavorites]);

  // Every product sold by the seller whose shop is currently open.
  const shopProducts = useMemo(
    () =>
      selectedShopKey
        ? products.filter((product) => getShopKey(product) === selectedShopKey)
        : [],
    [products, selectedShopKey],
  );

  const visibleShopProducts = useMemo(() => {
    const normalizedQuery = shopQuery.trim().toLowerCase();
    if (!normalizedQuery) return shopProducts;
    return shopProducts.filter((product) => {
      const categoryLabel = getMarketplaceCategory(product.category).label;
      return `${product.name} ${categoryLabel}`.toLowerCase().includes(normalizedQuery);
    });
  }, [shopProducts, shopQuery]);

  const toggleFavorite = (productId) => {
    setFavorites((currentFavorites) => {
      const nextFavorites = new Set(currentFavorites);
      if (nextFavorites.has(productId)) {
        nextFavorites.delete(productId);
      } else {
        nextFavorites.add(productId);
      }
      return nextFavorites;
    });
  };

  const addToCart = (product, quantity = 1) => {
    if (cartIds.includes(product.id) || product.stock === 0) return;

    const updatedCartItems = [...cartItems, toMarketplaceCartItem(product)];
    saveMarketplaceCartItems(updatedCartItems);
    saveMarketplaceCartQuantities({
      ...getMarketplaceCartQuantities(),
      [product.id]: quantity,
    });
    setCartItems(updatedCartItems);
  };

  // Dashboard products are gateways: tapping one opens the seller's shop page
  // listing everything that seller sells.
  const openShop = (product) => {
    if (view === "dashboard") scrollPositionRef.current = window.scrollY;
    setSelectedShopKey(getShopKey(product));
    setShopQuery("");
    setView("shop");
    window.scrollTo(0, 0);
  };

  // Opened from a product on the seller's shop page: shows the full product
  // information (gallery, price, specs, description).
  const openProduct = (product) => {
    setSelectedProductId(product.id);
    setDetailQuantity(1);
    setView("product");
    window.scrollTo(0, 0);
  };

  const selectCategory = (categoryId) => {
    setShowFavorites(false);
    setActiveCategory((current) => (current === categoryId ? "" : categoryId));
    window.requestAnimationFrame(() => {
      listingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const resetFilters = () => {
    setActiveCategory("");
    setShowFavorites(false);
    setQuery("");
  };

  const renderProductCard = (product, onOpen, openLabel) => {
    // The whole card is tappable; the heart and cart buttons keep their own action.
    const handleCardClick = (event) => {
      if (event.target.closest(".marketplace-favorite, .marketplace-add-to-cart")) return;
      onOpen(product);
    };
    const isFavorite = favorites.has(product.id);
    const isInCart = cartIds.includes(product.id);
    const category = getMarketplaceCategory(product.category);
    const isOutOfStock = product.stock === 0;
    return (
      <article
        className="marketplace-card"
        key={product.id}
        style={{ cursor: "pointer" }}
        onClick={handleCardClick}
      >
        <div className="marketplace-card-image">
          {product.image ? (
            <img src={product.image} alt={product.name} loading="lazy" />
          ) : (
            <span
              className="material-symbols-outlined marketplace-card-image-placeholder"
              aria-hidden="true"
            >
              {category.icon}
            </span>
          )}
          <button
            className={`marketplace-favorite${isFavorite ? " is-favorite" : ""}`}
            type="button"
            aria-label={
              isFavorite
                ? `Remove ${product.name} from favorites`
                : `Add ${product.name} to favorites`
            }
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(product.id)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              favorite
            </span>
          </button>
        </div>
        <div className="marketplace-card-details">
          <h3>
            <button
              className="marketplace-card-open"
              type="button"
              title={openLabel}
            >
              {product.name}
            </button>
          </h3>
          <span className="marketplace-card-category">{category.label}</span>
          <div className="marketplace-card-bottom">
            <strong>{formatMarketplacePrice(product.price)}</strong>
            <button
              className="marketplace-add-to-cart"
              type="button"
              disabled={isInCart || isOutOfStock}
              aria-label={
                isOutOfStock
                  ? `${product.name} is out of stock`
                  : isInCart
                    ? `${product.name} is in your cart`
                    : `Add ${product.name} to cart`
              }
              onClick={() => addToCart(product)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isInCart ? "check" : "add_shopping_cart"}
              </span>
            </button>
          </div>
          <div className="marketplace-card-meta">
            {product.rating !== null && (
              <span
                className="marketplace-card-rating"
                aria-label={`Rated ${product.rating} out of 5`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  star
                </span>
                {product.rating.toFixed(1)}
              </span>
            )}
            <span>{product.sold} sold</span>
            {isOutOfStock && <span className="marketplace-card-soldout">Sold out</span>}
          </div>
        </div>
      </article>
    );
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
          <p>Your purchases will appear here.</p>
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

  if (view === "shop") {
    const shopName =
      shopProducts.find((product) => product.shopName)?.shopName || "Marketplace seller";

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
          <h1>{shopName}</h1>
          <div className="marketplace-dashboard-header-actions">
            <MarketPlaceCart itemCount={cartIds.length} />
          </div>
        </header>
        <main className="marketplace-content">
          <section className="marketplace-shop-hero" aria-label="Seller">
            <span className="marketplace-shop-avatar" aria-hidden="true">
              <span className="material-symbols-outlined">storefront</span>
            </span>
            <div className="marketplace-shop-info">
              <h2>{shopName}</h2>
              <p>
                {shopProducts.length} {shopProducts.length === 1 ? "product" : "products"}
              </p>
            </div>
          </section>

          {shopProducts.length > 0 && (
            <label className="marketplace-search marketplace-shop-search">
              <span className="material-symbols-outlined" aria-hidden="true">
                search
              </span>
              <input
                type="search"
                value={shopQuery}
                onChange={(event) => setShopQuery(event.target.value)}
                placeholder={`Search in ${shopName}`}
                aria-label="Search this shop's products"
              />
            </label>
          )}

          <section
            className="marketplace-listing marketplace-shop-listing"
            aria-labelledby="marketplace-shop-listing-title"
          >
            <div className="marketplace-section-heading">
              <h2 id="marketplace-shop-listing-title">All products</h2>
            </div>
            {visibleShopProducts.length ? (
              <div className="marketplace-grid">
                {visibleShopProducts.map((product) =>
                  renderProductCard(product, openProduct, "View product details"),
                )}
              </div>
            ) : shopProducts.length === 0 ? (
              <div className="marketplace-empty-state" role="status">
                <span className="material-symbols-outlined" aria-hidden="true">
                  inventory_2
                </span>
                <h3>No products available</h3>
                <p>This seller doesn&apos;t have any products listed right now.</p>
                <button
                  className="marketplace-empty-action"
                  type="button"
                  onClick={() => setView("dashboard")}
                >
                  Back to Marketplace
                </button>
              </div>
            ) : (
              <p className="marketplace-empty" role="status">
                No products found in this shop.
              </p>
            )}
          </section>
        </main>
      </div>
    );
  }

  if (view === "product") {
    const product = products.find((item) => item.id === selectedProductId);
    // Back returns to the seller's shop page the product was chosen from.
    const backFromProduct = () => setView(selectedShopKey ? "shop" : "dashboard");
    const detailHeader = (
      <header className="marketplace-header marketplace-dashboard-header">
        <button
          className="marketplace-header-button"
          type="button"
          aria-label={selectedShopKey ? "Back to shop" : "Back to Marketplace"}
          onClick={backFromProduct}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back_ios
          </span>
        </button>
        <h1>Product Details</h1>
        <div className="marketplace-dashboard-header-actions">
          <MarketPlaceCart itemCount={cartIds.length} />
        </div>
      </header>
    );

    if (!product) {
      return (
        <div className="marketplace-root">
          {detailHeader}
          <main className="marketplace-orders-empty">
            <span className="material-symbols-outlined" aria-hidden="true">
              inventory_2
            </span>
            <h2>This product isn&apos;t available</h2>
            <p>It may have been removed by the seller.</p>
            <button
              className="marketplace-empty-action"
              type="button"
              onClick={() => setView("dashboard")}
            >
              Back to Marketplace
            </button>
          </main>
        </div>
      );
    }

    const category = getMarketplaceCategory(product.category);
    const isFavorite = favorites.has(product.id);
    const isInCart = cartIds.includes(product.id);
    const isOutOfStock = product.stock === 0;
    const maxQuantity = product.stock ?? 99;
    let stockText = "";
    if (isOutOfStock) stockText = "Out of stock";
    else if (product.stock !== null && product.stock <= 5) stockText = `Only ${product.stock} left`;
    else if (product.stock !== null) stockText = `${product.stock} available`;
    const specifications = [
      { label: "Category", value: category.label },
      product.brand && { label: "Brand", value: product.brand },
      product.size && { label: "Size", value: product.size },
      product.stock !== null && { label: "Stock", value: String(product.stock) },
      product.shipsFrom && { label: "Ships from", value: product.shipsFrom },
    ].filter(Boolean);

    return (
      <div className="marketplace-root marketplace-detail-page">
        {detailHeader}
        <main className="marketplace-detail">
          <MarketPlaceProductGallery
            key={product.id}
            images={product.images}
            name={product.name}
            fallbackIcon={category.icon}
          />

          <section className="marketplace-detail-card">
            <strong className="marketplace-detail-price">
              {formatMarketplacePrice(product.price)}
            </strong>
            <h2 className="marketplace-detail-name">{product.name}</h2>
            <div className="marketplace-detail-meta">
              <span className="marketplace-card-category">{category.label}</span>
              {product.rating !== null ? (
                <span
                  className="marketplace-card-rating"
                  aria-label={`Rated ${product.rating} out of 5`}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    star
                  </span>
                  {product.rating.toFixed(1)}
                </span>
              ) : (
                <span>No ratings yet</span>
              )}
              <span>{product.sold} sold</span>
            </div>
            {stockText && (
              <p className={`marketplace-detail-stock${isOutOfStock ? " is-out" : ""}`}>
                {stockText}
              </p>
            )}
          </section>

          {!isInCart && !isOutOfStock && (
            <section className="marketplace-detail-card marketplace-detail-quantity">
              <h3>Quantity</h3>
              <div className="marketplace-detail-stepper" aria-label={`Quantity: ${detailQuantity}`}>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={detailQuantity <= 1}
                  onClick={() => setDetailQuantity((current) => Math.max(1, current - 1))}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    remove
                  </span>
                </button>
                <span aria-live="polite">{detailQuantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={detailQuantity >= maxQuantity}
                  onClick={() =>
                    setDetailQuantity((current) => Math.min(maxQuantity, current + 1))
                  }
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    add
                  </span>
                </button>
              </div>
            </section>
          )}

          <section className="marketplace-detail-card marketplace-detail-row">
            <span className="material-symbols-outlined" aria-hidden="true">
              location_on
            </span>
            <div>
              <h3>Deliver to</h3>
              <p>{deliveryLocation}</p>
            </div>
          </section>

          <div
            className="marketplace-detail-card marketplace-detail-row marketplace-detail-shop-link"
            role="button"
            tabIndex={0}
            aria-label={`Visit ${product.shopName || "seller"}'s shop`}
            onClick={() => openShop(product)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openShop(product);
              }
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              storefront
            </span>
            <div>
              <h3>{product.shopName || "Marketplace seller"}</h3>
              <p>Sold on Market Place · Visit shop</p>
            </div>
            <span
              className="material-symbols-outlined marketplace-detail-shop-chevron"
              aria-hidden="true"
            >
              chevron_right
            </span>
          </div>

          <section className="marketplace-detail-card">
            <h3 className="marketplace-detail-heading">Product details</h3>
            <dl className="marketplace-detail-specs">
              {specifications.map((spec) => (
                <div key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="marketplace-detail-card">
            <h3 className="marketplace-detail-heading">Description</h3>
            <p className="marketplace-detail-description">
              {product.description || "The seller hasn't added a description yet."}
            </p>
          </section>
        </main>

        <div className="marketplace-detail-bar">
          <button
            className={`marketplace-detail-favorite${isFavorite ? " is-favorite" : ""}`}
            type="button"
            aria-label={
              isFavorite
                ? `Remove ${product.name} from favorites`
                : `Add ${product.name} to favorites`
            }
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(product.id)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              favorite
            </span>
          </button>
          <button
            className="marketplace-detail-add"
            type="button"
            disabled={isInCart || isOutOfStock}
            onClick={() => addToCart(product, detailQuantity)}
          >
            {isOutOfStock ? "Out of stock" : isInCart ? "Added to cart" : "Add to cart"}
          </button>
        </div>
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

  const activeCategoryLabel = activeCategory
    ? getMarketplaceCategory(activeCategory).label
    : "";
  const hasActiveFilter = Boolean(activeCategory || showFavorites || query.trim());
  let listingTitle = "Discover Products";
  if (showFavorites) listingTitle = "Favorites";
  else if (activeCategoryLabel) listingTitle = activeCategoryLabel;
  else if (query.trim()) listingTitle = "Search results";

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
        <h1 className="marketplace-visually-hidden">Market Place</h1>
        <label className="marketplace-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cologne, soap, coffee..."
            aria-label="Search products"
          />
        </label>
        <div className="marketplace-dashboard-header-actions">
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

            <section
              className="marketplace-categories"
              aria-labelledby="marketplace-categories-title"
            >
              <div className="marketplace-section-heading">
                <h2 id="marketplace-categories-title">Categories</h2>
              </div>
              <div className="marketplace-category-grid">
                {MARKETPLACE_CATEGORIES.map((category) => (
                  <button
                    className={`marketplace-category${activeCategory === category.id ? " is-active" : ""}`}
                    key={category.id}
                    type="button"
                    aria-pressed={activeCategory === category.id}
                    onClick={() => selectCategory(category.id)}
                  >
                    <span className="marketplace-category-icon">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {category.icon}
                      </span>
                    </span>
                    <span className="marketplace-category-label">{category.label}</span>
                  </button>
                ))}
              </div>
            </section>

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
                className={`marketplace-shortcut${showFavorites ? " is-active" : ""}`}
                type="button"
                aria-pressed={showFavorites}
                onClick={() => {
                  setActiveCategory("");
                  setShowFavorites((current) => !current);
                  window.requestAnimationFrame(() => {
                    listingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
              >
                <span className="marketplace-shortcut-icon">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    favorite
                  </span>
                  {favorites.size > 0 && (
                    <span className="marketplace-message-badge" aria-hidden="true">
                      {favorites.size > 99 ? "99+" : favorites.size}
                    </span>
                  )}
                </span>
                <span>Favorites</span>
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
              className="marketplace-listing"
              aria-labelledby="marketplace-listing-title"
              ref={listingRef}
            >
              <div className="marketplace-section-heading">
                <h2 id="marketplace-listing-title">{listingTitle}</h2>
                {hasActiveFilter && (
                  <button className="marketplace-view-all" type="button" onClick={resetFilters}>
                    All Products
                    <span className="material-symbols-outlined" aria-hidden="true">
                      chevron_right
                    </span>
                  </button>
                )}
              </div>

              {isProductsLoading ? (
                <MarketPlaceProductSkeleton />
              ) : visibleProducts.length ? (
                <div className="marketplace-grid">
                  {visibleProducts.map((product) =>
                    renderProductCard(product, openShop, "Visit the seller's shop"),
                  )}
                </div>
              ) : products.length === 0 ? (
                <div className="marketplace-empty-state" role="status">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    storefront
                  </span>
                  <h3>No products yet</h3>
                  <p>Sellers are getting their shops ready. Check back soon.</p>
                  <button
                    className="marketplace-empty-action"
                    type="button"
                    onClick={handleSellerShortcut}
                  >
                    {seller ? "Manage My Shop" : "Start selling"}
                  </button>
                </div>
              ) : (
                <p className="marketplace-empty" role="status">
                  {showFavorites
                    ? "No favorites yet. Tap the heart on a product to save it here."
                    : "No products found. Try another search or category."}
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