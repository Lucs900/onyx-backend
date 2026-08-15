type EquityFoxMarkProps = {
  className?: string;
  title?: string;
};

export function EquityFoxMark({
  className = 'h-9 w-9',
  title = 'ONYX Equity Fox',
}: EquityFoxMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M8 22 L20 8 L32 18 L44 8 L56 22 L50 38 C50 50 42 58 32 58 C22 58 14 50 14 38 Z"
        fill="currentColor"
      />
      <path d="M20 8 L26 22 L32 18 Z" fill="#0C0B0A" opacity="0.22" />
      <path d="M44 8 L38 22 L32 18 Z" fill="#0C0B0A" opacity="0.22" />
      <circle cx="24.5" cy="33" r="2.4" fill="#F4EFE6" />
      <circle cx="39.5" cy="33" r="2.4" fill="#F4EFE6" />
      <path
        d="M32 38 L28 44 H36 Z"
        fill="#F4EFE6"
        opacity="0.9"
      />
    </svg>
  );
}
