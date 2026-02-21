export type NftApiItem = {
  tokenId: string;
  itemId?: string;
  seller?: string;
  owner?: string;
  price?: string;
  sold: boolean;
  name: string;
  description?: string;
  image?: string;
  media?: string;
  type?: "image" | "audio" | "video";
  mediaType?: "image" | "audio" | "video";
  mimeType?: string;
  category?: string;
  isExternal?: boolean;
  contractAddress?: string;
  chainId?: number;
  externalUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  isAuction?: boolean;
  minBid?: string;
  highestBid?: string;
  highestBidder?: string;
  auctionEndTime?: string;
};

export type EventApiItem = {
  _id?: string;
  title: string;
  date: string;
  description?: string;
  participants: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type FetchNftsParams = {
  category?: string;
  search?: string;
  owner?: string;
  seller?: string;
  creator?: string;
  sold?: boolean;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
  limit?: number;
};

export type AuthorProfile = {
  address: string;
  username: string | null;
  bio: string | null;
  twitter: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
};

export type ActivityType = "MINT" | "LIST" | "SELL" | "TRANSFER";

export type ActivityItem = {
  eventId: string;
  type: ActivityType;
  from?: string;
  to?: string;
  tokenId: string;
  price?: string;
  timestamp: string;
};

function buildApiUrl(path: string, query: Record<string, string | number | boolean | undefined> = {}): string {
  const base = getApiBaseUrl();
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "undefined") continue;
    searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}${qs ? `?${qs}` : ""}`;
}

export async function fetchEvents(participant: string, params: { limit?: number } = {}): Promise<EventApiItem[]> {
  const url = buildApiUrl("/api/events", {
    participant,
    limit: params.limit
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const message = await readErrorText(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as { items?: EventApiItem[] };
  if (!json || !Array.isArray(json.items)) return [];
  return json.items;
}

export type ContactMessageInput = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

export type ContactMessageResponse = { ok: true; id: string };

const DEFAULT_IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"] as const;

function getPrimaryIpfsGateway(): string {
  const raw = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  const normalized = typeof raw === "string" ? raw.trim() : "";
  if (normalized) return normalized.endsWith("/") ? normalized : `${normalized}/`;
  return DEFAULT_IPFS_GATEWAYS[0];
}

function stripQueryHash(input: string): string {
  const idxQ = input.indexOf("?");
  const idxH = input.indexOf("#");
  const idx = idxQ === -1 ? idxH : idxH === -1 ? idxQ : Math.min(idxQ, idxH);
  return idx === -1 ? input : input.slice(0, idx);
}

function normalizeIpfsLike(input: string): { protocol: "ipfs" | "ipns"; path: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withoutQH = stripQueryHash(trimmed);

  if (/^https?:\/\//i.test(withoutQH)) return null;

  const lower = withoutQH.toLowerCase();

  if (lower.startsWith("ipfs://")) {
    let rest = withoutQH.slice("ipfs://".length);
    if (rest.toLowerCase().startsWith("ipfs/")) rest = rest.slice("ipfs/".length);
    if (rest.startsWith("/")) rest = rest.slice(1);
    return rest ? { protocol: "ipfs", path: rest } : null;
  }

  if (lower.startsWith("ipns://")) {
    let rest = withoutQH.slice("ipns://".length);
    if (rest.toLowerCase().startsWith("ipns/")) rest = rest.slice("ipns/".length);
    if (rest.startsWith("/")) rest = rest.slice(1);
    return rest ? { protocol: "ipns", path: rest } : null;
  }

  if (lower.startsWith("/ipfs/")) return { protocol: "ipfs", path: withoutQH.slice("/ipfs/".length) };
  if (lower.startsWith("ipfs/")) return { protocol: "ipfs", path: withoutQH.slice("ipfs/".length) };
  if (lower.startsWith("/ipns/")) return { protocol: "ipns", path: withoutQH.slice("/ipns/".length) };
  if (lower.startsWith("ipns/")) return { protocol: "ipns", path: withoutQH.slice("ipns/".length) };

  const cidLike = /^[a-zA-Z0-9]{20,}(?:\/[\w\-./%]+)?$/.test(withoutQH);
  if (cidLike) return { protocol: "ipfs", path: withoutQH };

  return null;
}

export function ipfsToGatewayUrls(input: string): string[] {
  const trimmed = typeof input === "string" ? input.trim() : "";
  if (!trimmed) return [];
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];

  const normalized = normalizeIpfsLike(trimmed);
  if (!normalized) return [trimmed];

  if (normalized.protocol === "ipns") {
    const path = normalized.path.replace(/^\/+/, "");
    return [
      "https://gateway.pinata.cloud/ipns/" + path,
      "https://ipfs.io/ipns/" + path
    ];
  }

  const path = normalized.path.replace(/^\/+/, "");
  const primary = getPrimaryIpfsGateway();
  const primaryUrl = primary.endsWith("/ipfs/") || primary.endsWith("/ipns/") ? primary + path : primary + "ipfs/" + path;
  const fallbacks = DEFAULT_IPFS_GATEWAYS.map((g) => g + path);
  const set = new Set<string>([primaryUrl, ...fallbacks]);
  return Array.from(set);
}

export function ipfsToGatewayUrl(input: string): string {
  return ipfsToGatewayUrls(input)[0] ?? input;
}

export function swapToIpfsFallbackGateway(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("https://gateway.pinata.cloud/ipfs/")) {
    return url.replace("https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/");
  }
  if (url.startsWith("https://ipfs.io/ipfs/")) {
    return url.replace("https://ipfs.io/ipfs/", "https://gateway.pinata.cloud/ipfs/");
  }
  return null;
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  return (typeof raw === "string" && raw.trim() ? raw.trim() : "http://localhost:3000").replace(/\/$/, "");
}

async function readErrorText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.trim();
  } catch {
    return "";
  }
}

export async function fetchNFTs(params: FetchNftsParams = {}): Promise<NftApiItem[]> {
  const url = buildApiUrl("/api/nfts", {
    category: params.category,
    search: params.search,
    owner: params.owner,
    seller: params.seller,
    creator: params.creator,
    sold: typeof params.sold === "boolean" ? String(params.sold) : undefined,
    sort: params.sort,
    limit: typeof params.limit === "number" ? String(params.limit) : undefined
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const message = await readErrorText(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as { items?: NftApiItem[] };
  if (!json || !Array.isArray(json.items)) return [];
  return json.items;
}

export async function fetchNFTByTokenId(tokenId: string): Promise<NftApiItem> {
  const url = buildApiUrl(`/api/nfts/${encodeURIComponent(tokenId)}`);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const message = await readErrorText(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as { nft?: NftApiItem };
  if (!json || !json.nft) throw new Error("NFT not found");
  return json.nft;
}

export async function fetchAuthorProfile(address: string): Promise<AuthorProfile> {
  const url = buildApiUrl(`/api/authors/${encodeURIComponent(address)}`);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const message = await readErrorText(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as { author?: AuthorProfile };
  if (!json || !json.author) throw new Error("Author not found");
  return json.author;
}

export async function fetchActivity(address: string, params: { limit?: number } = {}): Promise<ActivityItem[]> {
  const url = buildApiUrl(`/api/activity/${encodeURIComponent(address)}`, {
    limit: params.limit
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const message = await readErrorText(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as { items?: ActivityItem[] };
  return Array.isArray(json.items) ? json.items : [];
}

export async function fetchTokenActivity(tokenId: string, params: { limit?: number } = {}): Promise<ActivityItem[]> {
  const url = buildApiUrl(`/api/activity/token/${encodeURIComponent(tokenId)}`, {
    limit: params.limit
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const message = await readErrorText(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as { items?: ActivityItem[] };
  return Array.isArray(json.items) ? json.items : [];
}

async function readApiMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as unknown as { message?: unknown };
    if (json && typeof json.message === "string") return json.message;
  } catch {
    return readErrorText(res);
  }
  return "";
}

export async function postContactMessage(input: ContactMessageInput): Promise<ContactMessageResponse> {
  const url = buildApiUrl("/api/contact");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    const message = await readApiMessage(res);
    throw new Error(message || `API error (${res.status})`);
  }

  const json = (await res.json()) as unknown as ContactMessageResponse;
  if (!json || (json as { ok?: unknown }).ok !== true) throw new Error("Invalid response");
  return json;
}
