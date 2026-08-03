export function KyvenaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Kyvena">
      <svg className="brand-mark" viewBox="0 0 56 56" role="img" aria-hidden="true">
        <path d="M16 11v34M17 28l22-17M17 28l22 17" />
        <circle cx="16" cy="11" r="5" />
        <circle cx="16" cy="28" r="5" />
        <circle cx="16" cy="45" r="5" />
        <circle cx="39" cy="11" r="5" className="accent-node" />
        <circle cx="39" cy="45" r="5" />
      </svg>
      {!compact ? <span>Kyvena</span> : null}
    </div>
  );
}
