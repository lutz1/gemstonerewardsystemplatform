import { getFunctions, httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { MdCloudUpload, MdDelete, MdInventory2, MdSave } from "react-icons/md";
import BottomNav from "../../../components/BottomNavigationBar/BottomNav";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import TopBar from "../../../components/TopBar/TopBar";
import { app, storage } from "../../../firebase";
import { packages } from "../../../utils/PackagesData";
import "./AdminPackagesPage.css";

const IMAGE_SLOT_COUNT = 6;
const emptyImages = packages.reduce((result, product) => {
  result[product.id] = Array(IMAGE_SLOT_COUNT).fill("");
  return result;
}, {});
const emptyPackageDetails = packages.reduce((result, product) => {
  result[product.id] = Array.from({ length: IMAGE_SLOT_COUNT }, () => ({
    name: "",
    description: "",
  }));
  return result;
}, {});

function normalizeImages(images) {
  return packages.reduce((result, product) => {
    const savedImages = Array.isArray(images?.[product.id]) ? images[product.id] : [];
    result[product.id] = Array.from({ length: IMAGE_SLOT_COUNT }, (_, index) => savedImages[index] || "");
    return result;
  }, {});
}

function normalizePackageDetails(details) {
  return packages.reduce((result, product) => {
    const savedDetails = Array.isArray(details?.[product.id]) ? details[product.id] : [];
    result[product.id] = Array.from({ length: IMAGE_SLOT_COUNT }, (_, index) => ({
      name: typeof savedDetails[index]?.name === "string" ? savedDetails[index].name : "",
      description: typeof savedDetails[index]?.description === "string" ? savedDetails[index].description : "",
    }));
    return result;
  }, {});
}

function updatePackageDetail(current, productId, slot, field, value) {
  const productDetails = Array.isArray(current[productId])
    ? current[productId]
    : emptyPackageDetails[productId];

  return {
    ...current,
    [productId]: productDetails.map((item, index) =>
      index === slot ? { ...item, [field]: value } : item,
    ),
  };
}

export default function AdminPackagesPage() {
  const [images, setImages] = useState(emptyImages);
  const [packageDetails, setPackageDetails] = useState(emptyPackageDetails);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState("");
  const [savingSlot, setSavingSlot] = useState("");
  const [uploadPreviews, setUploadPreviews] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const inputRefs = useRef({});

  useEffect(() => {
    const getAdminPackages = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getAdminPackages",
    );

    getAdminPackages()
      .then(({ data }) => {
        setImages(normalizeImages(data?.images));
        setPackageDetails(normalizePackageDetails(data?.packageDetails));
      })
      .catch(() => setError("Unable to load package images."))
      .finally(() => setIsLoading(false));
  }, []);

  const saveImages = async (nextImages, nextPackageDetails = packageDetails) => {
    const saveAdminPackageImages = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "saveAdminPackageImages",
    );
    await saveAdminPackageImages({ images: nextImages, packageDetails: nextPackageDetails });
  };

  const handleUpload = async (product, slot, event) => {
    const details = packageDetails[product.id]?.[slot];
    if (!details?.name.trim() || !details?.description.trim()) {
      setError("Product Name and Description are required before uploading an image.");
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const slotKey = `${product.id}-${slot}`;
    const previewUrl = URL.createObjectURL(file);
    setUploadingSlot(slotKey);
    setUploadPreviews((current) => ({ ...current, [slotKey]: previewUrl }));
    setUploadProgress((current) => ({ ...current, [slotKey]: 0 }));
    setStatus("");
    setError("");

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const imageRef = ref(
        storage,
        `package-images/${product.id}/image-${slot + 1}-${Date.now()}.${fileExtension}`,
      );
      await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(imageRef, file, { contentType: file.type });
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress((current) => ({ ...current, [slotKey]: progress }));
          },
          reject,
          resolve,
        );
      });
      const downloadUrl = await getDownloadURL(imageRef);
      const nextImages = {
        ...images,
        [product.id]: images[product.id].map((image, index) =>
          index === slot ? downloadUrl : image,
        ),
      };
      setImages(nextImages);
      await saveImages(nextImages);
      setStatus(`${details.name.trim()} image ${slot + 1} uploaded.`);
    } catch (uploadError) {
      setError(uploadError?.message || "Image upload failed.");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadPreviews((current) => {
        const next = { ...current };
        delete next[slotKey];
        return next;
      });
      setUploadProgress((current) => {
        const next = { ...current };
        delete next[slotKey];
        return next;
      });
      setUploadingSlot("");
    }
  };

  const handleRemove = async (product, slot) => {
    const nextImages = {
      ...images,
      [product.id]: images[product.id].map((image, index) =>
        index === slot ? "" : image,
      ),
    };
    setStatus("");
    setError("");
    try {
      await saveImages(nextImages);
      setImages(nextImages);
      setStatus(`${product.name} image ${slot + 1} removed.`);
    } catch (saveError) {
      setError(saveError?.message || "Unable to remove the image.");
    }
  };

  const handleSaveDetails = async (product, slot) => {
    const slotKey = `${product.id}-${slot}`;
    const details = packageDetails[product.id]?.[slot];
    if (!details?.name.trim() || !details?.description.trim()) {
      setError("Product Name and Description are required before saving.");
      return;
    }

    setSavingSlot(slotKey);
    setStatus("");
    setError("");
    try {
      await saveImages(images);
      setStatus(`${details.name.trim()} details ${images[product.id][slot] ? "updated" : "saved"}.`);
    } catch (saveError) {
      setError(saveError?.message || "Unable to save product details.");
    } finally {
      setSavingSlot("");
    }
  };

  return (
    <div className="admin-packages-root">
      <TopBar userName="Admin" userRole="Administrator" profilePath="/admin/profile" />
      <main className="admin-packages-main">
        <header className="admin-packages-header">
          <div>
            <p className="admin-packages-eyebrow">Catalog management</p>
            <h1>Manage Packages</h1>
            <p>Upload up to six product images for each membership package.</p>
          </div>
          <MdInventory2 aria-hidden="true" />
        </header>

        {status && <p className="admin-packages-status">{status}</p>}
        {error && <p className="admin-packages-error" role="alert">{error}</p>}

        {isLoading ? (
          <LoadingScreen label="Loading package images..." />
        ) : (
          <section className="admin-package-grid">
            {packages.map((product) => (
              <article className="admin-package-panel" key={product.id}>
                <div className="admin-package-panel-header">
                  <div>
                    <span>{product.tier}</span>
                    <h2>{product.name}</h2>
                  </div>
                  <strong>₱{product.price.toLocaleString("en-PH")}</strong>
                </div>
                <div className="admin-package-slots">
                  {images[product.id].map((image, slot) => {
                    const slotKey = `${product.id}-${slot}`;
                    const displayedImage = uploadPreviews[slotKey] || image;
                    const details = packageDetails[product.id]?.[slot] || { name: "", description: "" };
                    return (
                      <div className="admin-package-slot" key={slotKey}>
                        <div className="admin-package-details-form">
                          <label>
                            Product Name
                            <input
                              type="text"
                              value={details.name}
                              onChange={(event) => setPackageDetails((current) =>
                                updatePackageDetail(current, product.id, slot, "name", event.target.value)
                              )}
                              placeholder="Enter product name"
                            />
                          </label>
                          <label>
                            Description
                            <textarea
                              value={details.description}
                              onChange={(event) => setPackageDetails((current) =>
                                updatePackageDetail(current, product.id, slot, "description", event.target.value)
                              )}
                              placeholder="Enter product description"
                              rows="3"
                            />
                          </label>
                        </div>
                        {displayedImage ? (
                          <div className="admin-package-image-wrap">
                            <img src={displayedImage} alt={`${product.name} product ${slot + 1}`} />
                            {uploadingSlot === slotKey && (
                              <span className="admin-package-upload-progress">
                                {uploadProgress[slotKey] ?? 0}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="admin-package-slot-empty">
                            <MdCloudUpload aria-hidden="true" />
                            <span>Image {slot + 1}</span>
                          </div>
                        )}
                        <div className="admin-package-slot-actions">
                          <button
                            type="button"
                            onClick={() => inputRefs.current[slotKey]?.click()}
                            disabled={uploadingSlot === slotKey || !details.name.trim() || !details.description.trim()}
                          >
                            <MdCloudUpload aria-hidden="true" />
                            {uploadingSlot === slotKey ? "Uploading..." : image ? "Replace" : "Upload"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveDetails(product, slot)}
                            disabled={uploadingSlot === slotKey || savingSlot === slotKey || !details.name.trim() || !details.description.trim()}
                          >
                            <MdSave aria-hidden="true" />
                            {savingSlot === slotKey ? "Saving..." : image ? "Update" : "Save"}
                          </button>
                          {image && (
                            <button type="button" onClick={() => handleRemove(product, slot)}>
                              <MdDelete aria-hidden="true" />
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          ref={(element) => { inputRefs.current[slotKey] = element; }}
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleUpload(product, slot, event)}
                          hidden
                        />
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      <BottomNav activeItem="packages" variant="admin" />
    </div>
  );
}
