import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { MdArrowBack, MdClose } from "react-icons/md";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import diamondCard from "../../assets/diamond_card_products.png";
import emeraldCard from "../../assets/emerald_card_products.png";
import sapphireCard from "../../assets/sapphire_card_products.png";
import BottomNav from "../../components/BottomNavigationBar/BottomNav";
import TopBar from "../../components/TopBar/TopBar";
import { app } from "../../firebase";
import DeliveryInformationStep from "./DeliveryInformationStep";
import {
    calcTotal,
    formatCurrency,
    getPackageById,
} from "../../utils/PackagesData";
import "./ProductsPage.css";

const tierImages = {
  emerald: emeraldCard,
  sapphire: sapphireCard,
  diamond: diamondCard,
};

export default function PackageDetailPage() {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const location = useLocation();
  const pkg = location.state?.package ?? getPackageById(packageId);
  const total = pkg ? calcTotal(pkg) : 0;
  const [isInclusionOpen, setIsInclusionOpen] = useState(false);
  const [isInclusionsLoading, setIsInclusionsLoading] = useState(true);
  const [packageImages, setPackageImages] = useState([]);
  const [selectedInclusion, setSelectedInclusion] = useState(
    () => location.state?.inclusion?.image || "",
  );
  const [selectionToast, setSelectionToast] = useState(false);
  const [deliveryInformation, setDeliveryInformation] = useState(() => ({
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    ...(location.state?.deliveryInformation || {}),
  }));
  const isDeliveryInformationComplete = [
    "recipientName",
    "phone",
    "addressLine1",
    "city",
    "province",
    "postalCode",
  ].every((field) => typeof deliveryInformation[field] === "string"
    && deliveryInformation[field].trim());

  useEffect(() => {
    if (!pkg) return undefined;

    const getPackageImages = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getPackageImages",
    );
    setIsInclusionsLoading(true);
    getPackageImages()
      .then(({ data }) => {
        const uploadedImages = Array.isArray(data?.images?.[pkg.id])
          ? data.images[pkg.id]
          : [];
        const savedDetails = Array.isArray(data?.packageDetails?.[pkg.id])
          ? data.packageDetails[pkg.id]
          : [];
        setPackageImages(uploadedImages
          .map((image, index) => ({
            image,
            name: savedDetails[index]?.name || "",
            description: savedDetails[index]?.description || "",
          }))
          .filter((inclusion) => inclusion.image));
        setIsInclusionOpen(!location.state?.inclusion?.image);
      })
      .catch(() => {
        setPackageImages([]);
        setIsInclusionOpen(!location.state?.inclusion?.image);
      })
      .finally(() => setIsInclusionsLoading(false));

    return undefined;
  }, [pkg]);

  useEffect(() => {
    if (!isInclusionOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsInclusionOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isInclusionOpen]);

  if (!pkg) {
    return (
      <div className="prod-root">
        <TopBar />
        <div className="prod-shell">
          <main className="prod-main">
            <div className="prod-content">
              <div className="prod-glass-panel prod-detail-card">
                <h2 className="prod-page-title">Package not found</h2>
                <p className="prod-page-sub">That package could not be loaded. Please return to the products screen.</p>
                <Link className="prod-primary-btn" to="/products">
                  Back to products
                </Link>
              </div>
            </div>
          </main>
        </div>
        <BottomNav activeItem="products" />
      </div>
    );
  }

  return (
    <div className="prod-root">
      <TopBar />
      {selectionToast && (
        <div className="prod-selection-toast" role="status" aria-live="polite">
          Inclusion Selected
        </div>
      )}

      <div className="prod-shell">
        <main className="prod-main">
          <div className="prod-content">
            <div className="prod-detail-top-nav">
              <button
                className="prod-back-link"
                type="button"
                onClick={() => navigate("/products")}
              >
                <MdArrowBack size={18} />
                Back
              </button>
            </div>
            <div className="prod-page-header">
              <div>
                <p className="prod-page-eyebrow">Package detail</p>
                <h2 className="prod-page-title">{pkg.name}</h2>
                <p className="prod-page-sub">
                  Review the package details below and continue to the QR checkout flow.
                </p>
              </div>
            </div>

            <section className="prod-glass-panel prod-detail-card">
              <div className="prod-detail-hero">
                <img
                  className="prod-detail-image"
                  src={tierImages[pkg.tierColor]}
                  alt={`${pkg.tier} membership`}
                />
                <div className="prod-detail-image-overlay" />
                <div className="prod-detail-hero-content">
                  <span className="prod-detail-tier-pill">{pkg.tier}</span>
                  <h2>{pkg.name}</h2>
                  <p>Membership access with rewards built for your network.</p>
                </div>
              </div>

              <div className="prod-detail-summary">
                <div className="prod-detail-price-block">
                  <span className="prod-detail-label">Membership price</span>
                  <strong className="prod-detail-price">{formatCurrency(total)}</strong>
                </div>
                <div className="prod-detail-gems-block">
                  <span className="prod-detail-label">Daily cashback</span>
                  <strong>{pkg.dailyGems} GEMS</strong>
                </div>
                <button
                  className="prod-inclusion-btn"
                  type="button"
                  onClick={() => setIsInclusionOpen(true)}
                >
                  <i className="fa-brands fa-shopify" aria-hidden="true" />
                  View Inclusion
                </button>
              </div>

              <div className="prod-detail-body">
                {selectedInclusion && (
                  <div className="prod-detail-row prod-selected-inclusion">
                    <span className="prod-detail-label">Selected inclusion</span>
                    <img
                      className="prod-selected-inclusion-image"
                      src={selectedInclusion}
                      alt={`${pkg.name} selected inclusion`}
                    />
                  </div>
                )}
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Total GEM allocation</span>
                  <span className="prod-detail-value">{pkg.totalGems} GEMS</span>
                </div>
                <div className="prod-detail-row">
                  <span className="prod-detail-label">Access level</span>
                  <span className="prod-detail-value">{pkg.tier} Membership</span>
                </div>
              </div>

              <DeliveryInformationStep
                value={deliveryInformation}
                onChange={(field, value) => {
                  setDeliveryInformation((current) => ({
                    ...current,
                    [field]: value,
                  }));
                }}
              />

              <div className="prod-detail-benefits">
                <h3>Membership benefits</h3>
                <div>
                  {(pkg.features || []).map((feature) => (
                    <span key={feature}>
                      <span className="material-symbols-outlined">check_circle</span>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="prod-detail-actions">
                <div className="prod-purchase-review-wrap">
                  <button
                    className="prod-primary-btn"
                    type="button"
                    disabled={!selectedInclusion || !isDeliveryInformationComplete}
                    onClick={() => {
                      navigate(`/purchase-codes/package/${pkg.id}/checkout`, {
                        state: {
                          package: pkg,
                          inclusion: packageImages.find((item) => item.image === selectedInclusion) || null,
                          deliveryInformation: Object.fromEntries(
                            Object.entries(deliveryInformation)
                              .map(([field, value]) => [field, value.trim()]),
                          ),
                        },
                      });
                    }}
                  >
                    Proceed Purchase Review
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
      <BottomNav activeItem="products" />

      {isInclusionOpen && (
        <div
          className="prod-modal-backdrop"
          role="presentation"
        >
          <section
            className="prod-inclusion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prod-inclusion-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="prod-modal-header">
              <div>
                <p className="prod-page-eyebrow">Package inclusion</p>
                <h2 id="prod-inclusion-title">Choose one inclusion</h2>
                <p>Select the inclusion you want added to your package details.</p>
              </div>
              <button
                className="prod-modal-close"
                type="button"
                onClick={() => setIsInclusionOpen(false)}
                aria-label="Close package inclusions"
              >
                <MdClose size={21} />
              </button>
            </div>

            <div className="prod-inclusion-options">
              {isInclusionsLoading && <p className="prod-inclusion-empty">Loading uploaded inclusions...</p>}
              {!isInclusionsLoading && packageImages.length === 0 && (
                <p className="prod-inclusion-empty">No uploaded inclusions are available for this package.</p>
              )}
              {!isInclusionsLoading && packageImages.map((image, index) => (
                <button
                  className={`prod-inclusion-option${selectedInclusion === image.image ? " is-selected" : ""}`}
                  key={image.image}
                  type="button"
                  onClick={() => {
                    setSelectedInclusion(image.image);
                    setIsInclusionOpen(false);
                    setSelectionToast(true);
                    window.setTimeout(() => setSelectionToast(false), 2200);
                  }}
                  aria-label={`Select package inclusion ${index + 1}`}
                  aria-pressed={selectedInclusion === image.image}
                >
                  <img src={image.image} alt={image.name || `Package inclusion ${index + 1}`} />
                  <span className="prod-inclusion-copy">
                    <strong>{image.name || `Inclusion ${index + 1}`}</strong>
                    <span>{image.description || "No description provided."}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}