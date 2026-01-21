// --- helpers ---
function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// linear -> sRGB (0..1)
function linearToSrgb(u: number) {
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
}

// sRGB8 -> linear (LUT: super fast)
const SRGB8_TO_LINEAR = (() => {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const u = i / 255;
    lut[i] = u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  }
  return lut;
})();

export function createColorLerper(fromHex: number, toHex: number): (t: number) => number {
  const fr = (fromHex >>> 16) & 255,
    fg = (fromHex >>> 8) & 255,
    fb = fromHex & 255;
  const tr = (toHex >>> 16) & 255,
    tg = (toHex >>> 8) & 255,
    tb = toHex & 255;

  const frL = SRGB8_TO_LINEAR[fr],
    fgL = SRGB8_TO_LINEAR[fg],
    fbL = SRGB8_TO_LINEAR[fb];
  const trL = SRGB8_TO_LINEAR[tr],
    tgL = SRGB8_TO_LINEAR[tg],
    tbL = SRGB8_TO_LINEAR[tb];

  return function tintAt(t) {
    t = clamp01(t);

    const rL = lerp(frL, trL, t);
    const gL = lerp(fgL, tgL, t);
    const bL = lerp(fbL, tbL, t);

    const r = (linearToSrgb(rL) * 255 + 0.5) | 0;
    const g = (linearToSrgb(gL) * 255 + 0.5) | 0;
    const b = (linearToSrgb(bL) * 255 + 0.5) | 0;

    return (r << 16) | (g << 8) | b;
  };
}
