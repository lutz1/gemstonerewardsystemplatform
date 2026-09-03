import { getFunctions, httpsCallable } from "firebase/functions";
import { useRef, useState } from "react";
import { app } from "../../../../firebase";
import "./AddUserModal.css";

const emptyNewUser = {
  username: "",
  lastName: "",
  firstName: "",
  middleName: "",
  birthdate: "",
  civilStatus: "single",
  address: "",
  phone: "",
  email: "",
  role: "member",
  status: "active",
};

/**
 * Modal form for creating a new user.
 *
 * Props:
 * - isOpen: boolean — whether the modal is shown
 * - onClose: () => void — called when the modal should close (X button, backdrop click, or after a successful create)
 * - existingUsers: array — current user list, used to block duplicate emails
 * - onUserCreated: () => Promise<void> | void — called after a user is successfully created,
 *     so the parent page can reload the list and reset pagination
 */
export default function AddUserModal({
  isOpen,
  onClose,
  existingUsers,
  onUserCreated,
}) {
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submissionLock = useRef(false);

  if (!isOpen) return null;

  const closeAddUserModal = (force = false) => {
    if (!force && (isSubmitting || isSuccess)) return;

    submissionLock.current = false;
    setNewUser(emptyNewUser);
    setFormErrors({});
    setSubmitError("");
    setIsSubmitting(false);
    setIsSuccess(false);
    onClose();
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    if (submissionLock.current) return;

    const username = newUser.username.trim().toUpperCase();
    const lastName = newUser.lastName.trim().toUpperCase();
    const firstName = newUser.firstName.trim().toUpperCase();
    const middleName = newUser.middleName.trim().toUpperCase();
    const birthdate = newUser.birthdate.trim();
    const address = newUser.address.trim().toUpperCase();
    const phone = newUser.phone.trim();
    const email = newUser.email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9+\-()\s]{7,15}$/;

    const errors = {};
    if (!username) {
      errors.username = "Username is required.";
    } else if (
      (existingUsers || []).some(
        (user) =>
          (user.username || "").toLowerCase() === username.toLowerCase(),
      )
    ) {
      errors.username = "A user with this username already exists.";
    }
    if (!lastName) errors.lastName = "Last name is required.";
    if (!firstName) errors.firstName = "First name is required.";
    if (!birthdate) errors.birthdate = "Birthdate is required.";
    if (!address) errors.address = "Address is required.";
    if (!phone) {
      errors.phone = "Phone is required.";
    } else if (!phonePattern.test(phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (!email) {
      errors.email = "Email is required.";
    } else if (!emailPattern.test(email)) {
      errors.email = "Enter a valid email address.";
    } else if (
      (existingUsers || []).some(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      )
    ) {
      errors.email = "A user with this email already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitError("");
    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      const createUser = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "createUser",
      );
      await createUser({
        username,
        lastName,
        firstName,
        middleName,
        birthdate,
        civilStatus: newUser.civilStatus,
        address,
        phone,
        email,
        role: newUser.role,
        status: newUser.status,
      });
      setIsSuccess(true);
      await onUserCreated?.();
      window.setTimeout(() => closeAddUserModal(true), 1200);
    } catch (error) {
      submissionLock.current = false;
      setSubmitError(
        error?.message || "Failed to create user. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="admin-users-modal-backdrop"
      role="presentation"
      onMouseDown={closeAddUserModal}
    >
      <form
        className="admin-users-modal"
        onSubmit={handleAddUser}
        noValidate
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-users-modal-header">
          <h2>Add User</h2>
          <button
            type="button"
            onClick={closeAddUserModal}
            aria-label="Close add user form"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        {(isSubmitting || isSuccess) && (
          <div className="admin-users-submit-status" role="status" aria-live="polite">
            {isSuccess ? (
              <>
                <span className="admin-users-success-check" aria-hidden="true">
                  <span className="material-symbols-outlined">check</span>
                </span>
                <strong>Account created successfully</strong>
              </>
            ) : (
              <>
                <span className="admin-users-loading-spinner" aria-hidden="true" />
                <strong>Creating account...</strong>
              </>
            )}
          </div>
        )}
        <div className="admin-users-modal-grid">
          <label className="admin-users-field-span-2">
            Username
            <input
              required
              autoComplete="username"
              value={newUser.username}
              aria-invalid={Boolean(formErrors.username)}
              onChange={(event) =>
                setNewUser({ ...newUser, username: event.target.value })
              }
            />
            {formErrors.username && (
              <span className="admin-users-field-error">
                {formErrors.username}
              </span>
            )}
          </label>
          <label className="admin-users-field-span-2">
            Last Name, First Name, Middle Name
            <div className="admin-users-name-fields">
              <input
                required
                placeholder="Last name"
                aria-label="Last name"
                value={newUser.lastName}
                aria-invalid={Boolean(formErrors.lastName)}
                onChange={(event) =>
                  setNewUser({ ...newUser, lastName: event.target.value })
                }
              />
              <input
                required
                placeholder="First name"
                aria-label="First name"
                value={newUser.firstName}
                aria-invalid={Boolean(formErrors.firstName)}
                onChange={(event) =>
                  setNewUser({ ...newUser, firstName: event.target.value })
                }
              />
              <input
                placeholder="Middle name (optional)"
                aria-label="Middle name"
                value={newUser.middleName}
                aria-invalid={Boolean(formErrors.middleName)}
                onChange={(event) =>
                  setNewUser({ ...newUser, middleName: event.target.value })
                }
              />
            </div>
            {(formErrors.lastName ||
              formErrors.firstName ||
              formErrors.middleName) && (
              <span className="admin-users-field-error">
                {formErrors.lastName ||
                  formErrors.firstName ||
                  formErrors.middleName}
              </span>
            )}
          </label>
          <label>
            Birthdate
            <input
              required
              type="date"
              value={newUser.birthdate}
              aria-invalid={Boolean(formErrors.birthdate)}
              onChange={(event) =>
                setNewUser({ ...newUser, birthdate: event.target.value })
              }
            />
            {formErrors.birthdate && (
              <span className="admin-users-field-error">
                {formErrors.birthdate}
              </span>
            )}
          </label>
          <label>
            Civil Status
            <select
              value={newUser.civilStatus}
              onChange={(event) =>
                setNewUser({ ...newUser, civilStatus: event.target.value })
              }
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </label>
          <label className="admin-users-field-span-2">
            Address
            <input
              required
              value={newUser.address}
              aria-invalid={Boolean(formErrors.address)}
              onChange={(event) =>
                setNewUser({ ...newUser, address: event.target.value })
              }
            />
            {formErrors.address && (
              <span className="admin-users-field-error">
                {formErrors.address}
              </span>
            )}
          </label>
          <label>
            Phone
            <input
              required
              type="tel"
              value={newUser.phone}
              aria-invalid={Boolean(formErrors.phone)}
              onChange={(event) =>
                setNewUser({ ...newUser, phone: event.target.value })
              }
            />
            {formErrors.phone && (
              <span className="admin-users-field-error">
                {formErrors.phone}
              </span>
            )}
          </label>
          <label>
            Email Address
            <input
              required
              type="email"
              value={newUser.email}
              aria-invalid={Boolean(formErrors.email)}
              onChange={(event) =>
                setNewUser({ ...newUser, email: event.target.value })
              }
            />
            {formErrors.email && (
              <span className="admin-users-field-error">
                {formErrors.email}
              </span>
            )}
          </label>
          <label>
            Role
            <select
              value={newUser.role}
              onChange={(event) =>
                setNewUser({ ...newUser, role: event.target.value })
              }
            >
              <option value="member">Member</option>
              <option value="ceo">CEO</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={newUser.status}
              onChange={(event) =>
                setNewUser({ ...newUser, status: event.target.value })
              }
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>
        {submitError && (
          <p className="admin-users-form-error" role="alert">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          className="admin-users-primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create User"}
        </button>
      </form>
    </div>
  );
}
