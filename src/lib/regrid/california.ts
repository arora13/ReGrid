/** Continental California — WGS84. Used for maxBounds, draws, and relocation search. */
export const CALIFORNIA_SW: [number, number] = [-124.48, 32.53];
export const CALIFORNIA_NE: [number, number] = [-114.13, 42.01];

export const CALIFORNIA_MAX_BOUNDS: [[number, number], [number, number]] = [CALIFORNIA_SW, CALIFORNIA_NE];

export function clampLngLatToCalifornia(c: [number, number]): [number, number] {
  return [
    Math.min(Math.max(c[0], CALIFORNIA_SW[0]), CALIFORNIA_NE[0]),
    Math.min(Math.max(c[1], CALIFORNIA_SW[1]), CALIFORNIA_NE[1]),
  ];
}

/** ~55 km — keeps Optimize / copilot from jumping to unrelated metros on mock layers. */
export const LOCAL_RELOCATE_MAX_OFFSET_DEG = 0.5;
