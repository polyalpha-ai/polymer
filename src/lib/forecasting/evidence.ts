import { Evidence } from "./types";
import { clamp } from "./math";

export const TYPE_CAPS: Record<Evidence["type"], number> = { A: 1.0, B: 0.6, C: 0.3, D: 0.2 };
export const WEIGHTS = { v: 0.5, r: 0.3, u: 0.2 } as const;
export const FIRST_REPORT_PENALTY = 0.5;

export function rFromCorroborations(k: number, k0 = 1.0) {
  return 1 - Math.exp(-k0 * Math.max(0, k));
}

export function evidenceLogLR(e: Evidence): number {
  if (typeof e.logLRHint === "number") return e.logLRHint;
  const c = TYPE_CAPS[e.type];
  const ver = clamp(e.verifiability, 0, 1);
  const cons = clamp(e.consistency, 0, 1);
  const r = rFromCorroborations(e.corroborationsIndep);
  let val = e.polarity * c * (WEIGHTS.v*ver + WEIGHTS.r*r + WEIGHTS.u*cons);
  if (e.firstReport) val *= FIRST_REPORT_PENALTY;
  return clamp(val, -c, c);
}
