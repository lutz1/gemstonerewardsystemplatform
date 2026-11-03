import { getFunctions, httpsCallable } from "firebase/functions";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import { app, auth, storage } from "../../../firebase";
import "./SellerApplication.css";

const initialApplication = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  mobileNumber: "",
  email: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  profilePhoto: null,
  shopName: "",
  storeLogo: null,
  sellerType: "",
  productCategory: "",
  storeDescription: "",
  businessType: "",
  businessName: "",
  registrationType: "",
  registrationNumber: "",
  taxIdentificationNumber: "",
  businessAddress: "",
  businessCertificate: null,
  idType: "philippine-national-id",
  idNumber: "",
  idFront: null,
  idBack: null,
  selfieWithId: null,
  declarationAccurate: false,
  declarationProductPolicy: false,
  declarationPlatformPolicies: false,
  declarationEnforcement: false,
  declarationPrivacyConsent: false,
};

const steps = [
  { title: "Seller Information", icon: "person" },
  { title: "Store Information", icon: "storefront" },
  { title: "Business Verification", icon: "fact_check" },
  { title: "Identity Verification", icon: "badge" },
  { title: "Seller Declaration & Agreement", icon: "edit_document" },
];

function createApplicationId() {
  if (typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export default function SellerApplication({ onBack, editApplicationId = null }) {
  const [application, setApplication] = useState(() => ({
    ...initialApplication,
    email: auth.currentUser?.email || "",
    mobileNumber: auth.currentUser?.phoneNumber || "",
  }));
  const [existingFiles, setExistingFiles] = useState({});
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editApplicationId));
  const [editLoadError, setEditLoadError] = useState("");
  const [step, setStep] = useState(1);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasSubmissionAttempt, setHasSubmissionAttempt] = useState(false);
  const [submissionApplicationId, setSubmissionApplicationId] = useState(
    () => editApplicationId || createApplicationId(),
  );
  const [submittedApplicationId, setSubmittedApplicationId] = useState("");
  const [notice, setNotice] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [contactError, setContactError] = useState("");
  const [storeLogoPreview, setStoreLogoPreview] = useState("");
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  useEffect(() => {
    if (!editApplicationId) return undefined;

    let isMounted = true;
    setIsLoadingEdit(true);
    setEditLoadError("");
    const loadApplicationForEdit = async () => {
      try {
        const getSellerApplicationForEdit = httpsCallable(
          getFunctions(app, "asia-southeast1"),
          "getSellerApplicationForEdit",
        );
        const { data } = await getSellerApplicationForEdit({
          applicationId: editApplicationId,
        });
        if (!isMounted) return;
        if (!data?.application || data.applicationId !== editApplicationId) {
          throw new Error("The seller application could not be loaded for editing.");
        }
        setSubmissionApplicationId(editApplicationId);
        setApplication((current) => ({
          ...current,
          ...data.application,
        }));
        setExistingFiles(data.existingFiles || {});
      } catch (error) {
        if (!isMounted) return;
        globalThis.console.error("Could not load seller application for editing.", error);
        setEditLoadError(error.message || "Unable to load your application for editing.");
      } finally {
        if (isMounted) setIsLoadingEdit(false);
      }
    };

    void loadApplicationForEdit();
    return () => {
      isMounted = false;
    };
  }, [editApplicationId]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return undefined;

    let isMounted = true;
    const getUserProfile = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserProfile",
    );

    getUserProfile()
      .then(({ data }) => {
        if (!isMounted) return;
        const profile = data && typeof data === "object" ? data : {};
        const savedPhone = profile.phone || profile.mobileNumber || currentUser.phoneNumber || "";
        setApplication((current) => ({
          ...current,
          email: current.email || profile.email || currentUser.email || "",
          mobileNumber: current.mobileNumber || savedPhone,
        }));
      })
      .catch(() => {
        if (!isMounted) return;
        setContactError("Could not load your saved mobile number. You can enter it here.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const storeLogo = application.storeLogo;
    if (!storeLogo || !storeLogo.type.startsWith("image/")) {
      setStoreLogoPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(storeLogo);
    setStoreLogoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [application.storeLogo]);

  useEffect(() => {
    const profilePhoto = application.profilePhoto;
    if (!profilePhoto || !profilePhoto.type.startsWith("image/")) {
      setProfilePhotoPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(profilePhoto);
    setProfilePhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [application.profilePhoto]);

  const updateField = (event) => {
    const { name, value, type, checked, files } = event.target;
    let nextValue = value;
    if (type === "file") {
      nextValue = files?.[0] || null;
    } else if (type === "checkbox") {
      nextValue = checked;
    } else if (name === "postalCode") {
      nextValue = value.replace(/\D/g, "");
    }

    setApplication((current) => ({
      ...current,
      [name]: nextValue,
    }));
  };

  const handleContinue = (event) => {
    event.preventDefault();
    setNotice("");

    if (step === 3
      && application.businessType === "registered"
      && !application.businessCertificate
      && !existingFiles.businessCertificate) {
      setNotice("Upload your business registration certificate to continue.");
      return;
    }

    if (step === 4
      && ((!application.idFront && !existingFiles.idFront)
        || (!application.idBack && !existingFiles.idBack))) {
      setNotice("Upload both the front and back of your government-issued ID to continue.");
      return;
    }

    if (step < steps.length) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsReviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setNotice("");
    if (isReviewing) {
      setIsReviewing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitApplication = async () => {
    setSubmissionError("");
    const user = auth.currentUser;
    if (!user) {
      setSubmissionError("Your session has expired. Sign in again before submitting your application.");
      return;
    }

    const applicationId = submissionApplicationId;
    const fileFields = [
      "profilePhoto",
      "storeLogo",
      "businessCertificate",
      "idFront",
      "idBack",
      "selfieWithId",
    ];
    const uploads = {};
    const uploadedRefs = [];
    const uploadBatchId = editApplicationId ? createApplicationId() : "";
    let backendSubmissionStarted = false;

    setIsSubmitting(true);
    try {
      for (const field of fileFields) {
        const file = application[field];
        if (!file) continue;

        const isCertificate = field === "businessCertificate";
        const supportedTypes = isCertificate
          ? ["image/jpeg", "image/png", "image/webp", "application/pdf"]
          : ["image/jpeg", "image/png", "image/webp"];
        if (!supportedTypes.includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} must be a supported image or PDF no larger than 10 MB.`);
        }

        const path = editApplicationId
          ? `seller-applications/${user.uid}/${applicationId}/updates/${uploadBatchId}/${field}`
          : `seller-applications/${user.uid}/${applicationId}/${field}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file, { contentType: file.type });
        uploadedRefs.push(fileRef);
        uploads[field] = path;
      }

      const applicationFields = Object.fromEntries(
        Object.entries(application).filter(([field]) => !fileFields.includes(field)),
      );

      const submitSellerApplication = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "submitSellerApplication",
      );
      backendSubmissionStarted = true;
      setHasSubmissionAttempt(true);
      const result = await submitSellerApplication({
        applicationId,
        application: {
          ...applicationFields,
          signatureFullName: fullName,
          signatureDate: currentDate,
        },
        uploads,
        ...(editApplicationId ? { editApplicationId } : {}),
      });

      if (result.data?.applicationId !== applicationId) {
        throw new Error("The server did not confirm the submitted application.");
      }
      setSubmittedApplicationId(applicationId);
      setIsSubmitted(true);
    } catch (error) {
      if ([
        "functions/invalid-argument",
        "functions/unauthenticated",
        "functions/permission-denied",
      ].includes(error.code)) {
        setHasSubmissionAttempt(false);
      }
      let cleanupWarning = "";
      if (!backendSubmissionStarted && uploadedRefs.length > 0) {
        const cleanupResults = await Promise.allSettled(uploadedRefs.map((fileRef) => deleteObject(fileRef)));
        if (cleanupResults.some((result) => result.status === "rejected")) {
          cleanupWarning = " Some temporary uploads could not be removed.";
        }
      }
      setSubmissionError(`${error.message || "Application submission failed. Please try again."}${cleanupWarning}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullName = [application.firstName, application.middleName, application.lastName]
    .filter(Boolean)
    .join(" ");
  const today = new Date();
  const currentDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (isSubmitted) {
    return (
      <div className="seller-application-root">
        <header className="seller-application-header">
          <h1>{editApplicationId ? "Update Seller Application" : "Seller Application"}</h1>
        </header>
        <main className="seller-application-content seller-application-success-view">
          <div className="seller-application-confetti" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="seller-application-success-check" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="presentation">
              <circle cx="32" cy="32" r="29" />
              <path d="m18 33 9 9 19-20" />
            </svg>
          </div>
          <h2>{editApplicationId ? "Application Updated!" : "Application Submitted!"}</h2>
          <p>
            {editApplicationId
              ? "Your updated seller application has been sent for review."
              : "Your seller application has been saved and is awaiting review."}
          </p>
          <p className="seller-application-reference">
            Application reference: <strong>{submittedApplicationId}</strong>
          </p>
          <button className="seller-application-submit" type="button" onClick={onBack}>
            {editApplicationId ? "Back to Messages" : "Back to Marketplace"}
          </button>
        </main>
      </div>
    );
  }

  if (isLoadingEdit) {
    return <LoadingScreen label="Loading your application for editing..." />;
  }

  if (editLoadError) {
    return (
      <div className="seller-application-root">
        <header className="seller-application-header">
          <h1>Update Seller Application</h1>
        </header>
        <main className="seller-application-content">
          <p className="seller-application-error" role="alert">{editLoadError}</p>
          <button className="seller-application-submit" type="button" onClick={onBack}>
            Back to Messages
          </button>
        </main>
      </div>
    );
  }

  if (isReviewing) {
    return (
      <div className="seller-application-root">
        <header className="seller-application-header">
          <button
            className="seller-application-back"
            type="button"
            aria-label="Back to seller application"
            onClick={handlePrevious}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </button>
          <h1>Application Review</h1>
        </header>
        <main className="seller-application-content">
          <section className="seller-application-intro">
            <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
            <h2>{editApplicationId ? "Updated Application Summary" : "Application Summary"}</h2>
            <p>
              {editApplicationId
                ? "Review your changes before sending the application back for review."
                : "Review your information before submitting your seller application."}
            </p>
          </section>
          <section className="seller-application-review" aria-labelledby="seller-review-heading">
            <h3 id="seller-review-heading">Seller Information</h3>
            <dl>
              <div><dt>Seller</dt><dd>{fullName || "Not provided"}</dd></div>
              <div><dt>Date of birth</dt><dd>{application.dateOfBirth || "Not provided"}</dd></div>
              <div><dt>Gender</dt><dd>{application.gender || "Not provided"}</dd></div>
              <div><dt>Contact</dt><dd>{application.email || "Not provided"}<br />{application.mobileNumber || "Not provided"}</dd></div>
              <div><dt>Address</dt><dd>{[application.address, application.city, application.province, application.postalCode].filter(Boolean).join(", ") || "Not provided"}</dd></div>
              <div><dt>Profile photo</dt><dd>{application.profilePhoto?.name || (existingFiles.profilePhoto ? "Already submitted" : "Not provided")}</dd></div>
              <div><dt>Store</dt><dd>{application.shopName || "Not provided"}</dd></div>
              <div><dt>Store logo</dt><dd>{application.storeLogo?.name || (existingFiles.storeLogo ? "Already submitted" : "Not provided")}</dd></div>
              <div><dt>Seller type</dt><dd>{application.sellerType || "Not provided"}</dd></div>
              <div><dt>Store category</dt><dd>{application.productCategory || "Not provided"}</dd></div>
              <div><dt>Store description</dt><dd>{application.storeDescription || "Not provided"}</dd></div>
              <div><dt>Business type</dt><dd>{application.businessType || "Not provided"}</dd></div>
              {application.businessType === "registered" && (
                <>
                  <div><dt>Registered business</dt><dd>{application.businessName || "Not provided"}</dd></div>
                  <div><dt>Registration type</dt><dd>{application.registrationType || "Not provided"}</dd></div>
                  <div><dt>Registration number</dt><dd>{application.registrationNumber || "Not provided"}</dd></div>
                  <div><dt>TIN</dt><dd>{application.taxIdentificationNumber || "Not provided"}</dd></div>
                  <div><dt>Business address</dt><dd>{application.businessAddress || "Not provided"}</dd></div>
                  <div><dt>Registration certificate</dt><dd>{application.businessCertificate?.name || (existingFiles.businessCertificate ? "Already submitted" : "Not provided")}</dd></div>
                </>
              )}
              <div><dt>Government ID</dt><dd>{application.idType}, {application.idNumber}</dd></div>
              <div><dt>ID front</dt><dd>{application.idFront?.name || (existingFiles.idFront ? "Already submitted" : "Not provided")}</dd></div>
              <div><dt>ID back</dt><dd>{application.idBack?.name || (existingFiles.idBack ? "Already submitted" : "Not provided")}</dd></div>
              <div><dt>Selfie holding ID</dt><dd>{application.selfieWithId?.name || (existingFiles.selfieWithId ? "Already submitted" : "Not provided")}</dd></div>
              <div><dt>Signature</dt><dd>{fullName || "Not provided"}</dd></div>
              <div><dt>Date signed</dt><dd>{currentDate}</dd></div>
            </dl>
          </section>
          <div
            className="seller-application-actions seller-application-review-actions"
            aria-busy={isSubmitting}
          >
            <button
              className="seller-application-previous"
              disabled={isSubmitting || hasSubmissionAttempt}
              type="button"
              onClick={handlePrevious}
            >
              <span className="material-symbols-outlined" aria-hidden="true">edit</span>
              Edit Application
            </button>
            <button className="seller-application-submit" disabled={isSubmitting} type="button" onClick={handleSubmitApplication}>
              {isSubmitting ? (
                <>
                  <span className="seller-application-spinner" aria-hidden="true" />
                  <span role="status" aria-live="polite">
                    {editApplicationId ? "Uploading and updating..." : "Uploading and submitting..."}
                  </span>
                </>
              ) : (
                <>
                  {submissionError
                    ? (editApplicationId ? "Retry Update" : "Retry Submission")
                    : (editApplicationId ? "Update Application" : "Submit Application")}
                  <span className="material-symbols-outlined" aria-hidden="true">check</span>
                </>
              )}
            </button>
          </div>
          <p className="seller-application-note seller-application-review-note">
            Your information and verification documents will be securely stored for seller review when submitted.
          </p>
          {submissionError && <p className="seller-application-error" role="alert">{submissionError}</p>}
          {notice && <p className="seller-application-notice" role="status" aria-live="polite">{notice}</p>}
        </main>
      </div>
    );
  }

  return (
    <div className="seller-application-root">
      <header className="seller-application-header">
        <button
          className="seller-application-back"
          type="button"
          aria-label="Back to seller information"
          onClick={onBack}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <h1>{editApplicationId ? "Update Seller Application" : "Seller Application"}</h1>
      </header>

      <main className="seller-application-content">
        <nav className="seller-application-stepper" aria-label="Application progress">
          <div className="seller-application-progress-copy">
            <span>STEP {step} OF {steps.length}</span>
            <span>{Math.round((step / steps.length) * 100)}% complete</span>
          </div>
          <div
            className="seller-application-progress-track"
            role="progressbar"
            aria-label="Application progress"
            aria-valuemin="1"
            aria-valuemax={steps.length}
            aria-valuenow={step}
          >
            <span style={{ width: `${(step / steps.length) * 100}%` }} />
          </div>
          <ol className="seller-application-step-list">
            {steps.map((item, index) => {
              const stepNumber = index + 1;
              return (
                <li
                  className={`${stepNumber === step ? "is-current" : ""}${stepNumber < step ? " is-complete" : ""}`}
                  key={item.title}
                  aria-current={stepNumber === step ? "step" : undefined}
                >
                  <span className="seller-application-step-icon">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {stepNumber < step ? "check" : item.icon}
                    </span>
                  </span>
                  <span className="seller-application-step-title">{item.title}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="seller-application-intro">
          <span className="material-symbols-outlined" aria-hidden="true">
            {steps[step - 1].icon}
          </span>
          <h2>{steps[step - 1].title}</h2>
          <p>
            {step === 1 && "Tell us about yourself and how we can reach you."}
            {step === 2 && "Share what your store will offer to gemstone buyers."}
            {step === 3 && "Provide business registration details or choose individual seller."}
            {step === 4 && "Provide your government-issued ID details for verification."}
            {step === 5 && "Complete your declarations and sign the seller agreement."}
          </p>
        </section>

        <form className="seller-application-form" onSubmit={handleContinue}>
          {step === 1 && (
            <section className="seller-application-form-section" aria-labelledby="seller-information-heading">
              <h3 id="seller-information-heading">Seller Information</h3>
              <div className="seller-application-fields-grid">
                <label>
                  First Name
                  <input autoComplete="given-name" name="firstName" onChange={updateField} required value={application.firstName} />
                </label>
                <label>
                  Middle Name <span className="seller-application-optional">(optional)</span>
                  <input autoComplete="additional-name" name="middleName" onChange={updateField} value={application.middleName} />
                </label>
                <label>
                  Last Name
                  <input autoComplete="family-name" name="lastName" onChange={updateField} required value={application.lastName} />
                </label>
                <label>
                  Date of Birth
                  <input autoComplete="bday" name="dateOfBirth" onChange={updateField} required type="date" value={application.dateOfBirth} />
                </label>
                <label>
                  Gender <span className="seller-application-optional">(optional)</span>
                  <select name="gender" onChange={updateField} value={application.gender}>
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Mobile Number
                  <input
                    autoComplete="tel"
                    name="mobileNumber"
                    onChange={updateField}
                    required
                    type="tel"
                    value={application.mobileNumber}
                    aria-describedby={contactError ? "seller-application-contact-error" : undefined}
                  />
                  {contactError && (
                    <span className="seller-application-field-error" id="seller-application-contact-error" role="status">
                      {contactError}
                    </span>
                  )}
                </label>
                <label className="seller-application-field-full">
                  Email Address
                  <input autoComplete="email" name="email" onChange={updateField} required type="email" value={application.email} />
                </label>
                <label className="seller-application-field-full">
                  Complete Address
                  <textarea autoComplete="street-address" name="address" onChange={updateField} required rows="3" value={application.address} />
                </label>
                <label>
                  City / Municipality
                  <input autoComplete="address-level2" name="city" onChange={updateField} required value={application.city} />
                </label>
                <label>
                  Province / State
                  <input autoComplete="address-level1" name="province" onChange={updateField} required value={application.province} />
                </label>
                <label>
                  Postal Code
                  <input
                    autoComplete="postal-code"
                    inputMode="numeric"
                    name="postalCode"
                    onChange={updateField}
                    pattern="[0-9]*"
                    required
                    type="text"
                    value={application.postalCode}
                  />
                </label>
                <label className="seller-application-field-full">
                  Profile Photo <span className="seller-application-optional">(optional)</span>
                  <input accept="image/jpeg,image/png,image/webp" autoComplete="off" name="profilePhoto" onChange={updateField} type="file" />
                  {existingFiles.profilePhoto && (
                    <span className="seller-application-section-description">
                      Current photo is saved. Upload a replacement only if it needs updating.
                    </span>
                  )}
                  {profilePhotoPreview && (
                    <img
                      className="seller-application-upload-preview"
                      src={profilePhotoPreview}
                      alt="Profile photo preview"
                    />
                  )}
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="seller-application-form-section" aria-labelledby="seller-store-information-heading">
              <h3 id="seller-store-information-heading">Store Information</h3>
              <label>
                Store Name
                <input autoComplete="organization" name="shopName" onChange={updateField} required value={application.shopName} />
              </label>
              <label>
                Store Logo <span className="seller-application-optional">(optional)</span>
                <input accept="image/jpeg,image/png,image/webp" autoComplete="off" name="storeLogo" onChange={updateField} type="file" />
                {existingFiles.storeLogo && (
                  <span className="seller-application-section-description">
                    Current logo is saved. Upload a replacement only if it needs updating.
                  </span>
                )}
                {storeLogoPreview && (
                  <img
                    className="seller-application-upload-preview"
                    src={storeLogoPreview}
                    alt="Store logo preview"
                  />
                )}
              </label>
              <label>
                Type of Seller
                <select name="sellerType" onChange={updateField} required value={application.sellerType}>
                  <option value="" disabled>Select your seller type</option>
                  <option value="individual">Individual Seller</option>
                  <option value="sole-proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="corporation">Corporation</option>
                </select>
              </label>
              <label>
                Product Category
                <select name="productCategory" onChange={updateField} required value={application.productCategory}>
                  <option value="" disabled>Select a product category</option>
                  <option value="dry-goods">Dry Goods</option>
                  <option value="food-beverages">Food &amp; Beverages</option>
                  <option value="fashion-apparel">Fashion &amp; Apparel</option>
                  <option value="beauty-personal-care">Beauty &amp; Personal Care</option>
                  <option value="home-living">Home &amp; Living</option>
                  <option value="electronics-accessories">Electronics &amp; Accessories</option>
                  <option value="health-wellness">Health &amp; Wellness</option>
                  <option value="jewelry-accessories">Jewelry &amp; Accessories</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Store Description
                <textarea
                  maxLength="500"
                  name="storeDescription"
                  onChange={updateField}
                  placeholder="Describe your store and the gemstones or products you offer."
                  required
                  rows="5"
                  value={application.storeDescription}
                />
                <span className="seller-application-character-count">{application.storeDescription.length}/500</span>
              </label>
            </section>
          )}

          {step === 3 && (
            <section className="seller-application-form-section" aria-labelledby="seller-business-details-heading">
              <h3 id="seller-business-details-heading">Business Information</h3>
              <fieldset className="seller-application-business-type">
                <legend>Seller registration</legend>
                <label>
                  <input
                    checked={application.businessType === "registered"}
                    name="businessType"
                    onChange={updateField}
                    required
                    type="radio"
                    value="registered"
                  />
                  <span>I am selling as a registered business</span>
                </label>
                <label>
                  <input
                    checked={application.businessType === "individual"}
                    name="businessType"
                    onChange={updateField}
                    required
                    type="radio"
                    value="individual"
                  />
                  <span>I am selling as an Individual</span>
                </label>
              </fieldset>
              {application.businessType === "registered" ? (
                <div className="seller-application-business-fields">
                  <h4>For Registered Businesses</h4>
                  <label>
                    Registered Business Name
                    <input autoComplete="organization" name="businessName" onChange={updateField} required value={application.businessName} />
                  </label>
                  <label>
                    Business Registration Type
                    <select name="registrationType" onChange={updateField} required value={application.registrationType}>
                      <option value="">Select registration type</option>
                      <option value="dti">DTI Registration</option>
                      <option value="sec">SEC Registration</option>
                      <option value="cooperative">Cooperative Registration</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label>
                    Business Registration Number
                    <input autoComplete="off" name="registrationNumber" onChange={updateField} required value={application.registrationNumber} />
                  </label>
                  <label>
                    Tax Identification Number (TIN) <span className="seller-application-optional">(optional)</span>
                    <input autoComplete="off" name="taxIdentificationNumber" onChange={updateField} value={application.taxIdentificationNumber} />
                  </label>
                  <label>
                    Business Address
                    <textarea autoComplete="street-address" name="businessAddress" onChange={updateField} required rows="3" value={application.businessAddress} />
                  </label>
                  <label>
                    Upload Business Registration Certificate
                    <input accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" autoComplete="off" name="businessCertificate" onChange={updateField} type="file" />
                    {existingFiles.businessCertificate && (
                      <span className="seller-application-section-description">
                        Current certificate is saved. Upload a replacement only if it needs updating.
                      </span>
                    )}
                  </label>
                </div>
              ) : application.businessType === "individual" ? (
                <p className="seller-application-section-description">
                  Individual sellers do not need to provide business registration details. A government-issued ID is required in the next step.
                </p>
              ) : null}
            </section>
          )}

          {step === 4 && (
            <section className="seller-application-form-section" aria-labelledby="seller-identity-verification-heading">
              <h3 id="seller-identity-verification-heading">Identity Verification</h3>
              <label>
                Government-issued ID Type
                <select name="idType" onChange={updateField} required value={application.idType}>
                  <option value="passport">Passport</option>
                  <option value="drivers-license">Driver&apos;s License</option>
                  <option value="philippine-national-id">National ID</option>
                  <option value="umid">UMID</option>
                  <option value="voters-id">Voter&apos;s ID</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                ID Number
                <input autoComplete="off" name="idNumber" onChange={updateField} required value={application.idNumber} />
              </label>
              <label>
                Upload Front of ID
                <input accept="image/jpeg,image/png,image/webp" autoComplete="off" name="idFront" onChange={updateField} type="file" />
                {existingFiles.idFront && (
                  <span className="seller-application-section-description">
                    Current ID image is saved. Upload a replacement only if it needs updating.
                  </span>
                )}
              </label>
              <label>
                Upload Back of ID
                <input accept="image/jpeg,image/png,image/webp" autoComplete="off" name="idBack" onChange={updateField} type="file" />
                {existingFiles.idBack && (
                  <span className="seller-application-section-description">
                    Current ID image is saved. Upload a replacement only if it needs updating.
                  </span>
                )}
              </label>
              <label>
                Selfie Holding ID <span className="seller-application-optional">(recommended)</span>
                <input accept="image/jpeg,image/png,image/webp" autoComplete="off" name="selfieWithId" onChange={updateField} type="file" />
                {existingFiles.selfieWithId && (
                  <span className="seller-application-section-description">
                    Current selfie is saved. Upload a replacement only if it needs updating.
                  </span>
                )}
              </label>
            </section>
          )}

          {step === 5 && (
            <>
              <section className="seller-application-form-section" aria-labelledby="seller-declaration-heading">
                <h3 id="seller-declaration-heading">Seller Declaration</h3>
                <label className="seller-application-declaration">
                  <input checked={application.declarationAccurate} name="declarationAccurate" onChange={updateField} required type="checkbox" />
                  <span>I certify that all information provided is true and accurate.</span>
                </label>
                <label className="seller-application-declaration">
                  <input checked={application.declarationProductPolicy} name="declarationProductPolicy" onChange={updateField} required type="checkbox" />
                  <span>I agree not to list counterfeit, stolen, prohibited, or misrepresented gemstones and products.</span>
                </label>
                <label className="seller-application-declaration">
                  <input checked={application.declarationPlatformPolicies} name="declarationPlatformPolicies" onChange={updateField} required type="checkbox" />
                  <span>I agree to comply with the platform&apos;s Seller Policies and Terms of Service.</span>
                </label>
                <label className="seller-application-declaration">
                  <input checked={application.declarationEnforcement} name="declarationEnforcement" onChange={updateField} required type="checkbox" />
                  <span>I understand that my account may be suspended or terminated for violating platform rules.</span>
                </label>
                <label className="seller-application-declaration">
                  <input checked={application.declarationPrivacyConsent} name="declarationPrivacyConsent" onChange={updateField} required type="checkbox" />
                  <span>I consent to the collection and processing of my personal information for seller verification purposes.</span>
                </label>
              </section>

              <section className="seller-application-form-section" aria-labelledby="seller-signature-heading">
                <h3 id="seller-signature-heading">Signature</h3>
                <label>
                  Full Name
                  <input autoComplete="name" readOnly required value={fullName} />
                </label>
                <label>
                  Date
                  <input autoComplete="off" readOnly type="date" value={currentDate} />
                </label>
              </section>

            </>
          )}

          <div className={`seller-application-actions${step === 1 ? " is-first-step" : ""}`}>
            {step > 1 && (
              <button className="seller-application-previous" type="button" onClick={handlePrevious}>
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                Previous
              </button>
            )}
            <button
              className="seller-application-submit"
              type="submit"
              disabled={step === 5 && ![
                application.declarationAccurate,
                application.declarationProductPolicy,
                application.declarationPlatformPolicies,
                application.declarationEnforcement,
                application.declarationPrivacyConsent,
              ].every(Boolean)}
            >
              {step === steps.length ? "Review Application" : "Continue"}
              <span className="material-symbols-outlined" aria-hidden="true">
                {step === steps.length ? "fact_check" : "arrow_forward"}
              </span>
            </button>
          </div>
          <p className="seller-application-note">
            Your information is saved securely for seller review.
          </p>
          {notice && <p className="seller-application-notice" role="status" aria-live="polite">{notice}</p>}
        </form>
      </main>
    </div>
  );
}
