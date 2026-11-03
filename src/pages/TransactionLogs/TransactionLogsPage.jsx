import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { MdReceiptLong } from "react-icons/md";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import "./TransactionLogsPage.css";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function TransactionLogsPage() {
  const { username } = useAuth();
  const [search, setSearch] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 8;

  useEffect(() => {
    const getUserTransactionLogs = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserTransactionLogs",
    );
    getUserTransactionLogs()
      .then(({ data }) => setTransactions(Array.isArray(data?.transactions) ? data.transactions : []))
      .catch(() => setError("Unable to load your transaction records."))
      .finally(() => setIsLoading(false));
  }, []);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredTransactions = transactions.filter((transaction) => {
    const isDeposit = transaction.type === "wallet_deposit"
      || transaction.type === "wallet_deposit_refund";
    const matchesSearch = [transaction.label, transaction.detail, transaction.status, transaction.amount]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
    const matchesFilter = transactionFilter === "all"
      || (transactionFilter === "deposits" && isDeposit)
      || (transactionFilter === "purchases" && !isDeposit && !transaction.positive)
      || (transactionFilter === "rewards" && !isDeposit && transaction.positive);
    return matchesSearch && matchesFilter;
  });
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const visibleTransactions = filteredTransactions.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );

  return (
    <div className="transaction-logs-root">
      <TopBar userName={username || "Member"} userRole="Member" />
      <main className="transaction-logs-main">
        <header className="transaction-logs-header">
          <div>
            <p className="transaction-logs-eyebrow">Account activity</p>
            <h1>Transaction Logs</h1>
            <p>Review your purchases, deposits, and rewards.</p>
          </div>
          <MdReceiptLong aria-hidden="true" />
        </header>

        <section className="transaction-logs-panel">
          <div className="transaction-logs-toolbar">
            <div>
              <h2>Transaction Records</h2>
              <p>{filteredTransactions.length} record{filteredTransactions.length === 1 ? "" : "s"}</p>
            </div>
            <div className="transaction-logs-controls">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search transactions"
                aria-label="Search transactions"
              />
              <select
                value={transactionFilter}
                onChange={(event) => {
                  setTransactionFilter(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter transactions"
              >
                <option value="all">All records</option>
                <option value="purchases">Purchases</option>
                <option value="deposits">Deposits</option>
                <option value="rewards">Cashback</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="transaction-logs-empty">
              <p>Loading transaction records...</p>
            </div>
          ) : error ? (
            <div className="transaction-logs-empty" role="alert">
              <h2>Transaction records unavailable</h2>
              <p>{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="transaction-logs-empty">
              <MdReceiptLong aria-hidden="true" />
              <h2>{transactions.length ? "No matching records" : "No transaction records yet"}</h2>
              <p>
                {transactions.length
                  ? "Try a different search term."
                  : "Completed purchases and rewards will appear here."}
              </p>
            </div>
          ) : (
            <>
              <div className="transaction-logs-table-wrap">
                <table className="transaction-logs-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <strong>{transaction.label || "Transaction"}</strong>
                          <span>{transaction.detail || "Account activity"}</span>
                        </td>
                        <td>{formatDate(transaction.createdAt)}</td>
                        <td className={transaction.positive ? "is-positive" : ""}>
                          {transaction.amount || "—"}
                          {transaction.amountSub && <span>{transaction.amountSub}</span>}
                        </td>
                        <td><b>{transaction.status || "Completed"}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="transaction-logs-mobile-list">
                {visibleTransactions.map((transaction) => (
                  <article key={transaction.id}>
                    <div>
                      <strong>{transaction.label || "Transaction"}</strong>
                      <span>{transaction.detail || "Account activity"}</span>
                    </div>
                    <strong className={transaction.positive ? "is-positive" : ""}>
                      {transaction.amount || "—"}
                    </strong>
                    <small>{formatDate(transaction.createdAt)} · {transaction.status || "Completed"}</small>
                  </article>
                ))}
              </div>
              <div className="transaction-logs-pagination">
                <span>Page {visiblePage} of {pageCount}</span>
                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={visiblePage === 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                    disabled={visiblePage === pageCount}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      <BottomNav activeItem="transaction-logs" />
    </div>
  );
}