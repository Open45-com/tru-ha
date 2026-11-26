// Integer trigonometry for the deterministic sim. Never use Math.sin/cos/sqrt
// in src/sim: engines may differ in the last bit, which would desync replays.
// Angles are in tenths of a degree. Results are scaled by ONE (16384).
export const ONE = 16384;

// sin(0°..90°) * 16384, rounded. Generated once and frozen.
const S = [0,286,572,857,1143,1428,1713,1997,2280,2563,2845,3126,3406,3686,3964,4240,4516,4790,5063,5334,5604,5872,6138,6402,6664,6924,7182,7438,7692,7943,8192,8438,8682,8923,9162,9397,9630,9860,10087,10311,10531,10749,10963,11174,11381,11585,11786,11982,12176,12365,12551,12733,12911,13085,13255,13421,13583,13741,13894,14044,14189,14330,14466,14598,14726,14849,14968,15082,15191,15296,15396,15491,15582,15668,15749,15826,15897,15964,16026,16083,16135,16182,16225,16262,16294,16322,16344,16362,16374,16382,16384];

function quarter(t: number): number { // t in 0..900
  const d = Math.trunc(t / 10), f = t % 10;
  return d >= 90 ? S[90] : S[d] + Math.trunc(((S[d + 1] - S[d]) * f) / 10);
}

export function sinT(t: number): number {
  t = ((t % 3600) + 3600) % 3600;
  if (t <= 900) return quarter(t);
  if (t <= 1800) return quarter(1800 - t);
  if (t <= 2700) return -quarter(t - 1800);
  return -quarter(3600 - t);
}
export const cosT = (t: number): number => sinT(t + 900);

export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let x = Math.trunc(n), y = Math.trunc((x + 1) / 2);
  while (y < x) { x = y; y = Math.trunc((x + Math.trunc(n / x)) / 2); }
  return x;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0); // integer 0..2^32-1
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}
