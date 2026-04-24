import Image from 'next/image';

/**
 * Compact AJK brand mark for headers; variant="full" renders the full logo.
 * Both variants go through next/image so the oversized source PNG is served
 * as a properly-sized WebP/AVIF at request time.
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
      />
    );
  }
  return (
    <Image
      src="/logo.svg"
      alt="AJK"
      width={64}
      height={64}
      priority={priority}
      className={className}
    />
  );
}
