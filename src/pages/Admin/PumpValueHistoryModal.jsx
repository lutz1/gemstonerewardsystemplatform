import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { MdClose, MdHistory } from "react-icons/md";
import { app } from "../../firebase";
import "./PumpValueHistoryModal.css";

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
}

export default function PumpValueHistoryModal({ onClose }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const getGemValuePumpHistory = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getGemValuePumpHistory",
    );

    getGemValuePumpHistory()
      .then(({ data }) => {
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        console.error("Failed to load GEM Pond pump history:", loadError);
        if (!cancelled) {
          setError(loadError.message || "Unable to load GEM Pond history.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="pump-history-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pump-history-title"
      onClick={onClose}
    >
      <section
        className="pump-history-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pump-history-header">
          <div>
            <p className="pump-history-eyebrow">GEM Pond</p>
            <h2 id="pump-history-title">
              <MdHistory /> Pump history
            </h2>
          </div>
          <button
            className="pump-history-close"
            type="button"
            onClick={onClose}
            aria-label="Close pump history"
          >
            <MdClose />
          </button>
        </header>

        <div className="pump-history-content" aria-live="polite">
          {isLoading && (
            <p className="pump-history-message">Loading pump records...</p>
          )}
          {!isLoading && error && (
            <p className="pump-history-message pump-history-error" role="alert">
              {error}
            </p>
          )}
          {!isLoading && !error && records.length === 0 && (
            <p className="pump-history-message">
              No GEM Pond pump records yet.
            </p>
          )}
          {!isLoading && !error && records.length > 0 && (
            <ol className="pump-history-list">
              {records.map((record) => (
                <li className="pump-history-record" key={record.id}>
                  <span className="pump-history-record-icon" aria-hidden="true">
                    <MdHistory />
                  </span>
                  <span className="pump-history-record-details">
                    <strong>
                      {formatAmount(Number(record.amount), record.currency || "PHP")}
                    </strong>
                    <time dateTime={record.createdAt || undefined}>
                      {formatDate(record.createdAt)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {!isLoading && !error && records.length > 0 && (
          <footer className="pump-history-footer">
            {records.length} {records.length === 1 ? "pump record" : "pump records"}
          </footer>
        )}
      </section>
    </div>
  );
}
