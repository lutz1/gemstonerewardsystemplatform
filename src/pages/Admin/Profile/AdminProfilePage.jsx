import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import "./AdminProfilePage.css";

export default function AdminProfilePage() {
  return (
    <div className="admin-profile-root">
      <TopBar userName="Admin" userRole="Administrator" />
      <main className="admin-profile-main">
        <p className="admin-profile-eyebrow">Administration</p>
        <h1 className="admin-profile-title">Profile</h1>
      </main>
      <BottomNav activeItem="profile" variant="admin" />
    </div>
  );
}
