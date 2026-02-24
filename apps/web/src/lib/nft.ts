export type NftDisplayNameInput = {
  name?: string | null;
  tokenId?: string | number | bigint | null;
  collectionName?: string | null;
};

export function getNftDisplayName(input: NftDisplayNameInput): string {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name) return name;

  const collection = typeof input.collectionName === "string" ? input.collectionName.trim() : "";

  const tokenId = (() => {
    if (typeof input.tokenId === "bigint") return input.tokenId.toString();
    if (typeof input.tokenId === "number" && Number.isFinite(input.tokenId)) return String(input.tokenId);
    if (typeof input.tokenId === "string") return input.tokenId.trim();
    return "";
  })();

  if (collection && tokenId) return `${collection} #${tokenId}`;
  if (collection) return collection;
  if (tokenId) return `Token #${tokenId}`;
  return "Untitled";
}

