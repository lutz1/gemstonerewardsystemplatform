import { useNavigate } from "react-router-dom";
import TopBar from "../../components/TopBar/TopBar";
import "./AdminPage.css";

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-root">
      <TopBar userName="Admin" userRole="Administrator" />
      <main className="admin-main">
        <section className="admin-header">
          <p className="admin-eyebrow">Administration</p>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Manage the Gemstone rewards platform.</p>
        </section>

        <section className="admin-grid" aria-label="Administration actions">
          <button type="button" className="admin-card" onClick={() => navigate("/purchase-codes")}>
            <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
            <span>
              <strong>Purchase Codes</strong>
              <small>Review and manage purchase codes.</small>
            </span>
          </button>
          <button type="button" className="admin-card" onClick={() => navigate("/profile")}>
            <span className="material-symbols-outlined" aria-hidden="true">group</span>
            <span>
              <strong>Members</strong>
              <small>View member information and activity.</small>
            </span>
          </button>
        </section>
      </main>
    </div>
  );
}
