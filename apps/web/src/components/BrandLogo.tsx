'use client';

import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  variant?: 'full' | 'compact' | 'mark';
  className?: string;
  /** Invert treatment for dark teal headers */
  onDark?: boolean;
};

/**
 * Official Fishmaster Limited mark from brand/logo assets.
 * full = wordmark + fish; compact = same asset smaller; mark = fish-forward crop via height.
 */
export function BrandLogo({ href = '/', variant = 'full', className, onDark = false }: BrandLogoProps) {
  const src = variant === 'compact' ? '/brand/logo-compact.png' : '/brand/logo.png';
  const height = variant === 'mark' ? 36 : variant === 'compact' ? 40 : 52;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Fishmaster Limited"
      height={height}
      style={{
        height,
        width: 'auto',
        maxWidth: variant === 'full' ? 220 : variant === 'compact' ? 168 : 120,
        display: 'block',
        objectFit: 'contain',
        // Soft plate on dark nav so the white-backed logo reads cleanly
        background: onDark ? 'rgba(255,255,255,0.96)' : 'transparent',
        borderRadius: onDark ? 10 : 0,
        padding: onDark ? '4px 8px' : 0,
      }}
    />
  );

  if (!href) {
    return <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>{img}</span>;
  }

  return (
    <Link
      href={href}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
      aria-label="Fishmaster home"
    >
      {img}
    </Link>
  );
}
