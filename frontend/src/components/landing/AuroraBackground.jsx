import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '@/lib/theme';

/**
 * Soft, slowly-drifting "aurora" background — a handful of large blurred color
 * blobs that gently move and pulse. Decorative sibling of AnimatedHeroChart for
 * the inner pages (a calmer, symbol-free look). Same contract: aria-hidden,
 * pointer-events-none, prefers-reduced-motion aware (renders one static frame),
 * responsive via ResizeObserver, and theme-aware (additive glow on dark, faint
 * pastel tint on light so it never muddies a white background).
 *
 * Props mirror AnimatedHeroChart: `fade` ('top' | 'bottom' | 'both' | 'none'),
 * `dim` (overall intensity multiplier) and `className`.
 */

const BLOBS = [
  [34, 197, 94],   // green
  [96, 165, 250],  // blue
  [245, 158, 11],  // amber
  [167, 139, 250], // violet
  [20, 184, 166],  // teal
];

export default function AuroraBackground({ fade = 'both', dim = 1, className = '' }) {
  const canvasRef = useRef(null);
  const { theme } = useThemeStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const isDark = theme === 'light' ? false : theme === 'system' ? !prefersLight : true;
    // dark → bright additive glow; light → faint pastel tint that stays subtle on white
    const core = (isDark ? 0.20 : 0.10) * dim;

    let width = 0, height = 0, dpr = 1, raf = 0;
    const blobs = BLOBS.map((c, i) => ({
      c,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
      sx: 0.05 + Math.random() * 0.07,
      sy: 0.05 + Math.random() * 0.07,
      rr: 0.42 + Math.random() * 0.22, // radius as fraction of min(W,H)
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = isDark ? 'lighter' : 'source-over';
      const R = Math.min(width, height);
      for (const b of blobs) {
        const x = (0.5 + 0.42 * Math.sin(b.px + t * b.sx)) * width;
        const y = (0.5 + 0.42 * Math.cos(b.py + t * b.sy)) * height;
        const r = b.rr * R;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${core})`);
        g.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    let start = performance.now();
    const loop = (now) => {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) draw(3);
    else raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [theme, dim]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true" data-testid="aurora-bg">
      <canvas ref={canvasRef} className="w-full h-full" />
      {(fade === 'top' || fade === 'both') && (
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background to-transparent" />
      )}
      {(fade === 'bottom' || fade === 'both') && (
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent" />
      )}
    </div>
  );
}
