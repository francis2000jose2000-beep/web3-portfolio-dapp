# NFT Marketplace

A full-stack NFT marketplace with multimedia support (Image, Audio, Video) and a hybrid architecture: transactions on-chain, fast reads from MongoDB.



## Technical Stack

### Frontend
- **Framework**: Next.js 15.5 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query v5 (React Query)
- **Web3 Integration**: Wagmi v2 and Viem
- **Animations**: Framer Motion

### Backend
- **Server**: Node.js / Express
- **Database**: MongoDB via Mongoose
- **IPFS Integration**: Pinata SDK
- **Blockchain Synchronization**: Real-time event watcher built with Viem

### Blockchain & Smart Contracts
- **Environment**: Hardhat
- **Contracts**: Solidity 0.8.x (OpenZeppelin standards)
- **Network**: Local Hardhat Node (Development)

---

## System Architecture

The platform solves the latency issues common in decentralized applications through a Hybrid Data Flow:

1. **On-Chain Truth**: All ownership changes, pricing, and minting events occur on the blockchain.
2. **Event Watcher**: A dedicated backend service monitors the smart contract for events such as `MarketItemCreated`, `MarketItemSold`, and `MarketItemRelisted`.
3. **Database Synchronization**: The watcher automatically mirrors on-chain events into MongoDB, including fetching metadata from IPFS.
4. **Optimized Reads**: The frontend fetches browsing and search data from the MongoDB API, providing a sub-second user experience while maintaining blockchain security for transactions.



---

## Key Functionalities

### Multimedia Support
Native rendering for multiple media types:
- **Image**: Static and animated visual art.
- **Audio**: Playback with native controls.
- **Video**: Motion graphics and clips with optimized loop playback.

### Secondary Market
Users can re-list purchased NFTs for sale. The platform handles the transition from "Sold" to "Listed" status across both the smart contract and the database via the `resellToken` logic.

### Activity Tracking
A centralized activity feed tracks all historical actions (Mint, List, Sell, Transfer) by address or specific token, providing full transparency of the asset's lifecycle.

---

## Installation and Setup

### 1. Prerequisites
- Node.js v20 or higher
- MongoDB instance (local or remote)
- Metamask browser extension
- Pinata API credentials

### 2. Clone and Install
```bash
git clone [https://github.com/your-username/nft-marketplace.git](https://github.com/your-username/nft-marketplace.git)
cd nft-marketplace
npm install

# Terminal 1: start local chain
npm --workspace packages/contracts run node

# Terminal 2: deploy contracts
npm --workspace packages/contracts run deploy:local

# Terminal 3: start backend (serves both API + Next.js on :3000)
npm --workspace apps/api run dev
```

Open `http://localhost:3000`.
