import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./ExchangePage.css";

const options = {
  "gems-to-wallet": {
    title: "Exchange Gems to Wallet",
    caption: "Convert your GEM points into wallet balance.",
    icon: "sync_alt",
  },
  withdraw: {
    title: "Withdraw",
    caption: "Send your wallet balance to GCash or a bank account.",
    icon: "arrow_upward",
  },
  deposit: {
    title: "Deposit",
    caption: "Top up your wallet via GCash or a bank transfer.",
    icon: "arrow_downward",
  },
};

function ExchangeForm({ mode }) {
  const option = options[mode];
  const [method, setMethod] = useState("gcash");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [details, setDetails] = useState("");
  const isGemsExchange = mode === "gems-to-wallet";
  const pesoValue = (Number(amount) || 0) * 1.4;

  return (
    <section className="exchange-card">
      <div className="exchange-card-heading">
        <span className="material-symbols-outlined exchange-heading-icon">
          {option.icon}
        </span>
        <div>
          <p className="exchange-eyebrow">Exchange</p>
          <h1>{option.title}</h1>
          <p>{option.caption}</p>
        </div>
      </div>
      {submitted && (
        <p className="exchange-success" role="status">
          Request submitted successfully. It will be reviewed by the platform
          team.
        </p>
      )}
      {!isGemsExchange && (
        <div className="exchange-methods">
          <button
            type="button"
            className={method === "gcash" ? "active" : ""}
            onClick={() => setMethod("gcash")}
          >
            <span className="material-symbols-outlined">phone_android</span>
            GCash
          </button>
          <button
            type="button"
            className={method === "bank" ? "active" : ""}
            onClick={() => setMethod("bank")}
          >
            <span className="material-symbols-outlined">account_balance</span>
            Bank Transfer
          </button>
        </div>
      )}
      {isGemsExchange ? (
        <label>
          Amount of GEMS
          <div className="exchange-input-wrap">
            <input
              type="number"
              min="0"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <span>GEMS</span>
          </div>
        </label>
      ) : (
        <label>
          {method === "gcash"
            ? mode === "deposit"
              ? "Sending From (GCash Number)"
              : "GCash Number"
            : mode === "deposit"
              ? "Sending From (Bank Name)"
              : "Bank Name"}
          <input
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={
              method === "gcash"
                ? "e.g. 0912 345 6789"
                : "e.g. BDO, BPI, Metrobank"
            }
          />
        </label>
      )}
      {!isGemsExchange && (
        <label>
          Amount
          <div className="exchange-input-wrap">
            <span>₱</span>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </label>
      )}
      {isGemsExchange && (
        <div className="exchange-result">
          <span>You&apos;ll receive</span>
          <strong>
            ₱
            {pesoValue.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
        </div>
      )}
      <button
        className="exchange-submit"
        type="button"
        disabled={!amount || Number(amount) <= 0}
        onClick={() => setSubmitted(true)}
      >
        {isGemsExchange
          ? "CONFIRM EXCHANGE"
          : mode === "deposit"
            ? "SUBMIT DEPOSIT"
            : "REQUEST WITHDRAWAL"}
      </button>
    </section>
  );
}

export default function ExchangePage() {
  const { mode } = useParams();
  const navigate = useNavigate();
  if (mode && options[mode])
    return (
      <div className="exchange-root">
        <header className="exchange-header">
          <button
            type="button"
            onClick={() => navigate("/exchange")}
            aria-label="Back to Exchange"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <strong>{options[mode].title}</strong>
          <span />
        </header>
        <main className="exchange-main">
          <ExchangeForm mode={mode} />
        </main>
      </div>
    );
  return (
    <div className="exchange-root">
      <header className="exchange-header">
        <Link to="/dashboard" aria-label="Close Exchange">
          <span className="material-symbols-outlined">close</span>
        </Link>
        <strong>Exchange</strong>
        <span />
      </header>
      <main className="exchange-main">
        <div className="exchange-options">
          {Object.entries(options).map(([key, option]) => (
            <Link className="exchange-option" to={`/exchange/${key}`} key={key}>
              <span className="exchange-option-icon material-symbols-outlined">
                {option.icon}
              </span>
              <span>
                <strong>{option.title}</strong>
                <small>{option.caption}</small>
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
