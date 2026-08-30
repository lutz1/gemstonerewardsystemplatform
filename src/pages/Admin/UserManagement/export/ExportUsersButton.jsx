import "./ExportUsersButton.css";

function formatJoinDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Button that exports the given users to a CSV file.
 *
 * Props:
 * - users: array — the (already filtered/searched) users to export
 * - filename: string — optional, defaults to "users.csv"
 */
export default function ExportUsersButton({ users, filename = "users.csv" }) {
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
    const rows = (users || []).map((user) => [
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
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-users-export-action">
      <button
        type="button"
        className="admin-users-secondary-button"
        onClick={exportUsers}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          download
        </span>
        Export
      </button>
    </div>
  );
}
