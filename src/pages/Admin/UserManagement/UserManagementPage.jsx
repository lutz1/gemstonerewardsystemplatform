import { useMemo, useState } from "react";
import { formatPeso, users } from "../../../../utils/AdminMockData";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import "./UserManagementPage.css";

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
  const [userList, setUserList] = useState(users);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "member",
  });

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return userList.filter((user) => {
      const matchesSearch = [user.name, user.email, user.id].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || (user.role || "member") === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleFilter, searchTerm, statusFilter, userList]);

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const visibleUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  const handleAddUser = (event) => {
    event.preventDefault();
    const name = newUser.name.trim();
    const email = newUser.email.trim();
    if (!name || !email) return;

    setUserList((currentUsers) => [
      ...currentUsers,
      {
        id: `U-${String(currentUsers.length + 1).padStart(3, "0")}`,
        name,
        email,
        joinDate: "Aug 2026",
        status: "active",
        role: newUser.role,
        totalSpent: 0,
      },
    ]);
    setNewUser({ name: "", email: "", role: "member" });
    setIsAddUserOpen(false);
    setCurrentPage(1);
  };

  const exportUsers = () => {
    const headers = [
      "ID",
      "Name",
      "Email",
      "Role",
      "Member since",
      "Status",
      "Total spent",
    ];
    const rows = filteredUsers.map((user) => [
      user.id,
      user.name,
      user.email,
      user.role || "member",
      user.joinDate,
      user.status,
      user.totalSpent,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`admin-users-root${isSearchFocused ? " search-is-focused" : ""}`}
    >
      <TopBar userName="Admin" userRole="Administrator" />
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
                  { value: "admin", label: "Admin" },
                ]}
              />
            </div>
            <div className="admin-users-toolbar-actions">
              <div className="admin-users-export-action">
                <button
                  type="button"
                  className="admin-users-secondary-button"
                  onClick={exportUsers}
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    download
                  </span>
                  Export
                </button>
              </div>
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
            </div>
          </div>

          <div className="admin-users-table-section">
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Member since</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-identity">
                          <span className="admin-user-avatar">
                            {user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                          <span>
                            <strong>{user.name}</strong>
                            <small>
                              {user.email} · {user.id}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>{user.joinDate}</td>
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
                      <td>{formatPeso(user.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      {isAddUserOpen && (
        <div
          className="admin-users-modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsAddUserOpen(false)}
        >
          <form
            className="admin-users-modal"
            onSubmit={handleAddUser}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-users-modal-header">
              <h2>Add User</h2>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                aria-label="Close add user form"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <label>
              Name
              <input
                required
                value={newUser.name}
                onChange={(event) =>
                  setNewUser({ ...newUser, name: event.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={newUser.email}
                onChange={(event) =>
                  setNewUser({ ...newUser, email: event.target.value })
                }
              />
            </label>
            <label>
              Role
              <select
                value={newUser.role}
                onChange={(event) =>
                  setNewUser({ ...newUser, role: event.target.value })
                }
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button type="submit" className="admin-users-primary-button">
              Create User
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
