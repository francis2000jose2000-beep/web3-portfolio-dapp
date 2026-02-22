import type { NftApiItem } from "@/lib/api";

export type DemoActivityItem = {
  id: string;
  type: "Mint" | "List" | "Bid" | "Sale" | "Transfer";
  from?: `0x${string}`;
  to?: `0x${string}`;
  amountEth?: string;
  timestamp: string;
};

export type DemoMainnetNft = Omit<
  NftApiItem,
  "image" | "type" | "isExternal" | "externalUrl" | "price" | "seller" | "owner" | "contractAddress" | "chainId"
> & {
  id: string;
  collection: string;
  image: string;
  type: "image" | "audio" | "video";
  isExternal: true;
  externalUrl: string;
  price: string;
  priceEth: string;
  ownerAddress: `0x${string}`;
  creatorAddress: `0x${string}`;
  activity: DemoActivityItem[];
  chainId: number;
  contractAddress: `0x${string}`;
};

export const DEMO_MAINNET_NFTS: DemoMainnetNft[] = [
  {
    id: "demo-bayc-0",
    tokenId: "0",
    name: "Bored Ape Yacht Club #0",
    collection: "Bored Ape Yacht Club",
    description: "A legendary PFP collection that helped define the modern NFT era.",
    image: "https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ",
    category: "collectibles",
    price: "29.8",
    priceEth: "29.8",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/boredapeyachtclub",
    chainId: 1,
    contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    ownerAddress: "0x4aB9B589E411EdcD8fB9c70dE1c2f2d07A0f2e4a",
    creatorAddress: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
    activity: [
      {
        id: "bayc0-mint",
        type: "Mint",
        to: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
        amountEth: "0.08",
        timestamp: "2021-04-23T02:11:04.000Z"
      },
      {
        id: "bayc0-list",
        type: "List",
        from: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
        amountEth: "28.0",
        timestamp: "2024-09-12T18:21:10.000Z"
      },
      {
        id: "bayc0-bid",
        type: "Bid",
        from: "0x2D7b7b3E9b1b1a2D3c4D5E6F708192aBcDeF1234",
        amountEth: "29.2",
        timestamp: "2024-09-13T01:02:54.000Z"
      },
      {
        id: "bayc0-sale",
        type: "Sale",
        from: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
        to: "0x4aB9B589E411EdcD8fB9c70dE1c2f2d07A0f2e4a",
        amountEth: "29.8",
        timestamp: "2024-09-13T01:10:19.000Z"
      }
    ]
  },
  {
    id: "demo-bayc-1",
    tokenId: "1",
    name: "Bored Ape Yacht Club #1",
    collection: "Bored Ape Yacht Club",
    description: "Iconic generative art with cultural gravity and deep liquidity.",
    image: "https://ipfs.io/ipfs/QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi",
    category: "collectibles",
    price: "31.2",
    priceEth: "31.2",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/boredapeyachtclub",
    chainId: 1,
    contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    ownerAddress: "0xA5aCE7C0bB11cC2D3e4F5a6B7c8D9e0F1a2B3c4D",
    creatorAddress: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
    activity: [
      {
        id: "bayc1-mint",
        type: "Mint",
        to: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
        amountEth: "0.08",
        timestamp: "2021-04-23T02:12:10.000Z"
      },
      {
        id: "bayc1-transfer",
        type: "Transfer",
        from: "0x9B99B1E5f0bF8B4C6B0C0E2cFf8aF9d2D7c5A1B2",
        to: "0x8E186a8F0c0e1111222233334444555566667777",
        timestamp: "2022-11-03T16:04:44.000Z"
      },
      {
        id: "bayc1-list",
        type: "List",
        from: "0x8E186a8F0c0e1111222233334444555566667777",
        amountEth: "31.2",
        timestamp: "2024-10-02T09:18:03.000Z"
      },
      {
        id: "bayc1-sale",
        type: "Sale",
        from: "0x8E186a8F0c0e1111222233334444555566667777",
        to: "0xA5aCE7C0bB11cC2D3e4F5a6B7c8D9e0F1a2B3c4D",
        amountEth: "31.2",
        timestamp: "2024-10-02T09:26:47.000Z"
      }
    ]
  },
  {
    id: "demo-azuki-2949",
    tokenId: "2949",
    name: "Azuki #2949",
    collection: "Azuki",
    description: "Anime-inspired avatars with a distinct visual identity and strong community.",
    image: "ipfs://QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg/2949.png",
    category: "art",
    price: "8.45",
    priceEth: "8.45",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/azuki",
    chainId: 1,
    contractAddress: "0xed5af388653567af2f388e6224dc7c4b3241c544",
    ownerAddress: "0x7058764f4e5D1c2B3A4B5C6D7E8F901234567890",
    creatorAddress: "0xE62aE5aD11111111111111111111111111111111",
    activity: [
      {
        id: "azuki2949-mint",
        type: "Mint",
        to: "0xE62aE5aD11111111111111111111111111111111",
        amountEth: "0.05",
        timestamp: "2022-01-12T04:28:11.000Z"
      },
      {
        id: "azuki2949-bid",
        type: "Bid",
        from: "0x7709fA0000000000000000000000000000000000",
        amountEth: "8.10",
        timestamp: "2025-01-19T13:51:32.000Z"
      },
      {
        id: "azuki2949-sale",
        type: "Sale",
        from: "0xE62aE5aD11111111111111111111111111111111",
        to: "0x7058764f4e5D1c2B3A4B5C6D7E8F901234567890",
        amountEth: "8.45",
        timestamp: "2025-01-19T13:58:10.000Z"
      }
    ]
  },
  {
    id: "demo-azuki-7418",
    tokenId: "7418",
    name: "Azuki #7418",
    collection: "Azuki",
    description: "A mainnet collectible showcased here in view-only mode.",
    image: "ipfs://QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg/7418.png",
    category: "art",
    price: "6.90",
    priceEth: "6.90",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/azuki",
    chainId: 1,
    contractAddress: "0xed5af388653567af2f388e6224dc7c4b3241c544",
    ownerAddress: "0x074aD70000000000000000000000000000000000",
    creatorAddress: "0xE62aE5aD11111111111111111111111111111111",
    activity: [
      {
        id: "azuki7418-list",
        type: "List",
        from: "0x074aD70000000000000000000000000000000000",
        amountEth: "6.90",
        timestamp: "2025-02-02T09:10:04.000Z"
      },
      {
        id: "azuki7418-bid",
        type: "Bid",
        from: "0xB4Ea050000000000000000000000000000000000",
        amountEth: "6.50",
        timestamp: "2025-02-02T10:02:48.000Z"
      },
      {
        id: "azuki7418-transfer",
        type: "Transfer",
        from: "0x074aD70000000000000000000000000000000000",
        to: "0x074aD70000000000000000000000000000000000",
        timestamp: "2025-02-02T10:10:01.000Z"
      }
    ]
  },
  {
    id: "demo-pudgy-6520",
    tokenId: "6520",
    name: "Pudgy Penguin #6520",
    collection: "Pudgy Penguins",
    description: "A community-first PFP collection recognized for mainstream brand momentum.",
    image: "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/6520.png",
    category: "collectibles",
    price: "4.33",
    priceEth: "4.33",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/pudgypenguins",
    chainId: 1,
    contractAddress: "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
    ownerAddress: "0x0B0B0b0B0b0B0b0B0b0B0b0B0b0B0b0B0b0B0b0B",
    creatorAddress: "0x6f5aA1b2c3D4e5F60718293aBcDeF0123456789a",
    activity: [
      {
        id: "pudgy6520-mint",
        type: "Mint",
        to: "0x6f5aA1b2c3D4e5F60718293aBcDeF0123456789a",
        amountEth: "0.03",
        timestamp: "2021-07-22T18:11:22.000Z"
      },
      {
        id: "pudgy6520-sale",
        type: "Sale",
        from: "0x6f5aA1b2c3D4e5F60718293aBcDeF0123456789a",
        to: "0x0B0B0b0B0b0B0b0B0b0B0b0B0b0B0b0B0b0B0b0B",
        amountEth: "4.33",
        timestamp: "2026-01-19T22:01:05.000Z"
      }
    ]
  },
  {
    id: "demo-pudgy-8259",
    tokenId: "8259",
    name: "Pudgy Penguin #8259",
    collection: "Pudgy Penguins",
    description: "Shown as a read-only mainnet asset to keep the UI reliably populated.",
    image: "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/8259.png",
    category: "collectibles",
    price: "4.32",
    priceEth: "4.32",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/pudgypenguins",
    chainId: 1,
    contractAddress: "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
    ownerAddress: "0x7B89610000000000000000000000000000000000",
    creatorAddress: "0x6f5aA1b2c3D4e5F60718293aBcDeF0123456789a",
    activity: [
      {
        id: "pudgy8259-list",
        type: "List",
        from: "0x7B89610000000000000000000000000000000000",
        amountEth: "4.32",
        timestamp: "2026-01-02T10:40:10.000Z"
      },
      {
        id: "pudgy8259-bid",
        type: "Bid",
        from: "0x6611fE0000000000000000000000000000000000",
        amountEth: "4.20",
        timestamp: "2026-01-02T11:05:41.000Z"
      },
      {
        id: "pudgy8259-sale",
        type: "Sale",
        from: "0x7B89610000000000000000000000000000000000",
        to: "0x6611fE0000000000000000000000000000000000",
        amountEth: "4.32",
        timestamp: "2026-01-02T11:09:02.000Z"
      }
    ]
  },
  {
    id: "demo-punk-3100",
    tokenId: "3100",
    name: "CryptoPunk #3100",
    collection: "CryptoPunks",
    description: "A historic on-chain collectible. Shown here as a read-only mainnet asset.",
    image: "https://www.larvalabs.com/public/images/cryptopunks/punk3100.png",
    category: "collectibles",
    price: "4200",
    priceEth: "4200",
    sold: false,
    type: "image",
    mediaType: "image",
    isAuction: true,
    minBid: "3900",
    highestBid: "4050",
    highestBidder: "0xE62aE50000000000000000000000000000000000",
    auctionEndTime: "2026-03-01T12:00:00.000Z",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/cryptopunks",
    chainId: 1,
    contractAddress: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
    ownerAddress: "0x4aB9B50000000000000000000000000000000000",
    creatorAddress: "0x074aD70000000000000000000000000000000000",
    activity: [
      {
        id: "punk3100-offer",
        type: "List",
        from: "0x074aD70000000000000000000000000000000000",
        amountEth: "5000",
        timestamp: "2024-11-20T10:00:00.000Z"
      },
      {
        id: "punk3100-bid",
        type: "Bid",
        from: "0xE62aE50000000000000000000000000000000000",
        amountEth: "5250",
        timestamp: "2025-03-01T12:00:00.000Z"
      },
      {
        id: "punk3100-sale",
        type: "Sale",
        from: "0x074aD70000000000000000000000000000000000",
        to: "0x4aB9B50000000000000000000000000000000000",
        amountEth: "4000",
        timestamp: "2025-04-10T14:22:00.000Z"
      }
    ]
  },
  {
    id: "demo-punk-7804",
    tokenId: "7804",
    name: "CryptoPunk #7804",
    collection: "CryptoPunks",
    description: "One of the most iconic Punks. High-ticket and instantly recognizable.",
    image: "https://www.larvalabs.com/public/images/cryptopunks/punk7804.png",
    category: "collectibles",
    price: "2600",
    priceEth: "2600",
    sold: false,
    type: "image",
    mediaType: "image",
    isAuction: true,
    minBid: "2400",
    highestBid: "2550",
    highestBidder: "0x99B57c0000000000000000000000000000000000",
    auctionEndTime: "2026-03-04T16:30:00.000Z",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/cryptopunks",
    chainId: 1,
    contractAddress: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
    ownerAddress: "0x319aAe0000000000000000000000000000000000",
    creatorAddress: "0x074aD70000000000000000000000000000000000",
    activity: [
      {
        id: "punk7804-transfer",
        type: "Transfer",
        from: "0x00d7C90000000000000000000000000000000000",
        to: "0x319aAe0000000000000000000000000000000000",
        timestamp: "2024-06-11T08:00:00.000Z"
      },
      {
        id: "punk7804-bid",
        type: "Bid",
        from: "0x99B57c0000000000000000000000000000000000",
        amountEth: "2550",
        timestamp: "2025-08-18T09:30:00.000Z"
      },
      {
        id: "punk7804-list",
        type: "List",
        from: "0x319aAe0000000000000000000000000000000000",
        amountEth: "2600",
        timestamp: "2025-08-18T10:00:00.000Z"
      }
    ]
  },
  {
    id: "demo-doodles-0",
    tokenId: "0",
    name: "Doodles #0",
    collection: "Doodles",
    description: "A colorful, joyful avatar from a generative set of 10,000 Doodles.",
    image: "https://ipfs.io/ipfs/QmYxT4LnK8sqLupjbS6eRvu1si7Ly2wFQAqFebxhWntcf6",
    category: "collectibles",
    price: "6.75",
    priceEth: "6.75",
    sold: false,
    type: "image",
    mediaType: "image",
    isAuction: true,
    minBid: "6.25",
    highestBid: "6.60",
    highestBidder: "0xC0043D0000000000000000000000000000000000",
    auctionEndTime: "2026-02-28T19:00:00.000Z",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/doodles-official",
    chainId: 1,
    contractAddress: "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e",
    ownerAddress: "0x51636D0000000000000000000000000000000000",
    creatorAddress: "0xB1aDCE0000000000000000000000000000000000",
    activity: [
      {
        id: "doodles0-mint",
        type: "Mint",
        to: "0xB1aDCE0000000000000000000000000000000000",
        amountEth: "0.123",
        timestamp: "2021-10-17T19:01:02.000Z"
      },
      {
        id: "doodles0-list",
        type: "List",
        from: "0xB1aDCE0000000000000000000000000000000000",
        amountEth: "6.75",
        timestamp: "2026-01-11T12:22:12.000Z"
      },
      {
        id: "doodles0-sale",
        type: "Sale",
        from: "0xB1aDCE0000000000000000000000000000000000",
        to: "0x51636D0000000000000000000000000000000000",
        amountEth: "6.75",
        timestamp: "2026-01-11T12:30:35.000Z"
      }
    ]
  },
  {
    id: "demo-doodles-1141",
    tokenId: "1141",
    name: "Doodles #1141",
    collection: "Doodles",
    description: "A high-demand character with a clean palette and sharp traits.",
    image: "https://ipfs.io/ipfs/QmRN6shMmgpvAdUkra7aXCKPaiKHVrJQAvHzDvToo9nhcB",
    category: "collectibles",
    price: "7.90",
    priceEth: "7.90",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/doodles-official",
    chainId: 1,
    contractAddress: "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e",
    ownerAddress: "0x2Pac000000000000000000000000000000000000",
    creatorAddress: "0xB1aDCE0000000000000000000000000000000000",
    activity: [
      {
        id: "doodles1141-bid",
        type: "Bid",
        from: "0xC0043D0000000000000000000000000000000000",
        amountEth: "7.50",
        timestamp: "2026-02-01T08:11:45.000Z"
      },
      {
        id: "doodles1141-list",
        type: "List",
        from: "0x2Pac000000000000000000000000000000000000",
        amountEth: "7.90",
        timestamp: "2026-02-01T08:20:10.000Z"
      },
      {
        id: "doodles1141-transfer",
        type: "Transfer",
        from: "0x2Pac000000000000000000000000000000000000",
        to: "0x2Pac000000000000000000000000000000000000",
        timestamp: "2026-02-01T08:22:02.000Z"
      }
    ]
  },
  {
    id: "demo-milady-738",
    tokenId: "738",
    name: "Milady #738",
    collection: "Milady Maker",
    description: "Neochibi street-style PFP from the Milady Maker collection.",
    image: "https://raw.githubusercontent.com/remiliacorp/miladycollection/main/738.png",
    category: "collectibles",
    price: "3.10",
    priceEth: "3.10",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/milady",
    chainId: 1,
    contractAddress: "0x5af0d9827e0c53e4799bb226655a1de152a425a5",
    ownerAddress: "0x976b590000000000000000000000000000000000",
    creatorAddress: "0x58164b0000000000000000000000000000000000",
    activity: [
      {
        id: "milady738-mint",
        type: "Mint",
        to: "0x58164b0000000000000000000000000000000000",
        amountEth: "0.05",
        timestamp: "2022-08-17T06:01:00.000Z"
      },
      {
        id: "milady738-sale",
        type: "Sale",
        from: "0x58164b0000000000000000000000000000000000",
        to: "0x976b590000000000000000000000000000000000",
        amountEth: "3.10",
        timestamp: "2025-12-09T18:18:00.000Z"
      }
    ]
  },
  {
    id: "demo-milady-112",
    tokenId: "112",
    name: "Milady #112",
    collection: "Milady Maker",
    description: "A clean, high-contrast Milady selected for portfolio demonstration.",
    image: "https://raw.githubusercontent.com/remiliacorp/miladycollection/main/112.png",
    category: "collectibles",
    price: "3.85",
    priceEth: "3.85",
    sold: false,
    type: "image",
    mediaType: "image",
    isExternal: true,
    externalUrl: "https://opensea.io/collection/milady",
    chainId: 1,
    contractAddress: "0x5af0d9827e0c53e4799bb226655a1de152a425a5",
    ownerAddress: "0xE8F48E0000000000000000000000000000000000",
    creatorAddress: "0x58164b0000000000000000000000000000000000",
    activity: [
      {
        id: "milady112-list",
        type: "List",
        from: "0xE8F48E0000000000000000000000000000000000",
        amountEth: "3.85",
        timestamp: "2026-02-03T20:14:12.000Z"
      },
      {
        id: "milady112-bid",
        type: "Bid",
        from: "0xFF84140000000000000000000000000000000000",
        amountEth: "3.60",
        timestamp: "2026-02-03T20:30:21.000Z"
      },
      {
        id: "milady112-transfer",
        type: "Transfer",
        from: "0xE8F48E0000000000000000000000000000000000",
        to: "0xE8F48E0000000000000000000000000000000000",
        timestamp: "2026-02-03T20:33:02.000Z"
      }
    ]
  }
];

export function getDemoMainnetNftById(id: string): DemoMainnetNft | null {
  const needle = typeof id === "string" ? id.trim() : "";
  if (!needle) return null;
  return DEMO_MAINNET_NFTS.find((n) => n.id === needle) ?? null;
}
