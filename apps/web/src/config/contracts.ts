import type { Abi } from "viem";

export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const marketplaceAbi = [
  {
    type: "event",
    name: "MarketItemCreated",
    inputs: [
      { name: "itemId", type: "uint256", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: false },
      { name: "price", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "MarketItemSold",
    inputs: [
      { name: "itemId", type: "uint256", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "price", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "MarketItemRelisted",
    inputs: [
      { name: "itemId", type: "uint256", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "price", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "AuctionCreated",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "minBid", type: "uint256", indexed: false },
      { name: "endTime", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "BidPlaced",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "AuctionEnded",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "getListingFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "createToken",
    stateMutability: "payable",
    inputs: [
      { name: "tokenUri", type: "string" },
      { name: "price", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "createMarketSale",
    stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "resellToken",
    stateMutability: "payable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "fetchMarketItems",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "itemId", type: "uint256" },
          { name: "tokenId", type: "uint256" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "fetchMyNFTs",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "itemId", type: "uint256" },
          { name: "tokenId", type: "uint256" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "fetchItemsListed",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "itemId", type: "uint256" },
          { name: "tokenId", type: "uint256" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "createAuction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "minBid", type: "uint256" },
      { name: "duration", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "placeBid",
    stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "endAuction",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "auctions",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "minBid", type: "uint256" },
          { name: "highestBid", type: "uint256" },
          { name: "highestBidder", type: "address" },
          { name: "endTime", type: "uint256" },
          { name: "active", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "auctionSellers",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  }
] as const satisfies Abi;
