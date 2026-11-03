import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { MdClose } from "react-icons/md";
import { app } from "../../firebase";
import "./PumpValueModal.css";

function formatPeso(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PumpValueModal({ currentPond, onClose, onPumped }) {
  const [stage, setStage] = useState("pin");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const enteredAmount = Number(amount);
  const validPin = /^\d{4}$/.test(pin);
  const validAmount = Number.isFinite(enteredAmount)
    && enteredAmount > 0
    && Math.abs(enteredAmount - Number(enteredAmount.toFixed(2))) < 1e-8;
  const submitLabel = stage === "pin"
    ? (isSaving ? "Verifying..." : "Verify PIN")
    : (isSaving ? "Pumping..." : "Pump value");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      if (stage === "pin") {
        const verifyPumpValuePin = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "verifyPumpValuePin",
        );
        await verifyPumpValuePin({ pin });
        setStage("amount");
        setIsSaving(false);
        return;
      }

      const pumpGemValue = httpsCallable(getFunctions(app, "asia-southeast1"), "pumpGemValue");
      const result = await pumpGemValue({ amount: enteredAmount, pin });
      onPumped(Number(result.data?.amount));
    } catch (submitError) {
      console.error(
        stage === "pin" ? "Failed to verify GEM pump PIN:" : "Failed to pump GEM value:",
        submitError,
      );
      setError(
        submitError.message
          || (stage === "pin" ? "Unable to verify the PIN." : "Unable to pump value into the GEM Pond."),
      );
      setIsSaving(false);
    }
  };

  return (
    <div
      className="pump-value-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pump-value-title"
      onClick={() => !isSaving && onClose()}
    >
      <section
        className="pump-value-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pump-value-header">
          <div>
            <p className="pump-value-eyebrow">GEM Pond</p>
            <h2 id="pump-value-title">
              {stage === "pin" ? "Verify PIN" : "Pump value"}
            </h2>
          </div>
          <button
            className="pump-value-close"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close pump value dialog"
          >
            <MdClose />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {stage === "pin" ? (
            <>
              <p className="pump-value-description">
                Enter the 4-digit PIN to authorize adding value to the GEM Pond.
              </p>
              <label className="pump-value-label" htmlFor="pump-value-pin">
                Pump value PIN
              </label>
              <div className="pump-value-input-wrap">
                <input
                  id="pump-value-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  autoComplete="off"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit PIN"
                  required
                  disabled={isSaving}
                  autoFocus
                />
              </div>
            </>
          ) : (
            <>
              <p className="pump-value-description">
                Add PHP funds to the pond. This amount is included in the
                calculated GEM value.
              </p>
              <label className="pump-value-label" htmlFor="pump-value-amount">
                Amount to add (PHP)
              </label>
              <div className="pump-value-input-wrap">
                <span aria-hidden="true">₱</span>
                <input
                  id="pump-value-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              {validAmount && (
                <p className="pump-value-preview">
                  New pond total: {formatPeso(Number(currentPond) + enteredAmount)}
                </p>
              )}
            </>
          )}
          {error && (
            <p className="pump-value-error" role="alert">
              {error}
            </p>
          )}
          <div className="pump-value-actions">
            <button
              className="pump-value-cancel"
              type="button"
              onClick={stage === "pin" ? onClose : () => setStage("pin")}
              disabled={isSaving}
            >
              {stage === "pin" ? "Cancel" : "Back"}
            </button>
            <button
              className="pump-value-submit"
              type="submit"
              disabled={isSaving || (stage === "pin" ? !validPin : !validAmount)}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
