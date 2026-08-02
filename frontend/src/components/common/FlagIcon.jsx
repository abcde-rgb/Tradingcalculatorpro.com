import React from 'react';

/**
 * FlagIcon — country/region flags as inline SVG.
 *
 * Why not emoji: Windows ships no glyphs for regional-indicator pairs, so
 * `🇪🇸` renders as the letters "ES" in Chrome/Edge on Windows — which is most
 * of a finance site's desktop traffic. These draw identically everywhere and
 * cost nothing (no network, no font).
 *
 * Aspect ratio is 3:2 (24×16). Shapes are deliberately simplified: they must
 * read at 16-20px, not win a vexillology prize.
 */

const R = (props) => <rect {...props} />;

const FLAGS = {
  es: (
    <>
      <R width="24" height="16" fill="#c60b1e" />
      <R y="4" width="24" height="8" fill="#ffc400" />
    </>
  ),
  gb: (
    <>
      <R width="24" height="16" fill="#012169" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.8" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.2" />
      <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="3" />
    </>
  ),
  us: (
    <>
      <R width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => (
        <R key={y} y={y * (16 / 13)} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <R width="10" height={16 * (7 / 13)} fill="#3c3b6e" />
      {[1.4, 4.2, 7].map((y) =>
        [1.2, 3.4, 5.6, 7.8].map((x) => (
          <circle key={`${x}-${y}`} cx={x + 0.6} cy={y} r="0.55" fill="#fff" />
        ))
      )}
    </>
  ),
  de: (
    <>
      <R width="24" height="16" fill="#000" />
      <R y="5.33" width="24" height="5.34" fill="#dd0000" />
      <R y="10.67" width="24" height="5.33" fill="#ffce00" />
    </>
  ),
  fr: (
    <>
      <R width="24" height="16" fill="#fff" />
      <R width="8" height="16" fill="#002395" />
      <R x="16" width="8" height="16" fill="#ed2939" />
    </>
  ),
  ru: (
    <>
      <R width="24" height="16" fill="#fff" />
      <R y="5.33" width="24" height="5.34" fill="#0039a6" />
      <R y="10.67" width="24" height="5.33" fill="#d52b1e" />
    </>
  ),
  cn: (
    <>
      <R width="24" height="16" fill="#de2910" />
      <path d="M4 2.2l.75 2.3-1.96-1.42h2.42L3.25 4.5z" fill="#ffde00" />
      {[[8, 1.6], [9.6, 3.2], [9.6, 5.6], [8, 7.2]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y}l.35 1.07-.91-.66h1.12l-.91.66z`} fill="#ffde00" />
      ))}
    </>
  ),
  jp: (
    <>
      <R width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.8" fill="#bc002d" />
    </>
  ),
  sa: (
    <>
      <R width="24" height="16" fill="#006c35" />
      <R x="4" y="6.2" width="16" height="1.5" rx="0.4" fill="#fff" />
      <R x="6" y="9.4" width="12" height="1.2" rx="0.3" fill="#fff" />
    </>
  ),
  eu: (
    <>
      <R width="24" height="16" fill="#003399" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <circle key={i} cx={12 + 4.6 * Math.sin(a)} cy={8 - 4.6 * Math.cos(a)} r="0.72" fill="#ffcc00" />
        );
      })}
    </>
  ),
  ch: (
    <>
      <R width="24" height="16" fill="#d52b1e" />
      <R x="10.6" y="3.6" width="2.8" height="8.8" fill="#fff" />
      <R x="7.6" y="6.6" width="8.8" height="2.8" fill="#fff" />
    </>
  ),
  ca: (
    <>
      <R width="24" height="16" fill="#fff" />
      <R width="6" height="16" fill="#d52b1e" />
      <R x="18" width="6" height="16" fill="#d52b1e" />
      <path d="M12 3.4l1 2.2 2-.6-.8 2.3 1.6.5-2.2 1.6.5 1.5-2.1-.5v2h-.1v-2l-2.1.5.5-1.5L8.1 7.8l1.6-.5-.8-2.3 2 .6z" fill="#d52b1e" />
    </>
  ),
  au: (
    <>
      <R width="24" height="16" fill="#012169" />
      <R width="11" height="8" fill="#012169" />
      <path d="M0 0l11 8M11 0L0 8" stroke="#fff" strokeWidth="1.6" />
      <path d="M5.5 0v8M0 4h11" stroke="#fff" strokeWidth="2.6" />
      <path d="M5.5 0v8M0 4h11" stroke="#c8102e" strokeWidth="1.4" />
      <circle cx="5.5" cy="12.4" r="1.5" fill="#fff" />
      {[[16, 4], [19.5, 7], [16.5, 11], [21, 12], [19, 2.6]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.75" fill="#fff" />
      ))}
    </>
  ),
  nz: (
    <>
      <R width="24" height="16" fill="#012169" />
      <path d="M0 0l11 8M11 0L0 8" stroke="#fff" strokeWidth="1.6" />
      <path d="M5.5 0v8M0 4h11" stroke="#fff" strokeWidth="2.6" />
      <path d="M5.5 0v8M0 4h11" stroke="#c8102e" strokeWidth="1.4" />
      {[[17, 4], [20, 7.5], [17.5, 11.5], [15.5, 8]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.85" fill="#c8102e" stroke="#fff" strokeWidth="0.35" />
      ))}
    </>
  ),
  br: (
    <>
      <R width="24" height="16" fill="#009b3a" />
      <path d="M12 1.6L22.4 8 12 14.4 1.6 8z" fill="#fedf00" />
      <circle cx="12" cy="8" r="3.4" fill="#002776" />
    </>
  ),
  in: (
    <>
      <R width="24" height="16" fill="#fff" />
      <R width="24" height="5.33" fill="#ff9933" />
      <R y="10.67" width="24" height="5.33" fill="#138808" />
      <circle cx="12" cy="8" r="2" fill="none" stroke="#000080" strokeWidth="0.6" />
    </>
  ),
  mx: (
    <>
      <R width="24" height="16" fill="#fff" />
      <R width="8" height="16" fill="#006847" />
      <R x="16" width="8" height="16" fill="#ce1126" />
      <circle cx="12" cy="8" r="1.9" fill="none" stroke="#8a5c2e" strokeWidth="0.8" />
    </>
  ),
  za: (
    <>
      <R width="24" height="16" fill="#002395" />
      <R width="24" height="8" fill="#de3831" />
      <path d="M0 0l9 8-9 8z" fill="#007a4d" />
      <path d="M0 0l9 8-9 8" fill="none" stroke="#fff" strokeWidth="1.6" />
    </>
  ),
  tr: (
    <>
      <R width="24" height="16" fill="#e30a17" />
      <circle cx="9.5" cy="8" r="3.4" fill="#fff" />
      <circle cx="10.9" cy="8" r="2.7" fill="#e30a17" />
      <path d="M14.2 8l2.6-.85-1.6 2.2V7.05l1.6 2.2z" fill="#fff" />
    </>
  ),
  kr: (
    <>
      <R width="24" height="16" fill="#fff" />
      <path d="M12 4.6a3.4 3.4 0 000 6.8 1.7 1.7 0 000-3.4 1.7 1.7 0 010-3.4z" fill="#cd2e3a" />
      <path d="M12 4.6a3.4 3.4 0 010 6.8 1.7 1.7 0 010-3.4 1.7 1.7 0 001.7-1.7A1.7 1.7 0 0012 4.6z" fill="#0047a0" />
    </>
  ),
  pt: (
    <>
      <R width="24" height="16" fill="#da291c" />
      <R width="9.6" height="16" fill="#046a38" />
      <circle cx="9.6" cy="8" r="3.1" fill="#ffe900" stroke="#ffe900" strokeWidth="0.4" />
      <circle cx="9.6" cy="8" r="2.2" fill="#fff" stroke="#da291c" strokeWidth="0.7" />
      <R x="8.5" y="6.9" width="2.2" height="2.2" rx="0.3" fill="#046a38" />
    </>
  ),
  it: (
    <>
      <R width="24" height="16" fill="#fff" />
      <R width="8" height="16" fill="#008c45" />
      <R x="16" width="8" height="16" fill="#cd212a" />
    </>
  ),
  // Region / catch-all buckets used by the macro calendar
  world: (
    <>
      <R width="24" height="16" fill="#1e293b" />
      <circle cx="12" cy="8" r="5" fill="none" stroke="#94a3b8" strokeWidth="1" />
      <path d="M7 8h10M12 3v10M9 8a6 6 0 016 0M9 8a6 6 0 006 0" fill="none" stroke="#94a3b8" strokeWidth="0.7" />
    </>
  ),
};

// Language code → flag code (a language is not a country).
export const LOCALE_FLAG = {
  es: 'es', en: 'gb', de: 'de', fr: 'fr', ru: 'ru', zh: 'cn', ja: 'jp', ar: 'sa',
  pt: 'pt', it: 'it',
};

export function FlagIcon({ code, className = 'w-5 h-[13px]', title, ...rest }) {
  const key = String(code || '').toLowerCase();
  const shape = FLAGS[key] || FLAGS.world;
  return (
    <svg
      viewBox="0 0 24 16"
      className={`inline-block shrink-0 rounded-[2px] ring-1 ring-black/10 dark:ring-white/15 ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      {...rest}
    >
      {title && <title>{title}</title>}
      {shape}
    </svg>
  );
}

export default FlagIcon;
