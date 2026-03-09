export function getChainDisplayName(input: {
  chainId?: number;
  contractAddress?: string;
  externalUrl?: string;
}): string {
  const ca = typeof input.contractAddress === "string" ? input.contractAddress.trim().toLowerCase() : "";
  const url = typeof input.externalUrl === "string" ? input.externalUrl.trim().toLowerCase() : "";

  if (typeof input.chainId === "number") {
    if (input.chainId === 1) return "Ethereum";
    if (input.chainId === 137) return "Polygon";
    return `Chain ${input.chainId}`;
  }

  if (ca === "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb") return "Ethereum";
  if (url.includes("/matic/") || url.includes("polygonscan.com")) return "Polygon";

  return "Unknown";
}

