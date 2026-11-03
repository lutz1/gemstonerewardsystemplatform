import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MARKETPLACE_LOCATION,
  MARKETPLACE_LOCATIONS_STORAGE_KEY,
  MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY,
} from "./marketplaceData";
import "./MarketplaceSavedLocations.css";

function getDefaultLocations() {
  return [
    {
      id: "default-visayan-village",
      name: "Saved address",
      phone: "",
      address: DEFAULT_MARKETPLACE_LOCATION,
      isDefault: true,
    },
  ];
}

function readLocations() {
  const savedLocations = globalThis.localStorage.getItem(
    MARKETPLACE_LOCATIONS_STORAGE_KEY,
  );
  if (!savedLocations) return getDefaultLocations();

  try {
    const locations = JSON.parse(savedLocations);
    if (
      Array.isArray(locations) &&
      locations.every(
        (location) =>
          location &&
          typeof location.id === "string" &&
          typeof location.name === "string" &&
          typeof location.address === "string",
      )
    ) {
      return locations;
    }
    globalThis.console.error("Saved marketplace locations have an invalid format.");
  } catch (error) {
    globalThis.console.error(
      "Could not parse saved marketplace locations.",
      error,
    );
  }
  return getDefaultLocations();
}

function readSelectedLocationId(locations) {
  const selectedId = globalThis.localStorage.getItem(
    MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY,
  );
  return locations.some((location) => location.id === selectedId)
    ? selectedId
    : locations[0]?.id || "";
}

export default function MarketplaceSavedLocations({
  onClose,
  onSelectLocation,
}) {
  const [locations, setLocations] = useState(readLocations);
  const [selectedId, setSelectedId] = useState(() =>
    readSelectedLocationId(locations),
  );
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", phone: "", address: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectLocation = (location) => {
    try {
      globalThis.localStorage.setItem(
        MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY,
        location.id,
      );
      setSelectedId(location.id);
      onSelectLocation(location);
      onClose();
    } catch (error) {
      globalThis.console.error("Could not save selected marketplace location.", error);
      setErrorMessage("Unable to save this location. Please try again.");
    }
  };

  const saveNewLocation = (event) => {
    event.preventDefault();
    const location = {
      id: `marketplace-location-${Date.now()}`,
      name: newLocation.name.trim(),
      phone: newLocation.phone.trim(),
      address: newLocation.address.trim(),
      isDefault: false,
    };
    const updatedLocations = [...locations, location];

    try {
      globalThis.localStorage.setItem(
        MARKETPLACE_LOCATIONS_STORAGE_KEY,
        JSON.stringify(updatedLocations),
      );
      globalThis.localStorage.setItem(
        MARKETPLACE_SELECTED_LOCATION_STORAGE_KEY,
        location.id,
      );
      setLocations(updatedLocations);
      setSelectedId(location.id);
      setNewLocation({ name: "", phone: "", address: "" });
      setIsAddingLocation(false);
      setErrorMessage("");
      onSelectLocation(location);
    } catch (error) {
      globalThis.console.error("Could not save marketplace location.", error);
      setErrorMessage("Unable to save this address. Please try again.");
    }
  };

  return (
    <div
      className="marketplace-location-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="marketplace-location-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketplace-location-title"
      >
        <div className="marketplace-location-sheet-heading">
          <span />
          <h2 id="marketplace-location-title">
            {isAddingLocation ? "Add new address" : "Select address"}
          </h2>
          <button
            ref={closeButtonRef}
            className="marketplace-location-close"
            type="button"
            aria-label="Close saved locations"
            onClick={onClose}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {errorMessage && (
          <p className="marketplace-location-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isAddingLocation ? (
          <form
            className="marketplace-location-form"
            onSubmit={saveNewLocation}
          >
            <label>
              Recipient name
              <input
                autoComplete="name"
                required
                value={newLocation.name}
                onChange={(event) =>
                  setNewLocation({ ...newLocation, name: event.target.value })
                }
              />
            </label>
            <label>
              Phone number <span>(optional)</span>
              <input
                autoComplete="tel"
                type="tel"
                value={newLocation.phone}
                onChange={(event) =>
                  setNewLocation({ ...newLocation, phone: event.target.value })
                }
              />
            </label>
            <label>
              Full address
              <textarea
                autoComplete="street-address"
                required
                rows="3"
                value={newLocation.address}
                onChange={(event) =>
                  setNewLocation({ ...newLocation, address: event.target.value })
                }
              />
            </label>
            <button
              className="marketplace-location-add-button"
              type="submit"
            >
              Save address
            </button>
            <button
              className="marketplace-location-cancel"
              type="button"
              onClick={() => setIsAddingLocation(false)}
            >
              Back to saved addresses
            </button>
          </form>
        ) : (
          <>
            <div className="marketplace-location-list">
              {locations.map((location) => (
                <button
                  className="marketplace-location-option"
                  key={location.id}
                  type="button"
                  aria-pressed={selectedId === location.id}
                  onClick={() => selectLocation(location)}
                >
                  <span className="marketplace-location-option-copy">
                    <strong>{location.name}</strong>
                    {location.phone && <span>{location.phone}</span>}
                    <span>{location.address}</span>
                    {location.isDefault && (
                      <span className="marketplace-location-default">
                        Default
                      </span>
                    )}
                  </span>
                  <span
                    className={`marketplace-location-radio${selectedId === location.id ? " is-selected" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <div className="marketplace-location-sheet-footer">
              <button
                className="marketplace-location-add-button"
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setIsAddingLocation(true);
                }}
              >
                Add new address
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
