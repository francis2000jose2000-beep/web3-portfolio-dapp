import { expect } from "chai";
import hre from "hardhat";
import { createWalletClient, createPublicClient, custom, parseEther, type PublicClient, type WalletClient } from "viem";
import { hardhat } from "viem/chains";

describe("Security Invariants", function () {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  let contractAddress: `0x${string}`;
  let deployer: `0x${string}`;
  let user1: `0x${string}`;
  let user2: `0x${string}`;

  beforeEach(async function () {
    // Manually fetch accounts from the hardhat network
    const accounts = await hre.network.provider.request({ method: "eth_accounts" }) as `0x${string}`[];
    deployer = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];

    publicClient = createPublicClient({
      chain: hardhat,
      transport: custom(hre.network.provider),
    });

    walletClient = createWalletClient({
      chain: hardhat,
      transport: custom(hre.network.provider),
    });

    // Deploy contract using Ethers (since it's already configured)
    const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.waitForDeployment();
    contractAddress = (await nftMarketplace.getAddress()) as `0x${string}`;
  });

  it("Invariant: Contract balance should equal sum of active auction highest bids", async function () {
    // 1. Create a token
    const listingFee = parseEther("0.025");
    const price = parseEther("1");
    
    // Using viem to interact
    const artifact = await hre.artifacts.readArtifact("NFTMarketplace");
    
    // Helper to write contract
    const writeContract = async (account: `0x${string}`, functionName: string, args: any[], value?: bigint) => {
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: artifact.abi,
        functionName,
        args,
        account,
        value
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    };

    // Create Token (Mint) - This automatically lists it
    await writeContract(deployer, "createToken", ["https://token1.com", price], listingFee);
    
    // User1 buys the token so they can auction it
    await writeContract(user1, "createMarketSale", [1n], price);

    // 2. Create Auction
    // Token ID 1
    const tokenId = 1n;
    const minBid = parseEther("0.1");
    const duration = 3600n; // 1 hour

    // User1 creates auction
    await writeContract(user1, "createAuction", [tokenId, minBid, duration]);

    // 3. Place Bid
    const bidAmount = parseEther("0.2");
    await writeContract(user2, "placeBid", [tokenId], bidAmount);

    // Check Invariant
    const contractBalance = await publicClient.getBalance({ address: contractAddress });
    
    // In this contract:
    // - createToken: listing fee goes to owner immediately.
    // - createAuction: token checks into contract (ERC721 transfer), no ETH held.
    // - placeBid: holds the bid.
    // So expected balance = bidAmount.
    
    expect(contractBalance).to.equal(bidAmount);

    // 4. Place Higher Bid
    const higherBid = parseEther("0.3");
    await writeContract(deployer, "placeBid", [tokenId], higherBid);

    // Previous bid should be refunded, new bid held.
    const newContractBalance = await publicClient.getBalance({ address: contractAddress });
    expect(newContractBalance).to.equal(higherBid);
    
    // 5. End Auction
    // Move time forward
    await hre.network.provider.send("evm_increaseTime", [Number(duration) + 1]);
    await hre.network.provider.send("evm_mine");

    await writeContract(user1, "endAuction", [tokenId]);

    // Balance should be 0 (paid out to seller)
    const finalBalance = await publicClient.getBalance({ address: contractAddress });
    expect(finalBalance).to.equal(0n);
  });
});
