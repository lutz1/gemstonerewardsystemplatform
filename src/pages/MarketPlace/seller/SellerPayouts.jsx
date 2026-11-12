import { useMemo, useState } from "react";
import Drawer from "./components/Drawer";
import Icon from "./components/Icon";
import { useSeller } from "./SellerContext";
import { HOLD_DAYS, MIN_PAYOUT, fmtDate, payoutSummary, peso } from "./sellerData";
import "./SellerPayouts.css";

const PAYOUT_STATUS = {
  processing: ["Processing", "sl-badge--warn"],
  paid: ["Paid", "sl-badge--ok"],
  rejected: ["Rejected", "sl-badge--bad"],
};

export default function SellerPayouts() {
  const { orders, payouts, payoutMethods, requestPayout, notify } = useSeller();
  const [tab, setTab] = useState("earnings");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState(payoutMethods[0]?.id);
  const [error, setError] = useState("");

  const s = useMemo(() => payoutSummary(orders, payouts), [orders, payouts]);
  const canWithdraw = s.available >= MIN_PAYOUT;

  const openForm = () => {
    setAmount(String(s.available));
    setMethodId(payoutMethods[0]?.id);
    setError("");
    setOpen(true);
  };

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_PAYOUT) return setError(`The minimum withdrawal is ${peso(MIN_PAYOUT)}.`);
    if (value > s.available) return setError(`You can withdraw up to ${peso(s.available)}.`);
    const method = payoutMethods.find((m) => m.id === methodId);
    requestPayout({ amount: Math.round(value), method: method.label });
    notify("Withdrawal requested");
    setOpen(false);
    setTab("history");
  };

  const cards = [
    { label: "Available balance", value: s.available, note: canWithdraw ? "Ready to withdraw" : `Withdraw from ${peso(MIN_PAYOUT)}`, hero: true },
    { label: "On hold", value: s.onHold, note: `${s.heldCount} ${s.heldCount === 1 ? "order" : "orders"} · released ${HOLD_DAYS} days after delivery` },
    { label: "Incoming", value: s.incoming, note: `From ${s.incomingCount} ${s.incomingCount === 1 ? "order" : "orders"} in progress` },
    { label: "Paid out", value: s.paidOut, note: s.pending ? `${peso(s.pending)} processing` : "All requests settled" },
  ];

  return (
    <div className="sl-page">
      <div className="sl-page-head">
        <div>
          <p className="sl-kicker">Finances</p>
          <h1>Payouts</h1>
          <p>Earnings are released {HOLD_DAYS} days after delivery, after the platform fee.</p>
        </div>
        <button className="sl-btn sl-btn--primary" onClick={openForm} disabled={!canWithdraw}>
          <Icon name="account_balance_wallet" size={18} /> Withdraw
        </button>
      </div>

      <div className="pay-stats">
        {cards.map((c) => (
          <article key={c.label} className={`pay-stat${c.hero ? " is-hero" : ""}`}>
            <p>{c.label}</p>
            <h2>{peso(c.value)}</h2>
            <small>{c.note}</small>
          </article>
        ))}
      </div>

      <div className="sl-toolbar">
        <div className="sl-tabs" role="tablist">
          {[["earnings", "Earnings", s.earnings.length], ["history", "Withdrawals", payouts.length]].map(([key, label, n]) => (
            <button key={key} role="tab" aria-selected={tab === key} className={`sl-tab ${tab === key ? "is-active" : ""}`} onClick={() => setTab(key)}>
              {label} <span>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "earnings" ? (
        <div className="sl-card pay-table">
          <div className="pay-row pay-row--earn pay-row--head">
            <span>Order</span><span>Delivered</span><span>Sales</span><span>Fee</span><span>You earn</span><span>Status</span>
          </div>
          {s.earnings.map((e) => (
            <div className="pay-row pay-row--earn" key={e.order.id}>
              <div><strong>{e.order.id}</strong><small className="pay-sub">{e.order.buyer}</small></div>
              <div className="pay-cell" data-label="Delivered">{fmtDate(e.done)}</div>
              <div className="pay-cell" data-label="Sales">{peso(e.gross)}</div>
              <div className="pay-cell pay-fee" data-label="Fee">−{peso(e.fee)}</div>
              <div className="pay-cell pay-net" data-label="You earn">{peso(e.net)}</div>
              <div className="pay-cell" data-label="Status">
                {e.released ? <span className="sl-badge sl-badge--ok">Released</span> : <span className="sl-badge sl-badge--warn">Held until {fmtDate(e.releaseAt)}</span>}
              </div>
            </div>
          ))}
          {s.earnings.length === 0 && (
            <div className="sl-empty">
              <Icon name="payments" size={36} />
              <strong>No earnings yet</strong>
              <span>Earnings appear here once an order is delivered.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="sl-card pay-table">
          <div className="pay-row pay-row--hist pay-row--head">
            <span>Request</span><span>Requested</span><span>Sent to</span><span>Amount</span><span>Status</span>
          </div>
          {payouts.map((p) => {
            const [label, tone] = PAYOUT_STATUS[p.status];
            return (
              <div className="pay-row pay-row--hist" key={p.id}>
                <div><strong>{p.id}</strong></div>
                <div className="pay-cell" data-label="Requested">{fmtDate(p.requestedAt)}</div>
                <div className="pay-cell" data-label="Sent to">{p.method}</div>
                <div className="pay-cell pay-net" data-label="Amount">{peso(p.amount)}</div>
                <div className="pay-cell" data-label="Status"><span className={`sl-badge ${tone}`}>{label}</span></div>
              </div>
            );
          })}
          {payouts.length === 0 && (
            <div className="sl-empty">
              <Icon name="account_balance" size={36} />
              <strong>No withdrawals yet</strong>
              <span>Your requests and their status will show up here.</span>
            </div>
          )}
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Withdraw earnings"
        subtitle={`${peso(s.available)} available`}
        footer={
          <>
            <button className="sl-btn sl-btn--ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="sl-btn sl-btn--primary" onClick={submit}>Request withdrawal</button>
          </>
        }
      >
        <div className="pay-form">
          <label className={`sl-field ${error ? "has-error" : ""}`}>
            Amount (₱)
            <input className="sl-input" type="number" min={MIN_PAYOUT} max={s.available} value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} />
            {error && <span className="sl-field__error">{error}</span>}
          </label>
          <button type="button" className="pay-all" onClick={() => { setAmount(String(s.available)); setError(""); }}>Withdraw everything</button>

          <fieldset className="pay-methods">
            <legend>Send to</legend>
            {payoutMethods.map((m) => (
              <label key={m.id} className={`pay-method${methodId === m.id ? " is-selected" : ""}`}>
                <input type="radio" name="payout-method" checked={methodId === m.id} onChange={() => setMethodId(m.id)} />
                <Icon name={m.type === "Bank" ? "account_balance" : "smartphone"} size={20} />
                <span>{m.label}</span>
              </label>
            ))}
          </fieldset>

          <p className="pay-note">Requests are reviewed before they are sent. You can follow the status under Withdrawals.</p>
        </div>
      </Drawer>
    </div>
  );
}