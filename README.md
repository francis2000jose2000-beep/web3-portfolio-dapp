Professional NFT Marketplace and Mass Indexer (Deployed on Vercel)
This is a production-grade, full-stack NFT marketplace engineered for high performance and scale, now live on Vercel. The platform utilizes a hybrid architecture that combines on-chain transaction security with a high-performance MongoDB data layer, capable of indexing and rendering 10,500+ assets with sub-second latency.

Technical Stack
Frontend
Core Framework: Next.js 15.5 (App Router) and React 19.

Web3 Integration: Wagmi v2 and Viem for type-safe blockchain interactions.

Performance: TanStack Virtual for DOM virtualization, enabling 60fps scrolling across 10,000+ items.

State Management: TanStack Query v5 for resilient API caching.

Styling: Tailwind CSS.

Backend and Indexing
Server: Node.js / Express with a custom Resilient Ingestion Service.

Provider: Alchemy SDK with custom exponential backoff logic.

Database: MongoDB via Mongoose, utilizing compound indexing for multi-chain query optimization.


System Architecture:

1. Resilient Mass Indexing (10,500+ Assets)
The backend includes a custom-built indexer designed to handle the constraints of decentralized APIs:

Rate-Limit Management: Includes a recursive pagination loop with 2.5s delays and backoff retries to navigate Alchemy’s 429 error thresholds.

Data Integrity: Uses a robust price fallback chain (priceEth -> price -> priceWei) to ensure accurate price displays across various metadata standards.

Address Normalization: All contract interactions utilize lowercase standardization to prevent hex-string mismatches.

2. UI Virtualization
To maintain performance while displaying 10,500+ NFTs, the platform implements windowing:

Only the items visible in the user's viewport are rendered in the DOM.

This keeps memory usage constant regardless of the total collection size.

3. Hybrid Data Flow
On-Chain Truth: All ownership changes, pricing, and minting events occur on the blockchain.

Event Watcher: A dedicated backend service monitors the smart contract for events such as MarketItemCreated and MarketItemSold.

Database Synchronization: The watcher mirrors on-chain events into MongoDB, including fetching metadata from IPFS.

Optimized Reads: The frontend fetches data from the MongoDB API, providing a fast user experience while maintaining blockchain security for transactions.


Key Functionalities:

Multimedia Support
Native rendering for multiple media types, including images, audio (with native controls), and video with optimized loop playback.

Secondary Market
Users can re-list purchased NFTs for sale. The platform handles transitions between "Sold" and "Listed" status across both the smart contract and the database.

Activity Tracking
A centralized activity feed tracks all historical actions (Mint, List, Sell, Transfer) by address or specific token.

Personalized Events Page
A dedicated page that filters and displays only the events that the user is participating in [cite: 2026-01-30].


Installation and Setup:

1. Prerequisites
Node.js v20 or higher

MongoDB instance (local or remote)

MetaMask browser extension

Pinata API credentials

Alchemy and Reown (WalletConnect) Project IDs

2. Clone and Install
Bash

git clone [repository-url]
cd nft-marketplace
npm install

# Terminal 1: Start local chain
npm --workspace packages/contracts run node

# Terminal 2: Deploy contracts
npm --workspace packages/contracts run deploy:local

# Terminal 3: Start backend and API
npm --workspace apps/api run dev


Developer Utility Scripts:

The repository includes utility scripts for system maintenance and testing:

check_api.js: Verifies backend health and connectivity.

trigger_indexing.js: Manually initiates the external NFT indexing process.

These scripts should be located in the /scripts directory for professional organization.