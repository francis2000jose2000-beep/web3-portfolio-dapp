export function normalizeDecimalInput(raw: string): string {
  const compact = raw.replace(/\s+/g, "");
  const normalized = compact.replace(/,/g, ".");

  let out = "";
  let seenDot = false;

  for (const ch of normalized) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (ch === "." && !seenDot) {
      out += ".";
      seenDot = true;
    }
  }

  return out;
}

export const PRICE_FILTER_MIN_ETH = 0.001;
export const PRICE_FILTER_MAX_ETH = 99999.999;

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
