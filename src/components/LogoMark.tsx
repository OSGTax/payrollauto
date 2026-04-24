/**
 * Compact AJK brand mark for headers; variant="full" renders the full logo.
 */
export function LogoMark({
  className = 'h-8 w-8',
  variant = 'mark',
}: {
  className?: string;
  variant?: 'mark' | 'full';
}) {
  const src = variant === 'full' ? '/ajk-logo.png' : '/logo.svg';
  const alt = variant === 'full' ? 'AJK Site Development Inc.' : 'AJK';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
