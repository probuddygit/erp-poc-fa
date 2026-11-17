type SanovaLogoProps = { iconOnly?: boolean; className?: string };

/** Theme-aware wordmark shared by the navigation and sign-in screen. */
export function SanovaLogo({ iconOnly = false, className = "" }: SanovaLogoProps) {
  return (
    <span role="img" aria-label="Sanova ERP" className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 shrink-0 text-primary">
        <rect x="1" y="1" width="38" height="38" rx="8" fill="currentColor" fillOpacity="0.14" />
        <path d="M29 11H16a6 6 0 0 0 0 12h8a3 3 0 0 1 0 6H11M11 29l-4-4m22-14 4 4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!iconOnly && <span className="font-display text-lg font-semibold leading-tight text-foreground">Sanova <span className="text-primary">ERP</span></span>}
    </span>
  );
}