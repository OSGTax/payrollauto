/**
 * Reads /public/logo.svg — drop the real company logo there.
 * A placeholder is shipped in the repo so the app looks complete out of the box.
 */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="Logo" className={className} />;
}
