import { useEffect, useState } from 'react';

/** Below this, a screen counts as "mobile" for text-sizing purposes --
 *  Tailwind's own `md` breakpoint, so it lines up with any DOM styling. */
const MOBILE_QUERY = '(max-width: 768px)';

/**
 * True on phone-sized viewports. Tracks the media query live (rotation,
 * window resize) rather than reading it once, since this scene never
 * remounts across a resize the way a page navigation would.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
