export function KroppetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/*
        Forma original: arriba amplia con cortes de ~45°,
        abajo se estrecha en punta (cortes más pronunciados)
        Top edge: 26–74  |  Bottom edge: 42–58 (casi punta)
      */}
      <polygon
        points="26,4 74,4 96,26 96,68 58,96 42,96 4,68 4,26"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="5"
      />
      {/* K — barra vertical */}
      <line x1="33" y1="28" x2="33" y2="72" stroke="#f59e0b" strokeWidth="11" strokeLinecap="round" />
      {/* K — brazo superior */}
      <line x1="39" y1="50" x2="64" y2="28" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" />
      {/* K — brazo inferior */}
      <line x1="39" y1="50" x2="64" y2="72" stroke="#f59e0b" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
