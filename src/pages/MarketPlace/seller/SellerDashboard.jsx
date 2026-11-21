import { useState } from "react";
import { SellerProvider, useSeller } from "./SellerContext";
import "./SellerDashboard.css";
import SellerTopbar from "./components/SellerTopbar";
import { initialSettings, orderSubtotal } from "./sellerData";
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

const quickActions = [
  { label: "Add product", icon: "add_circle", tab: "inventory", add: true },
  { label: "Inventory", icon: "inventory_2", tab: "inventory" },
  { label: "Orders", icon: "receipt_long", tab: "orders" },
  { label: "Promotions", icon: "campaign", tab: "promotions" },
];

function SellerDashboardContent() {
  const { counts, products, orders, payouts } = useSeller();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [openAddProduct, setOpenAddProduct] = useState(false);
  // Held here (not inside the pages) so edits survive switching tabs.
  const [promotions, setPromotions] = useState([]);
  const [settings, setSettings] = useState(initialSettings);

  const badges = { inventory: counts.lowStock, orders: counts.newOrders };

  const totalSales = orders
    .filter((order) => order.status === "completed")
    .reduce((sum, order) =>
      sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.price || 0) * Number(item.qty || 0), 0),
    0);
  const pendingPayouts = payouts
    .filter((payout) => payout.status === "processing")
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const stats = [
    { label: "Total sales", value: `₱${totalSales.toLocaleString("en-PH")}`, change: "Completed sales", tone: "positive" },
    { label: "Orders", value: String(orders.length), change: `${counts.newOrders} new`, tone: "positive" },
    { label: "Listings", value: String(products.length), change: `${counts.lowStock} low stock`, tone: "neutral" },
    { label: "Pending payouts", value: `₱${pendingPayouts.toLocaleString("en-PH")}`, change: "Processing", tone: "neutral" },
  ];
  const orderRows = [...orders]
    .sort((a, b) => new Date(b.placedAt || 0) - new Date(a.placedAt || 0))
    .slice(0, 4)
    .map((order) => ({
      id: order.id,
      customer: order.buyer || "Unknown buyer",
      item: order.items?.map((item) => item.name).filter(Boolean).join(", ") || "No items",
      total: `₱${Number(orderSubtotal(order)).toLocaleString("en-PH")}`,
      status: order.status || "New",
    }));
  const topProducts = [...products]
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
    .slice(0, 3)
    .map((product) => ({
      name: product.name,
      stock: `${product.stock || 0} left`,
      revenue: `₱${Number(product.price || 0).toLocaleString("en-PH")}`,
      color: "emerald",
    }));
  const monthlySales = Array.from({ length: 12 }, (_, month) =>
    orders
      .filter((order) => order.status === "completed"
        && new Date(order.placedAt || 0).getMonth() === month)
      .reduce((sum, order) => sum + orderSubtotal(order), 0)
  );
  const activityFeed = [
    counts.newOrders ? `${counts.newOrders} new ${counts.newOrders === 1 ? "order" : "orders"} received` : "",
    counts.lowStock ? `${counts.lowStock} ${counts.lowStock === 1 ? "listing needs" : "listings need"} restocking` : "",
    pendingPayouts ? `₱${pendingPayouts.toLocaleString("en-PH")} in processing payouts` : "",
  ].filter(Boolean);

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
      <SellerTopbar
        storeName={settings.store.name}
        sellerName={sellerName}
        initials={initials}
        onProfileClick={() => goTo("settings")}
      />

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
                    {monthlySales.map((value, index) => (
                      <span
                        key={index}
                        className="seller-dashboard-bar"
                        style={{ height: `${value ? Math.max(8, Math.min(100, (value / Math.max(...monthlySales, 1)) * 100)) : 2}%` }}
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

                    {orderRows.length ? orderRows.map((row) => (
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
                    )) : (
                      <div className="seller-dashboard-table-row">
                        <span>No orders yet</span>
                      </div>
                    )}
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
                    {topProducts.length ? topProducts.map((product) => (
                      <article className="seller-dashboard-product-item" key={product.name}>
                        <div className={`seller-dashboard-product-icon seller-dashboard-product-icon-${product.color}`} aria-hidden="true" />
                        <div className="seller-dashboard-product-copy">
                          <strong>{product.name}</strong>
                          <span>{product.stock}</span>
                        </div>
                        <b>{product.revenue}</b>
                      </article>
                    )) : (
                      <p>No listings yet</p>
                    )}
                  </div>

                  <div className="seller-dashboard-activity">
                    <p className="seller-dashboard-kicker">Activity</p>
                    {activityFeed.length ? (
                      <ul>
                        {activityFeed.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No recent activity</p>
                    )}
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