import CopyLinkAction from "./CopyLinkAction";
import RegisterMemberAction from "./RegisterMemberAction";
import ShareLinkAction from "./ShareLinkAction";

export default function ReferralActionsModal({
  isOpen,
  referralLink,
  copied,
  onCopy,
  onShare,
  onRegister,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="pc-referral-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pc-referral-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-actions-title"
      >
        <h2 id="referral-actions-title">Direct Referral</h2>
        <div className="pc-referral-modal-link">
          <span className="material-symbols-outlined" aria-hidden="true">
            link
          </span>
          <span>{referralLink || "Referral link unavailable"}</span>
        </div>
        <div className="pc-referral-actions-list">
          <CopyLinkAction copied={copied} onCopy={onCopy} />
          <ShareLinkAction onShare={onShare} />
          <RegisterMemberAction onRegister={onRegister} />
        </div>
        <button
          type="button"
          className="pc-referral-modal-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
      </section>
    </div>
  );
}
