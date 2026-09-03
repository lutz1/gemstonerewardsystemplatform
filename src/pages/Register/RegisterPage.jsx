import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { app } from "../../firebase";
import "./RegisterPage.css";

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    phone: "",
    birthdate: "",
    civilStatus: "single",
    referralCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const referralCode = searchParams.get("ref");
    if (referralCode) setForm((current) => ({ ...current, referralCode }));
  }, [searchParams]);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (
      !form.username.trim() ||
      !form.lastName.trim() ||
      !form.firstName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.birthdate.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const registerMembership = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "registerMembership",
      );
      await registerMembership({
        username: form.username.trim(),
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        birthdate: form.birthdate,
        civilStatus: form.civilStatus,
        referralCode: form.referralCode.trim(),
      });
      setSuccess("Account created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1400);
    } catch (registrationError) {
      setError(
        registrationError?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-root">
      <main className="register-main">
        <Link className="register-back-link" to="/login">
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
          Back to Login
        </Link>
        <header className="register-header">
          <p className="register-eyebrow">Gemstone Code</p>
          <h1>Apply for Membership</h1>
          <p>Fill in your details to create your account.</p>
        </header>
        <section className="register-card">
          {error && (
            <p className="register-message register-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="register-message register-success" role="status">
              {success}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <label>
              Username
              <input
                required
                placeholder="e.g. alexisrivera"
                autoComplete="username"
                value={form.username}
                onChange={updateField("username")}
              />
            </label>
            <div className="register-name-fields">
              <label>
                Last Name
                <input required value={form.lastName} onChange={updateField("lastName")} />
              </label>
              <label>
                First Name
                <input required value={form.firstName} onChange={updateField("firstName")} />
              </label>
              <label>
                Middle Name <span className="register-optional">Optional</span>
                <input value={form.middleName} onChange={updateField("middleName")} />
              </label>
            </div>
            <label>
              Email Address
              <input
                required
                type="email"
                placeholder="e.g. name@email.com"
                autoComplete="email"
                value={form.email}
                onChange={updateField("email")}
              />
            </label>
            <label>
              Phone Number
              <input
                required
                type="tel"
                placeholder="e.g. +63 912 345 6789"
                value={form.phone}
                onChange={updateField("phone")}
              />
            </label>
            <label>
              Birthdate
              <input
                required
                type="date"
                value={form.birthdate}
                onChange={updateField("birthdate")}
              />
            </label>
            <label>
              Civil Status
              <select value={form.civilStatus} onChange={updateField("civilStatus")}>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
            </label>
            <label>
              Referral Code <span className="register-optional">Optional</span>
              <input
                placeholder="Optional"
                value={form.referralCode}
                onChange={updateField("referralCode")}
              />
            </label>
            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "CREATE ACCOUNT"}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
