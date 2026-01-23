export const generateLinearLerp: (xStart: number, xEnd: number) => (t: number) => number = (xStart: number, xEnd: number) => {
  const delta = xEnd - xStart;
  return (t: number) => xStart + t * delta;
};

export const generateParabolicLerp: (yStart: number, yEnd: number, yPeak: number) => (t: number) => number = (
  yStart: number,
  yEnd: number,
  yPeak: number
) => {
  const s = Math.sqrt((yStart - yPeak) * (yEnd - yPeak));
  const b = 2 * (yPeak - yStart - s);
  const a = yStart + yEnd - 2 * yPeak + 2 * s;
  return (t: number) => a * t * t + b * t + yStart;
};
