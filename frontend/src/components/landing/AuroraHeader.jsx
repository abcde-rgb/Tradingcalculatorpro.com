import React from 'react';
import AuroraBackground from './AuroraBackground';

/**
 * Drop-in top "aurora glow" band for inner pages. Place as the first child of a
 * `relative` page root; give the page's main content `relative z-10` so it sits
 * above the glow. Contained (h-460, self-clipping) and pointer-events-none, so it
 * never affects layout, scrolling or clicks.
 */
export default function AuroraHeader({ className = '' }) {
  return (
    <div className={`absolute top-0 inset-x-0 h-[460px] pointer-events-none ${className}`}>
      <AuroraBackground fade="bottom" dim={0.9} />
    </div>
  );
}
