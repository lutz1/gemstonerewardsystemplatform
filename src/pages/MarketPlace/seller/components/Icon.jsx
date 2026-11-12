// Thin wrapper around the Material Symbols font already used across the app.
export default function Icon({ name, size = 20 }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size }}>
      {name}
    </span>
  );
}