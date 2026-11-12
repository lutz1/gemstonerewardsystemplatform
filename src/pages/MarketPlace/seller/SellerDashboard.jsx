import { useState } from "react";
import logo from "../../../assets/app_logo_final.png";
import { SellerProvider, useSeller } from "./SellerContext";
import "./SellerDashboard.css";
import { initialPromotions, initialSettings } from "./sellerData";
import SellerInventory from "./SellerInventory";
import SellerOrders from "./SellerOrders";
import SellerPayouts from "./SellerPayouts";
import SellerPromotions from "./SellerPromotions";
import SellerSettings from "./SellerSettings";

// One list drives the desktop sidebar and the mobile bottom bar.
const sellerTabs = [
  { key: "dashboard", label: "Dashboard", icon: "space_dashboard" },
  { key: "inventory", label: "Inventory", icon: "inventory_2" },
  { key: "orders", label: "Orders", icon: "shopping_bag" },
  { key: "payouts", label: "Payouts", icon: "attach_money" },
  { key: "promotions", label: "Promotions", icon: "campaign" },
  { key: "settings", label: "Settings", icon: "settings" },
];

// The phone bottom bar has room for five; Promotions stays reachable from Quick actions.
const bottomTabKeys = ["dashboard", "inventory", "orders", "payouts", "settings"];

const stats = [
  { label: "Today sales", value: "₱28,420", change: "+12.4%", tone: "positive" },
  { label: "Orders", value: "184", change: "+8.1%", tone: "positive" },
  { label: "Visitors", value: "5,482", change: "+21.7%", tone: "positive" },
  { label: "Pending payouts", value: "₱96,540", change: "2 due", tone: "neutral" },
];

const quickActions = [
  { label: "Add product", icon: "add_circle", tab: "inventory", add: true },
  { label: "Inventory", icon: "inventory_2", tab: "inventory" },
  { label: "Orders", icon: "receipt_long", tab: "orders" },
  { label: "Promotions", icon: "campaign", tab: "promotions" },
];

const orderRows = [
  { id: "#ORD-2041", customer: "Mia Reyes", item: "Emerald Cut", total: "₱6,200", status: "Packed" },
  { id: "#ORD-2042", customer: "Theo Cruz", item: "Sapphire Ring", total: "₱9,140", status: "Shipped" },
  { id: "#ORD-2043", customer: "Ava Santos", item: "Diamond Pair", total: "₱12,680", status: "Processing" },
  { id: "#ORD-2044", customer: "Liam Garcia", item: "Pearl Pendant", total: "₱4,330", status: "Review" },
];

const topProducts = [
  { name: "Emerald Cut", stock: "18 left", revenue: "₱38,900", color: "emerald" },
  { name: "Sapphire Ring", stock: "11 left", revenue: "₱29,470", color: "sapphire" },
  { name: "Diamond Pair", stock: "7 left", revenue: "₱42,100", color: "diamond" },
];

const activityFeed = [
  "New order received from Mia Reyes",
  "3 items are running low in inventory",
  "Your store is trending with 14% more visits",
  "Payment for order #ORD-2037 has been released",
];

function SellerDashboardContent() {
  const { counts } = useSeller();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [openAddProduct, setOpenAddProduct] = useState(false);
  // Held here (not inside the pages) so edits survive switching tabs.
  const [promotions, setPromotions] = useState(initialPromotions);
  const [settings, setSettings] = useState(initialSettings);

  const badges = { inventory: counts.lowStock, orders: counts.newOrders };

  const sellerName = settings.account.displayName;
  const firstName = sellerName.trim().split(/\s+/)[0];
  const initials = sellerName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const goTo = (key, { add = false } = {}) => {
    setOpenAddProduct(add);
    setActiveTab(key);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="seller-dashboard">
      <header className="seller-dashboard-header">
        <div className="seller-dashboard-brand">
          <img src={logo} alt="Gemstone Marketplace" />
          <div>
            <span className="seller-dashboard-brand-label">Seller Center</span>
            <strong>{settings.store.name}</strong>
          </div>
        </div>

        <div className="seller-dashboard-header-actions">
          <button type="button" className="seller-dashboard-header-button" aria-label="Search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
          </button>
          <button type="button" className="seller-dashboard-header-button" aria-label="Notifications">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          </button>
          <button type="button" className="seller-dashboard-profile" onClick={() => goTo("settings")}>
            <span className="seller-dashboard-avatar">{initials}</span>
            <span className="seller-dashboard-profile-copy">
              <strong>{sellerName}</strong>
              <small>Premium seller</small>
            </span>
          </button>
        </div>
      </header>

      <main className="seller-dashboard-main">
        <aside className="seller-dashboard-sidebar">
          <nav className="seller-dashboard-nav" aria-label="Seller navigation">
            {sellerTabs.map((tab) => (
              <button
                type="button"
                key={tab.key}
                className={`seller-dashboard-nav-item${activeTab === tab.key ? " is-active" : ""}`}
                aria-current={activeTab === tab.key ? "page" : undefined}
                onClick={() => goTo(tab.key)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{tab.icon}</span>
                {tab.label}
                {badges[tab.key] > 0 && (
                  <em className="sl-nav-badge is-inline" aria-label={`${badges[tab.key]} need attention`}>
                    {badges[tab.key]}
                  </em>
                )}
              </button>
            ))}
          </nav>

          <div className="seller-dashboard-shop-card">
            <p>Shop health</p>
            <div className="seller-dashboard-score-ring">
              <span>89%</span>
            </div>
            <small>Strong storefront performance</small>
          </div>
        </aside>

        <section className="seller-dashboard-content">
          {activeTab === "inventory" && <SellerInventory autoOpenAdd={openAddProduct} />}
          {activeTab === "orders" && <SellerOrders onManageInventory={() => goTo("inventory")} />}

          {activeTab === "payouts" && <SellerPayouts />}

          {activeTab === "promotions" && (
            <SellerPromotions promotions={promotions} setPromotions={setPromotions} />
          )}

          {activeTab === "settings" && <SellerSettings settings={settings} onSave={setSettings} />}

          {activeTab === "dashboard" && (
            <>
              <div className="seller-dashboard-topbar">
                <div>
                  <p className="seller-dashboard-kicker">Overview</p>
                  <h1>Welcome back, {firstName}</h1>
                </div>
                <button type="button" className="seller-dashboard-primary-action" onClick={() => goTo("inventory", { add: true })}>
                  Publish listing
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </button>
              </div>

              <div className="seller-dashboard-stats">
                {stats.map((stat) => (
                  <article className="seller-dashboard-stat-card" key={stat.label}>
                    <p>{stat.label}</p>
                    <h2>{stat.value}</h2>
                    <span className={stat.tone === "positive" ? "positive" : "neutral"}>{stat.change}</span>
                  </article>
                ))}
              </div>

              <div className="seller-dashboard-panel-grid">
                <section className="seller-dashboard-panel seller-dashboard-panel-wide">
                  <div className="seller-dashboard-panel-header">
                    <div>
                      <p className="seller-dashboard-kicker">Performance</p>
                      <h3>Sales overview</h3>
                    </div>
                    <button type="button" className="seller-dashboard-link-button">View report</button>
                  </div>

                  <div className="seller-dashboard-chart" aria-label="Sales chart">
                    {[48, 66, 54, 82, 76, 90, 112, 94, 128, 110, 142, 138].map((value, index) => (
                      <span
                        key={index}
                        className="seller-dashboard-bar"
                        style={{ height: `${value}%` }}
                        aria-label={`Week ${index + 1} value ${value}`}
                      />
                    ))}
                  </div>

                  <div className="seller-dashboard-chart-labels">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                      <span key={month}>{month}</span>
                    ))}
                  </div>
                </section>

                <section className="seller-dashboard-panel">
                  <div className="seller-dashboard-panel-header">
                    <div>
                      <p className="seller-dashboard-kicker">Quick actions</p>
                      <h3>Manage your shop</h3>
                    </div>
                  </div>

                  <div className="seller-dashboard-actions">
                    {quickActions.map((action) => (
                      <button
                        type="button"
                        className="seller-dashboard-action-item"
                        key={action.label}
                        onClick={() => goTo(action.tab, { add: action.add })}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">{action.icon}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="seller-dashboard-lower-grid">
                <section className="seller-dashboard-panel">
                  <div className="seller-dashboard-panel-header">
                    <div>
                      <p className="seller-dashboard-kicker">Recent orders</p>
                      <h3>Latest transactions</h3>
                    </div>
                    <button type="button" className="seller-dashboard-link-button" onClick={() => goTo("orders")}>
                      See all
                    </button>
                  </div>

                  <div className="seller-dashboard-table">
                    <div className="seller-dashboard-table-head">
                      <span>Order</span>
                      <span>Customer</span>
                      <span>Item</span>
                      <span>Total</span>
                      <span>Status</span>
                    </div>

                    {orderRows.map((row) => (
                      <div className="seller-dashboard-table-row" key={row.id}>
                        <span>{row.id}</span>
                        <span>{row.customer}</span>
                        <span>{row.item}</span>
                        <span>{row.total}</span>
                        <span>
                          <em className={`seller-dashboard-status seller-dashboard-status-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {row.status}
                          </em>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="seller-dashboard-panel">
                  <div className="seller-dashboard-panel-header">
                    <div>
                      <p className="seller-dashboard-kicker">Inventory</p>
                      <h3>Top products</h3>
                    </div>
                  </div>

                  <div className="seller-dashboard-product-list">
                    {topProducts.map((product) => (
                      <article className="seller-dashboard-product-item" key={product.name}>
                        <div className={`seller-dashboard-product-icon seller-dashboard-product-icon-${product.color}`} aria-hidden="true" />
                        <div className="seller-dashboard-product-copy">
                          <strong>{product.name}</strong>
                          <span>{product.stock}</span>
                        </div>
                        <b>{product.revenue}</b>
                      </article>
                    ))}
                  </div>

                  <div className="seller-dashboard-activity">
                    <p className="seller-dashboard-kicker">Activity</p>
                    <ul>
                      {activityFeed.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </main>

      <nav className="seller-dashboard-bottom-nav" aria-label="Seller dashboard navigation">
        {sellerTabs
          .filter((tab) => bottomTabKeys.includes(tab.key))
          .map((tab) => (
            <button
              className={`seller-dashboard-bottom-nav-item${activeTab === tab.key ? " is-active" : ""}`}
              key={tab.key}
              type="button"
              aria-current={activeTab === tab.key ? "page" : undefined}
              onClick={() => goTo(tab.key)}
            >
              <span className="sl-nav-icon">
                <span className="material-symbols-outlined" aria-hidden="true">{tab.icon}</span>
                {badges[tab.key] > 0 && <em className="sl-nav-badge">{badges[tab.key]}</em>}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
      </nav>
    </div>
  );
}

// The provider lives here, so MarketPlaceDashboard.jsx needs no changes.
export default function SellerDashboard() {
  return (
    <SellerProvider>
      <SellerDashboardContent />
    </SellerProvider>
  );
}