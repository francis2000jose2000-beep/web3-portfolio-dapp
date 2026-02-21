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
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  }
] as const satisfies Abi;
