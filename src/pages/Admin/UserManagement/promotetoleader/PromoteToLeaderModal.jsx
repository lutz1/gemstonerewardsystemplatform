import { getFunctions, httpsCallable } from "firebase/functions";
import { useMemo, useState } from "react";
import { app } from "../../../../firebase";
import "./PromoteToLeaderModal.css";

/**
 * Modal for searching a member and promoting them to leader.
 *
 * Props:
 * - isOpen: boolean — whether the modal is shown
 * - onClose: () => void — called when the modal should close (X button, backdrop click, or after a successful promotion)
 * - userList: array — current user list, used for the search results
 * - onPromoted: (userId: string) => void — called after a successful promotion,
 *     so the parent page can update that user's role in its own list
 */
export default function PromoteToLeaderModal({
  isOpen,
  onClose,
  userList,
  onPromoted,
}) {
  const [promotionSearch, setPromotionSearch] = useState("");
  const [promotionDraft, setPromotionDraft] = useState("");
  const [selectedPromotionUserId, setSelectedPromotionUserId] = useState("");
  const [isConfirmingPromotion, setIsConfirmingPromotion] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionError, setPromotionError] = useState("");
  const [promotionSuccess, setPromotionSuccess] = useState(false);

  const promotionMatches = useMemo(() => {
    const normalized = promotionSearch.trim().toLowerCase();
    const eligibleUsers = userList.filter(
      (user) => user.role !== "leader" && user.role !== "admin",
    );

    if (!normalized) return eligibleUsers;

    return eligibleUsers.filter((user) => {
      const searchable = [user.name, user.email, user.id]
        .filter(Boolean)
        .join(" ");
      return searchable.toLowerCase().includes(normalized);
    });
  }, [promotionSearch, userList]);

  if (!isOpen) return null;

  const closePromotionModal = () => {
    setPromotionSearch("");
    setPromotionDraft("");
    setSelectedPromotionUserId("");
    setIsConfirmingPromotion(false);
    setPromotionError("");
    setPromotionSuccess(false);
    setIsPromoting(false);
    onClose();
  };

  const selectedPromotionUser = userList.find(
    (user) => user.id === selectedPromotionUserId,
  );

  const handleOpenPromotionConfirmation = () => {
    if (!selectedPromotionUser) {
      setPromotionError("Please select a member to promote.");
      return;
    }

    setPromotionError("");
    setIsConfirmingPromotion(true);
  };

  const handlePromoteMember = async () => {
    if (!selectedPromotionUser) {
      setPromotionError("Please select a member to promote.");
      return;
    }

    setIsPromoting(true);
    setPromotionError("");

    try {
      const promoteMemberToLeader = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "promoteMemberToLeader",
      );

      await promoteMemberToLeader({ userId: selectedPromotionUser.id });

      onPromoted?.(selectedPromotionUser.id);
      setPromotionSuccess(true);
      setIsConfirmingPromotion(false);

      setTimeout(() => {
        closePromotionModal();
      }, 1500);
    } catch (error) {
      setPromotionError(
        error?.message || "Failed to promote member. Please try again.",
      );
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div
      className="admin-users-modal-backdrop"
      role="presentation"
      onMouseDown={closePromotionModal}
    >
      <div
        className="admin-users-modal admin-users-promotion-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-users-modal-header">
          <h2>Promote Member</h2>
          <button
            type="button"
            onClick={closePromotionModal}
            aria-label="Close promotion modal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {promotionSuccess ? (
          <div className="admin-users-success-state" aria-live="polite">
            <div className="admin-users-success-check">
              <span className="material-symbols-outlined" aria-hidden="true">
                check
              </span>
            </div>
            <h3>Promotion successful</h3>
            <p>
              {userList.find((user) => user.id === selectedPromotionUserId)
                ?.name || "Member"}{" "}
              is now a leader.
            </p>
          </div>
        ) : (
          <>
            <label className="admin-users-field-span-2">
              Search member by name or email
              <input
                type="search"
                value={promotionDraft}
                placeholder="Search member name"
                onChange={(event) => {
                  setPromotionDraft(event.target.value);
                  setSelectedPromotionUserId("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setPromotionSearch(promotionDraft.trim());
                  }
                }}
              />
            </label>

            <div className="admin-users-promotion-list">
              {promotionMatches.length === 0 ? (
                <p className="admin-users-promotion-empty">No member found.</p>
              ) : (
                promotionMatches.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`admin-users-promotion-option ${
                      selectedPromotionUserId === user.id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedPromotionUserId(user.id)}
                  >
                    <div className="admin-user-identity">
                      <span className="admin-user-avatar">
                        {(user.name || user.email || "U")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "U"}
                      </span>
                      <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </span>
                    </div>
                    <span className="admin-user-role">
                      {user.role || "member"}
                    </span>
                  </button>
                ))
              )}
            </div>

            {promotionError && (
              <p className="admin-users-form-error" role="alert">
                {promotionError}
              </p>
            )}

            <button
              type="button"
              className="admin-users-primary-button"
              disabled={!selectedPromotionUserId || isPromoting}
              onClick={handleOpenPromotionConfirmation}
            >
              {isPromoting ? "Promoting..." : "Confirm Promotion"}
            </button>
          </>
        )}

        {isConfirmingPromotion && selectedPromotionUser && (
          <div
            className="admin-users-confirmation-backdrop"
            role="presentation"
            onMouseDown={() => setIsConfirmingPromotion(false)}
          >
            <div
              className="admin-users-confirmation-modal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="admin-users-modal-header">
                <h2>Confirm Promotion</h2>
                <button
                  type="button"
                  onClick={() => setIsConfirmingPromotion(false)}
                  aria-label="Close confirmation modal"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>

              <p className="admin-users-confirmation-message">
                Are you sure you want to promote {selectedPromotionUser.name} to
                leader?
              </p>

              <div className="admin-users-confirmation-actions">
                <button
                  type="button"
                  className="admin-users-secondary-button"
                  onClick={() => setIsConfirmingPromotion(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-users-primary-button"
                  disabled={isPromoting}
                  onClick={handlePromoteMember}
                >
                  {isPromoting ? "Promoting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
