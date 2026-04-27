import Image from 'next/image';

/**
 * Compact AJK brand mark for headers; variant="full" renders the full logo.
 *
 * The full PNG goes through next/image so the oversized source is served as
 * a right-sized WebP/AVIF. The compact mark is an SVG and ships as-is via
 * a plain <img> — Next's image optimizer rejects SVGs by default
 * (`dangerouslyAllowSVG`) and they don't benefit from optimization anyway.
 */
export function LogoMark({
  className = 'h-8 w-8',
  variant = 'mark',
  priority = false,
}: {
  className?: string;
  variant?: 'mark' | 'full';
  priority?: boolean;
}) {
  if (variant === 'full') {
    return (
      <Image
        src="/ajk-logo.png"
        alt="AJK Site Development Inc."
        width={1536}
        height={1024}
        priority={priority}
        sizes="(max-width: 640px) 280px, 320px"
        className={className}
        style={{ width: 'auto', height: 'auto' }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="AJK" className={className} />;
}
