export default function ShareLinkAction({ onShare }) {
  return (
    <button type="button" className="pc-referral-action" onClick={onShare}>
      <span className="pc-referral-action-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          ios_share
        </span>
      </span>
      <span className="pc-referral-action-copy">
        <strong>Share Link</strong>
        <small>Send your link via any app</small>
      </span>
    </button>
  );
}
