import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import { app } from "../../../firebase";
import AddUserModal from "./adduser/AddUserModal";
import ExportUsersButton from "./export/ExportUsersButton";
import PromoteToLeaderModal from "./promotetoleader/PromoteToLeaderModal";
import "./UserManagementPage.css";

function formatPeso(value) {
  const numericValue = Number(value ?? 0);
  return `₱${numericValue.toLocaleString("en-PH")}`;
}

function formatJoinDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function FilterDropdown({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="admin-users-filter">
      <button
        type="button"
        className="admin-users-filter-button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedOption.label}
        <span className="material-symbols-outlined" aria-hidden="true">
          expand_more
        </span>
      </button>
      {isOpen && (
        <div
          className="admin-users-filter-menu"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserManagementPage() {
  const [userList, setUserList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);

  // The table's scroll panel can scroll both horizontally (extra columns)
  // and vertically (extra rows). Without axis locking, a drag/swipe that's
  // even slightly diagonal moves both at once, which feels broken. So we
  // watch the first few pixels of movement, decide "this gesture is
  // horizontal" or "this gesture is vertical", and commit to only that
  // axis for the rest of the gesture.
  const tableScrollRef = useRef(null);
  const dragStateRef = useRef({
    pointerId: null,
    axis: null, // 'x' | 'y' | null (undecided)
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
  });

  const AXIS_LOCK_THRESHOLD = 6; // px of movement before we commit to an axis

  const handleTablePointerDown = (event) => {
    const panel = tableScrollRef.current;
    if (!panel) return;
    panel.setPointerCapture?.(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      axis: null,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: panel.scrollLeft,
    };
  };

  const handleTablePointerMove = (event) => {
    const panel = tableScrollRef.current;
    const drag = dragStateRef.current;
    if (!panel || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.axis) {
      if (
        Math.abs(deltaX) < AXIS_LOCK_THRESHOLD &&
        Math.abs(deltaY) < AXIS_LOCK_THRESHOLD
      ) {
        return; // not enough movement yet to know which way this is going
      }
      // Whichever direction has moved further wins the whole gesture.
      drag.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }

    if (drag.axis === "x") {
      // We own horizontal scrolling manually, so stop the browser from
      // also trying to scroll the page/panel vertically for this drag.
      event.preventDefault();
      panel.scrollLeft = drag.startScrollLeft - deltaX;
    }
    // If axis is "y", we do nothing here and let native vertical
    // scrolling (touch-action: pan-y) handle it — that keeps vertical
    // scrolling smooth and untouched by our horizontal logic.
  };

  const handleTablePointerEnd = (event) => {
    const panel = tableScrollRef.current;
    const drag = dragStateRef.current;
    if (panel && drag.pointerId === event.pointerId) {
      panel.releasePointerCapture?.(event.pointerId);
    }
    dragStateRef.current = {
      pointerId: null,
      axis: null,
      startX: 0,
      startY: 0,
      startScrollLeft: 0,
    };
  };

  const loadUsers = async () => {
    try {
      const getUsers = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "getUsers",
      );
      const result = await getUsers();
      const users = (result.data || []).map((user) => {
        const fullName = [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          id: user.id,
          ...user,
          name: user.name || fullName,
          email: user.email || "",
          role: user.role || "member",
          status: user.status || "active",
          totalSpent: Number(user.totalSpent ?? 0),
        };
      });

      setUserList(users);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUserList([]);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return userList.filter((user) => {
      const role = user.role || "member";
      if (role === "admin") return false; // admins are never listed here
      const matchesSearch = [
        user.name ?? "",
        user.email ?? "",
        user.id ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      const matchesRole = roleFilter === "all" || role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleFilter, searchTerm, statusFilter, userList]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const visibleUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  return (
    <div
      className={`admin-users-root${isSearchFocused ? " search-is-focused" : ""}`}
    >
      <TopBar
        userName="Admin"
        userRole="Administrator"
        profilePath="/admin/profile"
      />
      <main className="admin-users-main">
        <header className="admin-users-header">
          <div>
            <p className="admin-users-eyebrow">Administration</p>
            <h1 className="admin-users-title">User Management</h1>
            <p className="admin-users-subtitle">
              View and manage registered members.
            </p>
          </div>
        </header>

        <section className="admin-users-panel" aria-label="User management">
          <div className="admin-users-toolbar admin-users-controls">
            <label className="admin-users-search">
              <span className="material-symbols-outlined" aria-hidden="true">
                search
              </span>
              <span className="sr-only">Search users</span>
              <input
                type="search"
                placeholder="Search by name, email, or ID"
                value={searchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>
            <div className="admin-users-filter-group" aria-label="User filters">
              <FilterDropdown
                label="Filter by status"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ]}
              />
              <FilterDropdown
                label="Filter by role"
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All roles" },
                  { value: "member", label: "Member" },
                  { value: "leader", label: "Leader" },
                ]}
              />
            </div>
            <div className="admin-users-toolbar-actions">
              <button
                type="button"
                className="admin-users-primary-button"
                onClick={() => setIsAddUserOpen(true)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  person_add
                </span>
                Add User
              </button>
              <button
                type="button"
                className="admin-users-primary-button"
                onClick={() => setIsPromotionOpen(true)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  supervisor_account
                </span>
                Promote to Leader
              </button>
              <ExportUsersButton users={filteredUsers} />
            </div>
          </div>

          <div className="admin-users-table-section">
            <div
              className="admin-users-table-scroll-panel"
              ref={tableScrollRef}
              onPointerDown={handleTablePointerDown}
              onPointerMove={handleTablePointerMove}
              onPointerUp={handleTablePointerEnd}
              onPointerCancel={handleTablePointerEnd}
            >
              <div className="admin-users-table-wrap">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th scope="col">Avatar</th>
                      <th scope="col">Name</th>
                      <th scope="col">Member Since</th>
                      <th scope="col">Phone Number</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin-user-identity">
                            <span className="admin-user-avatar">
                              {(user.name || user.email || "U")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "U"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-user-name-block">
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </div>
                        </td>
                        <td>{formatJoinDate(user.joinDate)}</td>
                        <td>{user.phone || "—"}</td>
                        <td>
                          <span className="admin-user-role">
                            {user.role || "member"}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-user-status ${user.status}`}>
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleUsers.length === 0 && (
                <p className="admin-users-empty">No users match your search.</p>
              )}
            </div>
          </div>
          <div className="admin-users-pagination">
            <span>
              Page {safeCurrentPage} of {pageCount}
            </span>
            <div>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
                aria-label="Previous page"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === pageCount}
                onClick={() => setCurrentPage((page) => page + 1)}
                aria-label="Next page"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
      <BottomNav activeItem="users" variant="admin" />

      <PromoteToLeaderModal
        isOpen={isPromotionOpen}
        onClose={() => setIsPromotionOpen(false)}
        userList={userList}
        onPromoted={(userId) =>
          setUserList((currentUsers) =>
            currentUsers.map((user) =>
              user.id === userId ? { ...user, role: "leader" } : user,
            ),
          )
        }
      />

      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        existingUsers={userList}
        onUserCreated={async () => {
          setCurrentPage(1);
          await loadUsers();
        }}
      />
    </div>
  );
}
