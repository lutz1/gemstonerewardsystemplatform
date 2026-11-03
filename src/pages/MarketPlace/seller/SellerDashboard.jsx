import { useState } from "react";
import logo from "../../../assets/app_logo_final.png";
import "./SellerDashboard.css";

const sellerNavigation = [
  { label: "Dashboard", icon: "space_dashboard" },
  { label: "Product Management", icon: "inventory_2" },
  { label: "Finances", icon: "account_balance_wallet" },
  { label: "Reports", icon: "bar_chart" },
  { label: "Account", icon: "person" },
];

const stats = [
  { label: "Today sales", value: "₱28,420", change: "+12.4%", tone: "positive" },
  { label: "Orders", value: "184", change: "+8.1%", tone: "positive" },
  { label: "Visitors", value: "5,482", change: "+21.7%", tone: "positive" },
  { label: "Pending payouts", value: "₱96,540", change: "2 due", tone: "neutral" },
];

const quickActions = [
  { label: "Add product", icon: "add_circle" },
  { label: "Inventory", icon: "inventory_2" },
  { label: "Orders", icon: "receipt_long" },
  { label: "Promotions", icon: "campaign" },
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

export default function SellerDashboard() {
  const [activeNavigation, setActiveNavigation] = useState("Dashboard");

  return (
    <div className="seller-dashboard">
      <header className="seller-dashboard-header">
        <div className="seller-dashboard-brand">
          <img src={logo} alt="Gemstone Marketplace" />
          <div>
            <span className="seller-dashboard-brand-label">Seller Center</span>
            <strong>Gemstone Market</strong>
          </div>
        </div>

        <div className="seller-dashboard-header-actions">
          <button type="button" className="seller-dashboard-header-button" aria-label="Search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
          </button>
          <button type="button" className="seller-dashboard-header-button" aria-label="Notifications">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          </button>
          <button type="button" className="seller-dashboard-profile">
            <span className="seller-dashboard-avatar">AR</span>
            <span className="seller-dashboard-profile-copy">
              <strong>Aria Reyes</strong>
              <small>Premium seller</small>
            </span>
          </button>
        </div>
      </header>

      <main className="seller-dashboard-main">
        <aside className="seller-dashboard-sidebar">
          <nav className="seller-dashboard-nav" aria-label="Seller navigation">
            <button type="button" className="seller-dashboard-nav-item is-active">
              <span className="material-symbols-outlined" aria-hidden="true">space_dashboard</span>
              Dashboard
            </button>
            <button type="button" className="seller-dashboard-nav-item">
              <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
              Inventory
            </button>
            <button type="button" className="seller-dashboard-nav-item">
              <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
              Orders
            </button>
            <button type="button" className="seller-dashboard-nav-item">
              <span className="material-symbols-outlined" aria-hidden="true">attach_money</span>
              Payouts
            </button>
            <button type="button" className="seller-dashboard-nav-item">
              <span className="material-symbols-outlined" aria-hidden="true">campaign</span>
              Promotions
            </button>
            <button type="button" className="seller-dashboard-nav-item">
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
              Settings
            </button>
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
          <div className="seller-dashboard-topbar">
            <div>
              <p className="seller-dashboard-kicker">Overview</p>
              <h1>Welcome back, Aria</h1>
            </div>
            <button type="button" className="seller-dashboard-primary-action">
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
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
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
                  <button type="button" className="seller-dashboard-action-item" key={action.label}>
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
                <button type="button" className="seller-dashboard-link-button">See all</button>
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
        </section>
      </main>

      <nav className="seller-dashboard-bottom-nav" aria-label="Seller dashboard navigation">
        {sellerNavigation.map((item) => (
          <button
            className={`seller-dashboard-bottom-nav-item${activeNavigation === item.label ? " is-active" : ""}`}
            key={item.label}
            type="button"
            aria-current={activeNavigation === item.label ? "page" : undefined}
            onClick={() => setActiveNavigation(item.label)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
