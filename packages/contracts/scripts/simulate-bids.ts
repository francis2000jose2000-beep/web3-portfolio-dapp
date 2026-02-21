import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function short(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main(): Promise<void> {
  const [owner, bidder1, bidder2] = await ethers.getSigners();
  const marketplace = await ethers.getContractAt("NFTMarketplace", CONTRACT_ADDRESS);

  console.log("\n🎬 A iniciar a simulação da Guerra de Licitações...");
  console.log(`Owner:   ${short(owner.address)}`);
  console.log(`Bidder1: ${short(bidder1.address)}`);
  console.log(`Bidder2: ${short(bidder2.address)}\n`);

  const listingFee = await marketplace.getListingFee();
  const price = ethers.parseEther("1");

  console.log(`[1] Owner (${short(owner.address)}) a mintar + listar um NFT...`);
  const tokenUri = "ipfs://mock-bidding-war-uri";
  const tokenId = await marketplace.connect(owner).createToken.staticCall(tokenUri, price, { value: listingFee });
  const createTx = await marketplace.connect(owner).createToken(tokenUri, price, { value: listingFee });
  await createTx.wait();
  console.log(`✅ NFT #${tokenId.toString()} criado e listado!`);

  console.log(`\n[2] Bidder1 (${short(bidder1.address)}) a comprar o NFT #${tokenId.toString()}...`);
  const buyTx = await marketplace.connect(bidder1).createMarketSale(tokenId, { value: price });
  await buyTx.wait();
  console.log("✅ Compra concluída. Bidder1 é o dono do NFT.");

  console.log(`\n[3] Bidder1 (${short(bidder1.address)}) a iniciar leilão...`);
  const minBid = ethers.parseEther("0.05");
  const duration = 60;
  const auctionTx = await marketplace.connect(bidder1).createAuction(tokenId, minBid, duration);
  await auctionTx.wait();
  console.log(`✅ Leilão iniciado! Min Bid: ${ethers.formatEther(minBid)} ETH`);

  console.log(`\n[4] Bidder2 (${short(bidder2.address)}) a licitar ${ethers.formatEther(minBid)} ETH...`);
  const bidder2BalanceBefore = await ethers.provider.getBalance(bidder2.address);
  const bid1Tx = await marketplace.connect(bidder2).placeBid(tokenId, { value: minBid });
  await bid1Tx.wait();
  const bidder2BalanceAfterBid1 = await ethers.provider.getBalance(bidder2.address);
  console.log("✅ Licitação do Bidder2 aceite!");

  const bid2 = minBid + 1n;
  console.log(`\n[5] Owner (${short(owner.address)}) a contra-atacar com ${ethers.formatEther(bid2)} ETH (deve reembolsar Bidder2)...`);
  const ownerBidTx = await marketplace.connect(owner).placeBid(tokenId, { value: bid2 });
  await ownerBidTx.wait();
  const bidder2BalanceAfterRefund = await ethers.provider.getBalance(bidder2.address);

  const refund = bidder2BalanceAfterRefund - bidder2BalanceAfterBid1;
  console.log("✅ Licitação do Owner aceite!");
  console.log("\n📊 Verificação de Reembolso (Bidder2):");
  console.log(`Antes da 1ª bid:          ${ethers.formatEther(bidder2BalanceBefore)} ETH`);
  console.log(`Depois da 1ª bid:         ${ethers.formatEther(bidder2BalanceAfterBid1)} ETH`);
  console.log(`Depois do contra-ataque:   ${ethers.formatEther(bidder2BalanceAfterRefund)} ETH`);
  console.log(`Reembolso observado:       ${ethers.formatEther(refund)} ETH`);

  console.log("\n[6] A avançar o tempo para terminar o leilão...");
  await ethers.provider.send("evm_increaseTime", [duration + 1]);
  await ethers.provider.send("evm_mine", []);

  const bidder1BalanceBeforePayout = await ethers.provider.getBalance(bidder1.address);
  console.log(`\n[7] A finalizar o leilão (payout para o Bidder1, vencedor = Owner)...`);
  const endTx = await marketplace.connect(owner).endAuction(tokenId);
  await endTx.wait();
  const bidder1BalanceAfterPayout = await ethers.provider.getBalance(bidder1.address);
  const payout = bidder1BalanceAfterPayout - bidder1BalanceBeforePayout;

  const finalOwner = await marketplace.ownerOf(tokenId);
  const endedAuction = await marketplace.auctions(tokenId);

  console.log("\n📊 Verificação de Payout (Bidder1):");
  console.log(`Antes do endAuction:       ${ethers.formatEther(bidder1BalanceBeforePayout)} ETH`);
  console.log(`Depois do endAuction:      ${ethers.formatEther(bidder1BalanceAfterPayout)} ETH`);
  console.log(`Payout observado:          ${ethers.formatEther(payout)} ETH`);

  console.log("\n✅ Estado final:");
  console.log(`NFT owner:                 ${finalOwner}`);
  console.log(`Auction active:            ${endedAuction.active}`);
  console.log(`Highest bidder:            ${endedAuction.highestBidder}`);
  console.log(`Highest bid:               ${ethers.formatEther(endedAuction.highestBid)} ETH`);

  console.log("\n🚀 Simulação concluída com sucesso!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
