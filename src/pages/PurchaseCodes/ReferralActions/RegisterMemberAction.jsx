export default function RegisterMemberAction({ onRegister }) {
  return (
    <button type="button" className="pc-referral-action" onClick={onRegister}>
      <span className="pc-referral-action-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          person_add
        </span>
      </span>
      <span className="pc-referral-action-copy">
        <strong>Register New Member</strong>
        <small>Open the registration form directly</small>
      </span>
    </button>
  );
}
