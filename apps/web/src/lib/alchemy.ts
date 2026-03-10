import { Alchemy, Network, Nft, NftTokenType } from "alchemy-sdk";
import { FetchNftsParams, FetchNftsPageResult, NftApiItem } from "./types";

const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

const alchemyEth = new Alchemy({
  apiKey,
  network: Network.ETH_MAINNET,
});

const alchemyPoly = new Alchemy({
  apiKey,
  network: Network.MATIC_MAINNET,
});

export const DEFAULT_EXTERNAL_INDEX_TARGETS = [
  {
    label: "CloneX",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b",
  },
  {
    label: "Azuki",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0xed5af388653567af2f388e6224dc7c4b3241c544",
  },
  {
    label: "CryptoPunks",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
  },
  {
    label: "Zed Run",
    chainId: 137,
    network: Network.MATIC_MAINNET,
    contractAddress: "0xa5f1ea7df861952863df2e8d1312f7305dabf215",
  },
  {
    label: "Lens Profiles",
    chainId: 137,
    network: Network.MATIC_MAINNET,
    contractAddress: "0xdb46d1dc155634fbc732f92e853b10b288ad5a1d",
  },
  {
    label: "Doodles",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e",
  },
];

export function getAlchemyClient(chainId: number) {
  if (chainId === 137) return alchemyPoly;
  return alchemyEth;
}

function normalizeAddress(addr: string): string {
  return addr.toLowerCase();
}

function inferMedia(nft: Nft): {
  image?: string;
  media?: string;
  mimeType?: string;
  type: "image" | "audio" | "video";
} {
  const image =
    nft.image.cachedUrl ||
    nft.image.originalUrl ||
    nft.image.thumbnailUrl ||
    nft.image.pngUrl ||
    undefined;

  const animationUrl = nft.raw.metadata?.animation_url || nft.raw.metadata?.animation_url;
  const mimeType = nft.image.contentType;

  let type: "image" | "audio" | "video" = "image";
  if (mimeType?.startsWith("video") || animationUrl?.endsWith(".mp4")) type = "video";
  if (mimeType?.startsWith("audio") || animationUrl?.endsWith(".mp3")) type = "audio";

  return {
    image,
    media: animationUrl || image,
    mimeType,
    type,
  };
}

function mapAlchemyNftToApiItem(nft: Nft, chainId: number, category?: string): NftApiItem {
  const { image, media, mimeType, type } = inferMedia(nft);
  
  return {
    tokenId: nft.tokenId,
    name: nft.name || `${nft.contract.name || "NFT"} #${nft.tokenId}`,
    description: nft.description,
    contractAddress: nft.contract.address,
    chainId,
    image,
    media,
    mimeType,
    type,
    mediaType: type,
    isExternal: true,
    sold: false,
    price: "0",
    floorPrice: nft.contract.openSeaMetadata?.floorPrice || undefined,
    attributes: nft.raw.metadata?.attributes,
    category: category || nft.contract.name || "Unknown",
    externalUrl: `https://opensea.io/assets/${chainId === 137 ? "matic" : "ethereum"}/${nft.contract.address}/${nft.tokenId}`,
  };
}

export async function fetchNftsFromAlchemy(params: FetchNftsParams): Promise<FetchNftsPageResult> {
  const chain = params.chain === "polygon" ? "polygon" : "ethereum";
  const chainId = chain === "polygon" ? 137 : 1;
  const client = getAlchemyClient(chainId);

  // Determine target contracts
  let targets = DEFAULT_EXTERNAL_INDEX_TARGETS.filter((t) => t.chainId === chainId);
  
  if (params.collections) {
    const requested = params.collections.split(",").map((s) => s.trim().toLowerCase());
    targets = targets.filter((t) => requested.includes(t.label.toLowerCase()));
  }

  // Parse pageKey from params.page (if string)
  let pageKeys: Record<string, string | undefined> = {};
  if (typeof params.page === "string") {
    try {
      pageKeys = JSON.parse(params.page);
    } catch {
      // ignore invalid json
    }
  }

  const items: NftApiItem[] = [];
  const nextPageKeys: Record<string, string> = {};

  // Fetch from each target
  await Promise.all(
    targets.map(async (target) => {
      try {
        const pageKey = pageKeys[target.contractAddress];
        // If we have a pageKey, or if it's the first page (no key required)
        // If pageKey is explicitly "DONE" (or similar marker), skip
        if (pageKey === "DONE") return;

        const response = await client.nft.getNftsForContract(target.contractAddress, {
          pageSize: 10,
          pageKey: pageKey,
          omitMetadata: false,
        });

        const mapped = response.nfts.map((nft) => mapAlchemyNftToApiItem(nft, target.chainId, target.label));
        items.push(...mapped);

        if (response.pageKey) {
          nextPageKeys[target.contractAddress] = response.pageKey;
        } else {
          nextPageKeys[target.contractAddress] = "DONE";
        }
      } catch (err) {
        console.error(`Failed to fetch from ${target.label}`, err);
      }
    })
  );

  // If all next keys are DONE, return undefined for nextPageKey
  const allDone = Object.values(nextPageKeys).every((k) => k === "DONE");
  const nextPageKey = allDone ? undefined : JSON.stringify(nextPageKeys);

  return {
    items,
    total: 10000,
    nextPageKey,
  };
}
