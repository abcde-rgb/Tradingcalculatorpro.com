import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '@/lib/theme';

/**
 * Animated, mouse-reactive candlestick chart for the landing hero.
 *
 * A <canvas> layer that continuously streams candlesticks (random-walk price)
 * scrolling right→left, with a soft area fill under the closes and a crosshair
 * that follows the cursor and highlights the candle beneath it. Decorative
 * (aria-hidden, pointer-events-none) so it never blocks the CTAs, and it fully
 * respects prefers-reduced-motion (renders a single static frame instead).
 *
 * Kept subtle (low alpha + a top fade) so the headline stays perfectly legible.
 */

const GREEN = [34, 197, 94];   // #22c55e
const RED = [239, 68, 68];     // #ef4444

// Escala vertical mínima (px por unidad de precio). En contenedores bajos evita
// que ajustar todo el rango a la altura encoja las velas hasta parecer rayitas.
const MIN_PX_PER_PRICE_UNIT = 8;

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function AnimatedHeroChart({ fade = 'top', dim = 1, className = '' }) {
  const canvasRef = useRef(null);
  const { theme } = useThemeStore();
  const mouse = useRef({ x: -1, y: -1, inside: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // light theme → gentler so it doesn't muddy the white background.
    // 'system' resolves to the OS preference, not a blanket "dark".
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const isDark = theme === 'light' ? false : theme === 'system' ? !prefersLight : true;
    const alpha = (isDark ? 1 : 0.7) * dim;

    const CW = 15;           // candle slot width (px)
    let candles = [];        // {o,h,l,c}
    let width = 0, height = 0, dpr = 1, canvasLeft = 0;
    let scroll = 0;          // sub-pixel scroll offset
    let price = 100, trend = 0;
    let raf = 0;

    const nextCandle = () => {
      // random walk with slowly drifting trend for a lifelike tape
      trend += (Math.random() - 0.5) * 0.4;
      trend = Math.max(-1.2, Math.min(1.2, trend));
      const o = price;
      const move = trend + (Math.random() - 0.5) * 3.2;
      const c = o + move;
      const h = Math.max(o, c) + Math.random() * 1.8;
      const l = Math.min(o, c) - Math.random() * 1.8;
      price = c;
      // gently mean-revert so it stays on-screen
      if (price > 130) trend -= 0.5;
      if (price < 70) trend += 0.5;
      return { o, h, l, c };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height; canvasLeft = rect.left;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const need = Math.ceil(width / CW) + 3;
      while (candles.length < need) candles.push(nextCandle());
      if (candles.length > need + 4) candles = candles.slice(-need);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (!candles.length) return;

      // price → y mapping from the visible window
      let min = Infinity, max = -Infinity;
      for (const k of candles) { if (k.l < min) min = k.l; if (k.h > max) max = k.h; }
      const pad = (max - min) * 0.12 || 1;
      min -= pad; max += pad;
      const padY = height * 0.14;
      // Escala centrada en el rango con mínimo garantizado; lo que sobre se
      // recorta por los bordes, como en un gráfico real.
      const fitScale = (height - padY * 2) / (max - min);
      const scale = Math.max(fitScale, MIN_PX_PER_PRICE_UNIT);
      const mid = (min + max) / 2;
      const y = (p) => height / 2 - (p - mid) * scale;

      const baseX = -scroll;

      // soft area fill under the closes
      ctx.beginPath();
      ctx.moveTo(baseX, height);
      candles.forEach((k, i) => ctx.lineTo(baseX + i * CW + CW / 2, y(k.c)));
      ctx.lineTo(baseX + (candles.length - 1) * CW + CW / 2, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, rgba(GREEN, 0.10 * alpha));
      grad.addColorStop(1, rgba(GREEN, 0));
      ctx.fillStyle = grad;
      ctx.fill();

      // crosshair target (mouse relative to canvas; canvasLeft cached in resize
      // to avoid a layout-forcing getBoundingClientRect every frame)
      const mx = mouse.current.inside ? mouse.current.x - canvasLeft : -1;
      let hot = -1;
      if (mx >= 0 && mx <= width) hot = Math.round((mx - baseX - CW / 2) / CW);

      // candles
      candles.forEach((k, i) => {
        const cx = baseX + i * CW + CW / 2;
        if (cx < -CW || cx > width + CW) return;
        const up = k.c >= k.o;
        const col = up ? GREEN : RED;
        const isHot = i === hot;
        const a = (isHot ? 0.95 : 0.42) * alpha;
        ctx.strokeStyle = rgba(col, a);
        ctx.fillStyle = rgba(col, a);
        ctx.lineWidth = 1.4;
        // wick
        ctx.beginPath();
        ctx.moveTo(cx, y(k.h)); ctx.lineTo(cx, y(k.l)); ctx.stroke();
        // body
        const top = y(Math.max(k.o, k.c));
        const bh = Math.max(Math.abs(y(k.o) - y(k.c)), 1.5);
        ctx.fillRect(cx - CW * 0.32, top, CW * 0.64, bh);
      });

      // crosshair line + price dot
      if (hot >= 0 && hot < candles.length) {
        const k = candles[hot];
        const cx = baseX + hot * CW + CW / 2;
        ctx.strokeStyle = rgba([148, 163, 184], 0.5 * alpha);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.stroke();
        ctx.setLineDash([]);
        const col = k.c >= k.o ? GREEN : RED;
        ctx.fillStyle = rgba(col, 0.95 * alpha);
        ctx.beginPath(); ctx.arc(cx, y(k.c), 3, 0, Math.PI * 2); ctx.fill();
      }
    };

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(now - last, 60); last = now;
      scroll += (dt / 1000) * CW * 0.9; // ~0.9 candle/sec
      while (scroll >= CW) { scroll -= CW; candles.push(nextCandle()); candles.shift(); }
      draw();
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) { draw(); }
    else { raf = requestAnimationFrame(loop); }

    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY, inside: true }; };
    // mouseleave on the document root fires only when the pointer actually
    // leaves the window — unlike bubbling 'mouseout', which flips off on every
    // element boundary and made the crosshair flicker.
    const onLeave = () => { mouse.current.inside = false; };
    const root = document.documentElement;
    window.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      ro.disconnect();
    };
  }, [theme, dim]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true" data-testid="hero-chart">
      {/*
        El gráfico es AMBIENTE, no contenido: su trabajo es insinuar de qué va
        esto, no que nadie lo lea. Iba al 100 % de opacidad y competía de tú a
        tú con el titular — el ojo no sabía dónde posarse, y unas velas nítidas
        detrás de un texto es justo lo que hace que una portada parezca un
        montaje sobre una foto de stock.

        Dos correcciones:
          · opacidad al 25 %, para que quede como una marca de agua.
          · máscara radial que lo desvanece por el centro, precisamente donde
            va el texto. Así el contraste del titular no depende de la suerte
            de qué vela le toque detrás.
      */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 20%, black 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 20%, black 75%)',
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      {/* fade the top so the headline stays crisp */}
      {(fade === 'top' || fade === 'both') && (
        <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-background via-background/70 to-transparent" />
      )}
      {/* fade the bottom so the chart blends into the content below (contained band) */}
      {fade === 'both' && (
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent" />
      )}
    </div>
  );
}
