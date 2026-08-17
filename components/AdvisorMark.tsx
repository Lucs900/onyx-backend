type AdvisorMarkProps = {
  size?: number | "sm";
  className?: string;
};

const SIZE_ALIASES = {
  sm: 20,
} as const;

/**
 * Geometric fox mark. Two shapes + one metal highlight.
 * No pupils, smile, wink, eyebrows, body, or expression.
 */
export function AdvisorMark({ size = 24, className }: AdvisorMarkProps) {
  const px = typeof size === "number" ? size : SIZE_ALIASES[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <polygon
        fill="currentColor"
        points="3,10 7.2,2.6 12,8.2 16.8,2.6 21,10 12,21.4"
      />
      <polygon
        className="advisor-mark__facet"
        fill="var(--metal)"
        points="12,8.2 16.8,2.6 15.1,10.1"
      />
    </svg>
  );
}
