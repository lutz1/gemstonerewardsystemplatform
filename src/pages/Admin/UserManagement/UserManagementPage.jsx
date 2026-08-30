import { getFunctions, httpsCallable } from "firebase/functions";
import { useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../../components/TopBar/TopBar";
import { app } from "../../../firebase";
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
  const emptyNewUser = {
    lastName: "",
    firstName: "",
    middleName: "",
    birthdate: "",
    civilStatus: "single",
    address: "",
    phone: "",
    email: "",
    role: "member",
    status: "active",
  };
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return userList.filter((user) => {
      const matchesSearch = [user.name ?? "", user.email ?? "", user.id ?? ""].some((value) =>
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

  const closeAddUserModal = () => {
    setIsAddUserOpen(false);
    setNewUser(emptyNewUser);
    setFormErrors({});
    setSubmitError("");
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    const lastName = newUser.lastName.trim();
    const firstName = newUser.firstName.trim();
    const middleName = newUser.middleName.trim();
    const birthdate = newUser.birthdate.trim();
    const address = newUser.address.trim();
    const phone = newUser.phone.trim();
    const email = newUser.email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9+\-()\s]{7,15}$/;

    const errors = {};
    if (!lastName) errors.lastName = "Last name is required.";
    if (!firstName) errors.firstName = "First name is required.";
    if (!middleName) errors.middleName = "Middle name is required.";
    if (!birthdate) errors.birthdate = "Birthdate is required.";
    if (!address) errors.address = "Address is required.";
    if (!phone) {
      errors.phone = "Phone is required.";
    } else if (!phonePattern.test(phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (!email) {
      errors.email = "Email is required.";
    } else if (!emailPattern.test(email)) {
      errors.email = "Enter a valid email address.";
    } else if (
      userList.some((user) => user.email.toLowerCase() === email.toLowerCase())
    ) {
      errors.email = "A user with this email already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);
    try {
      const createUser = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "createUser",
      );
      const result = await createUser({
        lastName,
        firstName,
        middleName,
        birthdate,
        civilStatus: newUser.civilStatus,
        address,
        phone,
        email,
        role: newUser.role,
        status: newUser.status,
      });
      const created = result.data;

      setUserList((currentUsers) => [
        ...currentUsers,
        {
          id: created.id,
          name: created.name,
          lastName,
          firstName,
          middleName,
          birthdate,
          civilStatus: newUser.civilStatus,
          address,
          phone,
          email,
          walletAddress: created.walletAddress,
          joinDate: created.joinDate,
          status: newUser.status,
          role: newUser.role,
          totalSpent: 0,
        },
      ]);
      closeAddUserModal();
      setCurrentPage(1);
    } catch (error) {
      setSubmitError(
        error?.message || "Failed to create user. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
      formatJoinDate(user.joinDate),
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
                      <td>{formatJoinDate(user.joinDate)}</td>
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
          onMouseDown={closeAddUserModal}
        >
          <form
            className="admin-users-modal"
            onSubmit={handleAddUser}
            noValidate
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-users-modal-header">
              <h2>Add User</h2>
              <button
                type="button"
                onClick={closeAddUserModal}
                aria-label="Close add user form"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <div className="admin-users-modal-grid">
              <label className="admin-users-field-span-2">
                Last Name, First Name, Middle Name
                <div className="admin-users-name-fields">
                  <input
                    required
                    placeholder="Last name"
                    aria-label="Last name"
                    value={newUser.lastName}
                    aria-invalid={Boolean(formErrors.lastName)}
                    onChange={(event) =>
                      setNewUser({ ...newUser, lastName: event.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="First name"
                    aria-label="First name"
                    value={newUser.firstName}
                    aria-invalid={Boolean(formErrors.firstName)}
                    onChange={(event) =>
                      setNewUser({ ...newUser, firstName: event.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="Middle name"
                    aria-label="Middle name"
                    value={newUser.middleName}
                    aria-invalid={Boolean(formErrors.middleName)}
                    onChange={(event) =>
                      setNewUser({ ...newUser, middleName: event.target.value })
                    }
                  />
                </div>
                {(formErrors.lastName ||
                  formErrors.firstName ||
                  formErrors.middleName) && (
                  <span className="admin-users-field-error">
                    {formErrors.lastName ||
                      formErrors.firstName ||
                      formErrors.middleName}
                  </span>
                )}
              </label>
              <label>
                Birthdate
                <input
                  required
                  type="date"
                  value={newUser.birthdate}
                  aria-invalid={Boolean(formErrors.birthdate)}
                  onChange={(event) =>
                    setNewUser({ ...newUser, birthdate: event.target.value })
                  }
                />
                {formErrors.birthdate && (
                  <span className="admin-users-field-error">
                    {formErrors.birthdate}
                  </span>
                )}
              </label>
              <label>
                Civil Status
                <select
                  value={newUser.civilStatus}
                  onChange={(event) =>
                    setNewUser({ ...newUser, civilStatus: event.target.value })
                  }
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="separated">Separated</option>
                </select>
              </label>
              <label className="admin-users-field-span-2">
                Address
                <input
                  required
                  value={newUser.address}
                  aria-invalid={Boolean(formErrors.address)}
                  onChange={(event) =>
                    setNewUser({ ...newUser, address: event.target.value })
                  }
                />
                {formErrors.address && (
                  <span className="admin-users-field-error">
                    {formErrors.address}
                  </span>
                )}
              </label>
              <label>
                Phone
                <input
                  required
                  type="tel"
                  value={newUser.phone}
                  aria-invalid={Boolean(formErrors.phone)}
                  onChange={(event) =>
                    setNewUser({ ...newUser, phone: event.target.value })
                  }
                />
                {formErrors.phone && (
                  <span className="admin-users-field-error">
                    {formErrors.phone}
                  </span>
                )}
              </label>
              <label>
                Email Address
                <input
                  required
                  type="email"
                  value={newUser.email}
                  aria-invalid={Boolean(formErrors.email)}
                  onChange={(event) =>
                    setNewUser({ ...newUser, email: event.target.value })
                  }
                />
                {formErrors.email && (
                  <span className="admin-users-field-error">
                    {formErrors.email}
                  </span>
                )}
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
              <label>
                Status
                <select
                  value={newUser.status}
                  onChange={(event) =>
                    setNewUser({ ...newUser, status: event.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>
            {submitError && (
              <p className="admin-users-form-error" role="alert">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              className="admin-users-primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
