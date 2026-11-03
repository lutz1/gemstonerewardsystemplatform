import "./DeliveryInformationStep.css";

const requiredFields = [
  ["recipientName", "Recipient full name", "text", "e.g. Alex Santos"],
  ["phone", "Contact number", "tel", "e.g. 09171234567"],
  ["addressLine1", "Street address", "text", "House/building number and street"],
  ["city", "City / Municipality", "text", "City or municipality"],
  ["province", "Province", "text", "Province"],
  ["postalCode", "Postal code", "text", "Postal code"],
];

export default function DeliveryInformationStep({ value, onChange }) {
  return (
    <section className="prod-delivery-step" aria-labelledby="prod-delivery-title">
      <div className="prod-delivery-heading">
        <span className="prod-delivery-step-number" aria-hidden="true">1</span>
        <div>
          <p className="prod-detail-label">Checkout step 1 of 2</p>
          <h3 id="prod-delivery-title">Delivery Information</h3>
          <p>Enter where we should send your selected inclusion.</p>
        </div>
      </div>

      <div className="prod-delivery-fields">
        {requiredFields.map(([name, label, type, placeholder]) => (
          <label className="prod-delivery-field" htmlFor={`delivery-${name}`} key={name}>
            <span>{label} <span aria-hidden="true">*</span></span>
            <input
              id={`delivery-${name}`}
              name={name}
              type={type}
              value={value[name] || ""}
              onChange={(event) => onChange(name, event.target.value)}
              placeholder={placeholder}
              autoComplete={name === "recipientName"
                ? "name"
                : name === "phone"
                  ? "tel"
                  : name === "addressLine1"
                    ? "street-address"
                    : "off"}
              required
            />
          </label>
        ))}

        <label className="prod-delivery-field prod-delivery-field--wide" htmlFor="delivery-addressLine2">
          <span>Apartment, suite, unit, etc. <span className="prod-delivery-optional">(optional)</span></span>
          <input
            id="delivery-addressLine2"
            name="addressLine2"
            type="text"
            value={value.addressLine2 || ""}
            onChange={(event) => onChange("addressLine2", event.target.value)}
            placeholder="Additional address details"
            autoComplete="address-line2"
          />
        </label>
      </div>
    </section>
  );
}
