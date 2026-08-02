import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Hook for responsive mobile-vs-desktop rendering decisions.
//
// Exports:
// - useIsMobile: reactive boolean, true when the viewport is narrower than
//   MOBILE_BREAKPOINT (updates on resize via matchMedia).
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
