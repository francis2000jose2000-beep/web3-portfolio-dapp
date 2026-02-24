import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function short(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main(): Promise<void> {
  const [owner, bidder1, bidder2] = await ethers.getSigners();
  const marketplace = await ethers.getContractAt("NFTMarketplace", CONTRACT_ADDRESS);

  console.log("\nStarting bidding war simulation...");
  console.log(`Owner:   ${short(owner.address)}`);
  console.log(`Bidder1: ${short(bidder1.address)}`);
  console.log(`Bidder2: ${short(bidder2.address)}\n`);

  const listingFee = await marketplace.getListingFee();
  const price = ethers.parseEther("1");

  console.log(`[1] Owner (${short(owner.address)}) minting and listing an NFT...`);
  const tokenUri = "ipfs://mock-bidding-war-uri";
  const tokenId = await marketplace.connect(owner).createToken.staticCall(tokenUri, price, { value: listingFee });
  const createTx = await marketplace.connect(owner).createToken(tokenUri, price, { value: listingFee });
  await createTx.wait();
  console.log(`NFT #${tokenId.toString()} created and listed.`);

  console.log(`\n[2] Bidder1 (${short(bidder1.address)}) buying NFT #${tokenId.toString()}...`);
  const buyTx = await marketplace.connect(bidder1).createMarketSale(tokenId, { value: price });
  await buyTx.wait();
  console.log("Purchase complete. Bidder1 now owns the NFT.");

  console.log(`\n[3] Bidder1 (${short(bidder1.address)}) starting an auction...`);
  const minBid = ethers.parseEther("0.05");
  const duration = 60;
  const auctionTx = await marketplace.connect(bidder1).createAuction(tokenId, minBid, duration);
  await auctionTx.wait();
  console.log(`Auction started. Min bid: ${ethers.formatEther(minBid)} ETH`);

  console.log(`\n[4] Bidder2 (${short(bidder2.address)}) bidding ${ethers.formatEther(minBid)} ETH...`);
  const bidder2BalanceBefore = await ethers.provider.getBalance(bidder2.address);
  const bid1Tx = await marketplace.connect(bidder2).placeBid(tokenId, { value: minBid });
  await bid1Tx.wait();
  const bidder2BalanceAfterBid1 = await ethers.provider.getBalance(bidder2.address);
  console.log("Bid accepted (Bidder2).");

  const bid2 = minBid + 1n;
  console.log(`\n[5] Owner (${short(owner.address)}) counter-bidding with ${ethers.formatEther(bid2)} ETH (Bidder2 should be refunded)...`);
  const ownerBidTx = await marketplace.connect(owner).placeBid(tokenId, { value: bid2 });
  await ownerBidTx.wait();
  const bidder2BalanceAfterRefund = await ethers.provider.getBalance(bidder2.address);

  const refund = bidder2BalanceAfterRefund - bidder2BalanceAfterBid1;
  console.log("Bid accepted (Owner).");
  console.log("\nRefund check (Bidder2):");
  console.log(`Before first bid:          ${ethers.formatEther(bidder2BalanceBefore)} ETH`);
  console.log(`After first bid:           ${ethers.formatEther(bidder2BalanceAfterBid1)} ETH`);
  console.log(`After counter-bid:         ${ethers.formatEther(bidder2BalanceAfterRefund)} ETH`);
  console.log(`Observed refund delta:     ${ethers.formatEther(refund)} ETH`);

  console.log("\n[6] Advancing time to end the auction...");
  await ethers.provider.send("evm_increaseTime", [duration + 1]);
  await ethers.provider.send("evm_mine", []);

  const bidder1BalanceBeforePayout = await ethers.provider.getBalance(bidder1.address);
  console.log(`\n[7] Finalizing auction (payout to Bidder1, winner = Owner)...`);
  const endTx = await marketplace.connect(owner).endAuction(tokenId);
  await endTx.wait();
  const bidder1BalanceAfterPayout = await ethers.provider.getBalance(bidder1.address);
  const payout = bidder1BalanceAfterPayout - bidder1BalanceBeforePayout;

  const finalOwner = await marketplace.ownerOf(tokenId);
  const endedAuction = await marketplace.auctions(tokenId);

  console.log("\nPayout check (Bidder1):");
  console.log(`Before endAuction:         ${ethers.formatEther(bidder1BalanceBeforePayout)} ETH`);
  console.log(`After endAuction:          ${ethers.formatEther(bidder1BalanceAfterPayout)} ETH`);
  console.log(`Observed payout delta:     ${ethers.formatEther(payout)} ETH`);

  console.log("\nFinal state:");
  console.log(`NFT owner:                 ${finalOwner}`);
  console.log(`Auction active:            ${endedAuction.active}`);
  console.log(`Highest bidder:            ${endedAuction.highestBidder}`);
  console.log(`Highest bid:               ${ethers.formatEther(endedAuction.highestBid)} ETH`);

  console.log("\nSimulation completed successfully.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
