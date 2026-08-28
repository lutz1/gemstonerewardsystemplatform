import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./PinVerification.css";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

export default function PinVerification() {
  const navigate = useNavigate();
  const { mpinSetup, role, verifyPin, completeMpinSetup, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const addDigit = (digit) => {
    if (pin.length < 4) {
      setPin((currentPin) => currentPin + digit);
      setError("");
    }
  };

  const removeDigit = () => {
    setPin((currentPin) => currentPin.slice(0, -1));
    setError("");
  };

  const handleKeyPress = (key) => {
    if (/^\d$/.test(key)) addDigit(key);
    if (key === "Backspace") removeDigit();
  };

  useEffect(() => {
    const onKeyDown = (event) => handleKeyPress(event.key);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pin.length !== 4) {
      setError("Enter all 4 digits to continue.");
      return;
    }
    if (!mpinSetup) {
      try {
        await completeMpinSetup(pin);
        navigate(role === "admin" ? "/admin" : "/dashboard");
        return;
      } catch (err) {
        setError(err?.message || "Unable to save your PIN setup. Please try again.");
        setPin("");
        return;
      }
    }
    try {
      await verifyPin(pin);
      navigate(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err?.message || "Incorrect PIN. Please try again.");
      setPin("");
    }
  };

  return (
    <main className="pin-root">
      <div className="pin-glow pin-glow-one" aria-hidden="true" />
      <div className="pin-glow pin-glow-two" aria-hidden="true" />
      <section className="pin-panel" aria-labelledby="pin-title">
        <div className="pin-brand-mark" aria-hidden="true">
          <span className="material-symbols-outlined">diamond</span>
        </div>
        <p className="pin-eyebrow">Gemstone Code</p>
        <h1 id="pin-title">{mpinSetup ? "Enter your 4-digit PIN" : "Set up your 4-digit MPIN"}</h1>
        <p className="pin-copy">
          {mpinSetup
            ? "Enter your security PIN to access your account."
            : "Create a security PIN to protect your account."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="pin-dots" aria-label={`${pin.length} of 4 digits entered`}>
            {[0, 1, 2, 3].map((index) => (
              <span className={`pin-dot${pin.length > index ? " filled" : ""}`} key={index} />
            ))}
          </div>

          {error && <p className="pin-error" role="alert">{error}</p>}

          <div className="pin-keypad" aria-label="PIN keypad">
            {keypad.map((key, index) => {
              if (!key) return <span className="pin-key-empty" key={`empty-${index}`} aria-hidden="true" />;
              return (
                <button
                  className={`pin-key${key === "backspace" ? " pin-key-action" : ""}`}
                  key={key}
                  type="button"
                  aria-label={key === "backspace" ? "Delete last digit" : `Enter ${key}`}
                  onClick={() => (key === "backspace" ? removeDigit() : addDigit(key))}
                >
                  {key === "backspace" ? <span className="material-symbols-outlined">backspace</span> : key}
                </button>
              );
            })}
          </div>

          <button className="pin-submit" type="submit" disabled={pin.length !== 4}>
            {mpinSetup ? "Verify PIN" : "Set up MPIN"}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>

        <button className="pin-signout" type="button" onClick={() => { logout(); navigate("/login"); }}>
          <span className="material-symbols-outlined">arrow_back</span>
          Use a different account
        </button>
      </section>
    </main>
  );
}
