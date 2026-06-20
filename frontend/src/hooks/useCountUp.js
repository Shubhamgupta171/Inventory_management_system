import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 → target with an ease-out curve.
 * Respects prefers-reduced-motion (jumps straight to the value).
 */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);
  const startTs = useRef(0);

  useEffect(() => {
    const end = Number(target) || 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || end === 0) {
      setValue(end);
      return;
    }

    const tick = (ts) => {
      if (!startTs.current) startTs.current = ts;
      const progress = Math.min((ts - startTs.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(end * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setValue(end);
      }
    };

    startTs.current = 0;
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
