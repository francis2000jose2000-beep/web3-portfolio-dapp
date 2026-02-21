import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFTMarketplace", () => {
  it("lists, sells, and fetches items", async () => {
    const [seller, buyer] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await factory.deploy();
    await marketplace.waitForDeployment();

    const listingFee = await marketplace.getListingFee();
    const price = ethers.parseEther("1");

    const createTx = await marketplace.connect(seller).createToken("ipfs://token-1", price, {
      value: listingFee
    });
    await createTx.wait();

    const unsold = await marketplace.fetchMarketItems();
    expect(unsold.length).to.equal(1);
    expect(unsold[0].price).to.equal(price);

    const tokenId = unsold[0].tokenId;
    const saleTx = await marketplace.connect(buyer).createMarketSale(tokenId, { value: price });
    await saleTx.wait();

    const afterSale = await marketplace.fetchMarketItems();
    expect(afterSale.length).to.equal(0);

    const myNfts = await marketplace.connect(buyer).fetchMyNFTs();
    expect(myNfts.length).to.equal(1);
    expect(myNfts[0].tokenId).to.equal(tokenId);
  });

  it("runs an auction with bids and refunds", async () => {
    const [seller, bidder1, bidder2] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await factory.deploy();
    await marketplace.waitForDeployment();

    const listingFee = await marketplace.getListingFee();
    const price = ethers.parseEther("1");
    const createTx = await marketplace.connect(seller).createToken("ipfs://token-auction", price, { value: listingFee });
    await createTx.wait();

    const [item] = await marketplace.fetchMarketItems();
    const tokenId = item.tokenId;

    await marketplace.connect(bidder1).createMarketSale(tokenId, { value: price });
    expect(await marketplace.ownerOf(tokenId)).to.equal(bidder1.address);

    const minBid = ethers.parseEther("0.05");
    const duration = 60;
    await marketplace.connect(bidder1).createAuction(tokenId, minBid, duration);

    const auction = await marketplace.auctions(tokenId);
    expect(auction.active).to.equal(true);
    expect(auction.minBid).to.equal(minBid);
    expect(await marketplace.ownerOf(tokenId)).to.equal(await marketplace.getAddress());

    const bid1 = minBid;
    await marketplace.connect(bidder2).placeBid(tokenId, { value: bid1 });

    const bid2 = bid1 + 1n;
    await expect(marketplace.connect(seller).placeBid(tokenId, { value: bid2 })).to.changeEtherBalance(bidder2, bid1);

    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(marketplace.connect(bidder2).endAuction(tokenId)).to.changeEtherBalance(bidder1, bid2);
    expect(await marketplace.ownerOf(tokenId)).to.equal(seller.address);

    const ended = await marketplace.auctions(tokenId);
    expect(ended.active).to.equal(false);
    expect(ended.highestBid).to.equal(bid2);
    expect(ended.highestBidder).to.equal(seller.address);
  });
});
