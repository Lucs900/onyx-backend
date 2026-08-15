import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'cream';

const variants: Record<Variant, string> = {
  primary:
    'bg-fox-500 text-cream-50 hover:bg-fox-400 focus-visible:outline-fox-300',
  secondary:
    'bg-onyx text-cream-50 hover:bg-onyx-700 focus-visible:outline-cream-200',
  ghost:
    'bg-transparent text-cream-50 ring-1 ring-cream-200/30 hover:bg-white/5 focus-visible:outline-cream-200',
  cream:
    'bg-cream-100 text-onyx hover:bg-white focus-visible:outline-fox-400',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
} & (
  | ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)
  | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
);

export function Button({
  children,
  className = '',
  variant = 'primary',
  href,
  ...props
}: ButtonProps) {
  const classes = `${baseClass} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
