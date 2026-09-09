import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { MdArrowBack, MdGroup, MdPerson } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import "./DirectReferralsPage.css";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default function DirectReferralsPage({ referralType = "direct" }) {
  const navigate = useNavigate();
  const isNetwork = referralType === "network";
  const [referrals, setReferrals] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const getReferrals = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      isNetwork ? "getNetworkReferrals" : "getDirectReferrals",
    );

    getReferrals()
      .then(({ data }) => setReferrals(Array.isArray(data) ? data : []))
      .catch(() =>
        setError(
          isNetwork
            ? "Unable to load your network referrals."
            : "Unable to load your direct referrals.",
        ),
      );
  }, [isNetwork]);

  return (
    <div className="referrals-root">
      <TopBar userRole="Member" />
      <main className="referrals-main">
        <div className="referrals-content">
          <button
            className="referrals-back-button"
            type="button"
            onClick={() => navigate(-1)}
          >
            <MdArrowBack size={18} />
            Back
          </button>

          <header className="referrals-header">
            <div className="referrals-heading-icon">
              <MdGroup size={24} />
            </div>
            <div>
              <p className="referrals-eyebrow">Network</p>
              <h1>{isNetwork ? "Network Referrals" : "Direct Referrals"}</h1>
              <p>
                {isNetwork
                  ? "People referred by members in your direct network."
                  : "People who joined using your referral code."}
              </p>
            </div>
          </header>

          <section
            className="referrals-summary"
            aria-label={`${isNetwork ? "Network" : "Direct"} referral count`}
          >
            <span>{isNetwork ? "Network referrals" : "Direct referrals"}</span>
            <strong>{referrals ? referrals.length : "—"}</strong>
          </section>

          {error && <p className="referrals-message" role="alert">{error}</p>}
          {!error && referrals === null && (
            <p className="referrals-message" role="status">Loading referrals...</p>
          )}
          {!error && referrals?.length === 0 && (
            <div className="referrals-empty">
              <MdPerson size={28} />
              <h2>
                No {isNetwork ? "network" : "direct"} referrals yet
              </h2>
              <p>
                {isNetwork
                  ? "Your direct network has not added any referrals yet."
                  : "Share your referral code to start growing your network."}
              </p>
            </div>
          )}

          {referrals?.length > 0 && (
            <section className="referrals-list" aria-label="Direct referrals list">
              {referrals.map((referral) => (
                <article className="referral-row" key={referral.id}>
                  <div className="referral-avatar" aria-hidden="true">
                    {(referral.name || "M")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div className="referral-details">
                    <h2>{referral.name}</h2>
                    <p>{referral.username ? `@${referral.username}` : referral.email || "Member"}</p>
                  </div>
                  <div className="referral-meta">
                    <span className={`referral-status referral-status-${referral.status}`}>
                      {referral.status}
                    </span>
                    <time dateTime={referral.joinDate}>{formatDate(referral.joinDate)}</time>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
      <BottomNav activeItem="dashboard" />
    </div>
  );
}
