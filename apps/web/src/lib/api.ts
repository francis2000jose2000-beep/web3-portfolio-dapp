import { 
  FetchNftsParams, 
  FetchNftsPageResult, 
  NftApiItem, 
  IndexedCollectionApiItem,
  CollectionMetadataApiItem,
  CollectionNftsApiItem,
  ActivityItem,
  ContactMessageInput,
  ContactMessageResponse,
  AuthorProfile,
  EventApiItem,
  RefreshPricesResult
} from "./types";
import { fetchNftsFromAlchemy, DEFAULT_EXTERNAL_INDEX_TARGETS, getAlchemyClient } from "./alchemy";
import { NftTokenType } from "alchemy-sdk";

// Re-export types for convenience
export * from "./types";

export function getApiBaseUrl(): string {
  // Stub for compatibility
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export async function fetchNFTsPage(params: FetchNftsParams = {}): Promise<FetchNftsPageResult> {
  // Directly use Alchemy SDK via our helper
  return fetchNftsFromAlchemy(params);
}

export async function fetchNFTs(params: FetchNftsParams = {}): Promise<NftApiItem[]> {
  const page = await fetchNFTsPage(params);
  return page.items;
}

export async function fetchIndexedCollections(): Promise<IndexedCollectionApiItem[]> {
  // Return the static list defined in alchemy.ts
  return DEFAULT_EXTERNAL_INDEX_TARGETS.map(t => ({
    label: t.label,
    chainId: t.chainId,
    contractAddress: t.contractAddress
  }));
}

export async function fetchCollectionMetadata(contractAddress: string, params: { chain?: string | number } = {}): Promise<CollectionMetadataApiItem> {
  const chainId = params.chain === "polygon" || params.chain === 137 ? 137 : 1;
  const client = getAlchemyClient(chainId);
  
  try {
    const meta = await client.nft.getContractMetadata(contractAddress);
    return {
      address: contractAddress,
      name: meta.name || "Unknown Collection",
      symbol: meta.symbol || "UNK",
      tokenType: meta.tokenType || "ERC721",
      floorPriceEth: meta.openSeaMetadata?.floorPrice || null,
      totalSupply: meta.totalSupply || "0",
      volumeEth: null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Failed to fetch collection metadata", err);
    throw new Error("Failed to fetch collection metadata");
  }
}

export async function fetchCollectionNfts(contractAddress: string, params: { limit?: number; chain?: string | number } = {}): Promise<CollectionNftsApiItem> {
  // Reuse fetchNftsFromAlchemy with specific contract
  const result = await fetchNftsFromAlchemy({
    contract: contractAddress,
    chain: params.chain === 137 ? "polygon" : "ethereum",
    limit: params.limit
  });
  
  return {
    address: contractAddress,
    items: result.items.map(item => ({
      tokenId: item.tokenId,
      name: item.name,
      image: item.image || null,
      dbId: null
    })),
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchNftHistory(contractAddress: string, tokenId: string, params: { chain?: string | number } = {}): Promise<any> {
  // Stub
  return [];
}

export async function fetchNFTByTokenId(tokenId: string): Promise<NftApiItem> {
  // This usually requires contract address too, but API expected just tokenId which implies unique DB ID or complex lookup.
  // Since we don't have DB, we can't lookup by just tokenId across all contracts.
  // However, Explore page links to /nft/[id]. The ID in Explore items is now contractAddress|tokenId or similar?
  // Our `getNftIdentity` uses `_id` or `contract|tokenId`.
  // If we don't have `_id`, we rely on `contract|tokenId`.
  // The route `/nft/[id]` likely expects an ID.
  // If we pass `contract:tokenId` as ID, we can parse it here.
  
  if (tokenId.includes(":")) {
    const [contract, id] = tokenId.split(":");
    // Assume ETH mainnet for simplicity if not specified, or try to infer?
    // This is hard without chain info.
    throw new Error("Direct fetching by ID not supported without backend");
  }
  throw new Error("NFT not found");
}

export async function fetchNFTById(id: string): Promise<NftApiItem> {
  return fetchNFTByTokenId(id);
}

export async function trackNftViewById(id: string): Promise<void> {
  // No-op
}

export async function trackNftViewByTokenId(tokenId: string): Promise<void> {
  // No-op
}

export async function refreshPrices(): Promise<RefreshPricesResult> {
  return {
    scanned: 0,
    updated: 0,
    contractsUpdated: 0,
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchAuthorProfile(address: string): Promise<AuthorProfile> {
  return {
    address,
    username: "Anonymous",
    bio: null,
    twitter: null,
    avatarUrl: null,
    coverUrl: null
  };
}

export async function fetchActivity(address: string, params: { limit?: number } = {}): Promise<ActivityItem[]> {
  return [];
}

export async function fetchTokenActivity(tokenId: string, params: { limit?: number } = {}): Promise<ActivityItem[]> {
  return [];
}

export async function postContactMessage(input: ContactMessageInput): Promise<ContactMessageResponse> {
  return { ok: true, id: "mock-id" };
}

export async function fetchEvents(participant: string, params: { limit?: number } = {}): Promise<EventApiItem[]> {
  return [];
}

// Re-export helpers
export function ipfsToGatewayUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return url;
}
