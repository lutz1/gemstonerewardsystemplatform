import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import "./AdminPage.css";

export default function AdminPage() {
  return (
    <div className="admin-root">
      <TopBar userName="Admin" userRole="Administrator" />
      <main className="admin-main">
        <section className="admin-header">
          <p className="admin-eyebrow">Administration</p>
          <h1 className="admin-title">Dashboard</h1>
        </section>
      </main>
      <BottomNav activeItem="dashboard" variant="admin" />
    </div>
  );
}
