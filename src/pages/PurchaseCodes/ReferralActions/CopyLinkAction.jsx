export default function CopyLinkAction({ copied, onCopy }) {
  return (
    <button type="button" className="pc-referral-action" onClick={onCopy}>
      <span className="pc-referral-action-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          content_copy
        </span>
      </span>
      <span className="pc-referral-action-copy">
        <strong>{copied ? "Copied!" : "Copy Link"}</strong>
        <small>Copy your referral link to clipboard</small>
      </span>
    </button>
  );
}
