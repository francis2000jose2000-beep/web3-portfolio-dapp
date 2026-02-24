import { formatEther } from "viem";

export type PriceInput = {
  priceWei?: bigint;
  price?: string;
  isExternal?: boolean;
  treatZeroAsUnlisted?: boolean;
};

function parseEthString(input: string): number | null {
  const normalized = input.replace(/\s*eth\s*$/i, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function isDigitsOnly(input: string): boolean {
  return /^\d+$/.test(input);
}

export function tryParseWeiBigint(input: string | undefined | null): bigint | undefined {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return undefined;
  if (!isDigitsOnly(raw)) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

export function parseEthNumber(input: PriceInput): number | null {
  if (typeof input.priceWei === "bigint") {
    const eth = parseEthString(formatEther(input.priceWei));
    return typeof eth === "number" ? eth : null;
  }

  const raw = typeof input.price === "string" ? input.price.trim() : "";
  if (!raw) return null;

  if (isDigitsOnly(raw)) {
    try {
      const wei = BigInt(raw);
      const eth = parseEthString(formatEther(wei));
      return typeof eth === "number" ? eth : null;
    } catch {
      return null;
    }
  }

  const eth = parseEthString(raw);
  return typeof eth === "number" ? eth : null;
}

export function formatEthLabel(input: PriceInput): string {
  const formatted = formatEthForDisplay(input);
  return formatted.showUnit ? `${formatted.value} ETH` : formatted.value;
}

export function formatEthCompactLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (value > 0 && value < 0.001) return "< 0.001 ETH";
  const formatted = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
  return `${formatted} ETH`;
}

export function formatEthForDisplay(input: PriceInput): { value: string; showUnit: boolean } {
  if (typeof input.priceWei === "bigint") {
    const eth = parseEthString(formatEther(input.priceWei));
    if (eth === null) return { value: "N/A", showUnit: false };
    if (eth === 0) return input.treatZeroAsUnlisted ? { value: "Unlisted", showUnit: false } : { value: "0", showUnit: true };
    if (eth > 0 && eth < 0.001) return { value: "< 0.001", showUnit: true };
    return { value: eth.toFixed(3), showUnit: true };
  }

  const raw = typeof input.price === "string" ? input.price.trim() : "";
  if (!raw) return input.treatZeroAsUnlisted ? { value: "Unlisted", showUnit: false } : { value: "N/A", showUnit: false };

  if (isDigitsOnly(raw)) {
    try {
      const wei = BigInt(raw);
      const eth = parseEthString(formatEther(wei));
      if (eth === null) return { value: "N/A", showUnit: false };
      if (eth === 0) return input.treatZeroAsUnlisted ? { value: "Unlisted", showUnit: false } : { value: "0", showUnit: true };
      if (eth > 0 && eth < 0.001) return { value: "< 0.001", showUnit: true };
      return { value: eth.toFixed(3), showUnit: true };
    } catch {
      return { value: "N/A", showUnit: false };
    }
  }

  const eth = parseEthString(raw);
  if (eth === null) return { value: "N/A", showUnit: false };
  if (eth === 0) return input.treatZeroAsUnlisted ? { value: "Unlisted", showUnit: false } : { value: "0", showUnit: true };
  if (eth > 0 && eth < 0.001) return { value: "< 0.001", showUnit: true };
  return { value: eth.toFixed(3), showUnit: true };
}

export type SmartValuationResult = {
  value: string;
  isEstimate: boolean;
  label: string;
};

export function getSmartValuation(
  nft: {
    priceWei?: bigint;
    price?: string;
    floorPrice?: number;
    lastSale?: number;
    tokenId: string;
  },
  treatZeroAsUnlisted: boolean = true
): SmartValuationResult {
  // 1. Active Listing (Real Price)
  // We pass both priceWei and price to let formatEthForDisplay handle priority
  const priceInput = { 
    priceWei: nft.priceWei,
    price: nft.price, 
    treatZeroAsUnlisted 
  };
  const { value: priceValue } = formatEthForDisplay(priceInput);

  // If it's a valid listed price, return it
  if (priceValue !== "Unlisted" && priceValue !== "N/A" && priceValue !== "0") {
    return {
      value: priceValue,
      isEstimate: false,
      label: "Price"
    };
  }

  // 2. Alchemy Data (Floor Price or Last Sale)
  if (typeof nft.floorPrice === "number" && nft.floorPrice > 0) {
    return {
      value: nft.floorPrice.toFixed(3),
      isEstimate: true,
      label: "Price"
    };
  }

  if (typeof nft.lastSale === "number" && nft.lastSale > 0) {
    return {
      value: nft.lastSale.toFixed(3),
      isEstimate: true,
      label: "Price"
    };
  }

  // 3. Deterministic Pseudo-Random Fallback
  // Formula: (tokenId % 500) / 100 + 0.5
  // Example: 123 -> 1.73 ETH
  // We use the numeric part of tokenId. If tokenId is huge (BigInt), we use remainder.
  
  let est = 0.5;
  try {
    // Handle large tokenIds by treating them as strings or BigInts
    const bigTokenId = BigInt(nft.tokenId);
    // (tokenId % 500)
    const mod = Number(bigTokenId % 500n);
    est = (mod / 100) + 0.5;
  } catch {
    // Fallback if tokenId is not a valid integer
    est = 0.5;
  }

  return {
    value: est.toFixed(2),
    isEstimate: true,
    label: "Price"
  };
}
