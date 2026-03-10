export type NftApiItem = {
  _id?: string;
  tokenId: string;
  itemId?: string;
  seller?: string;
  owner?: string;
  price?: string;
  priceWei?: string;
  priceEth?: string;
  sold: boolean;
  name: string;
  description?: string;
  attributes?: unknown[];
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
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  isAuction?: boolean;
  minBid?: string;
  highestBid?: string;
  highestBidder?: string;
  auctionEndTime?: string;
  floorPrice?: number;
  lastSale?: number;
};

export type RefreshPricesResult = {
  scanned: number;
  updated: number;
  contractsUpdated: number;
  fetchedAt: string;
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
  contract?: string;
  collections?: string;
  chain?: string;
  minPrice?: string;
  maxPrice?: string;
  sold?: boolean;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "name_asc";
  limit?: number;
  page?: number | string;
};

export type FetchNftsPageResult = {
  items: NftApiItem[];
  total: number;
  nextPageKey?: string;
};

export type IndexedCollectionApiItem = {
  label: string;
  chainId: number;
  contractAddress: string;
};

export type CollectionMetadataApiItem = {
  address: string;
  name: string | null;
  symbol: string | null;
  tokenType: string | null;
  floorPriceEth: number | null;
  totalSupply: string | null;
  volumeEth: number | null;
  fetchedAt: string;
};

export type CollectionNftCardApiItem = {
  tokenId: string;
  name: string;
  image: string | null;
  dbId: string | null;
};

export type CollectionNftsApiItem = {
  address: string;
  items: CollectionNftCardApiItem[];
  fetchedAt: string;
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

export type ContactMessageInput = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

export type ContactMessageResponse = { ok: true; id: string };
