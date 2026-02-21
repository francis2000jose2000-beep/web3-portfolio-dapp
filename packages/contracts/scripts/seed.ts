import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type DeploymentOutput = {
  network: string;
  contractName: "NFTMarketplace";
  address: string;
  chainId: number;
  deployedAt: string;
};

async function getMarketplaceAddress(): Promise<string> {
  const deploymentsFile = path.join(process.cwd(), "deployments", `${network.name}.json`);
  if (fs.existsSync(deploymentsFile)) {
    const raw = fs.readFileSync(deploymentsFile, { encoding: "utf-8" });
    const parsed = JSON.parse(raw) as DeploymentOutput;
    return parsed.address;
  }

  const factory = await ethers.getContractFactory("NFTMarketplace");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  const chainId: number = Number((await ethers.provider.getNetwork()).chainId);
  const output: DeploymentOutput = {
    network: network.name,
    contractName: "NFTMarketplace",
    address,
    chainId,
    deployedAt: new Date().toISOString()
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentsDir, `${network.name}.json`), JSON.stringify(output, null, 2), {
    encoding: "utf-8"
  });

  return address;
}

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const marketplaceAddress = await getMarketplaceAddress();
  const marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);

  const listingFee = await marketplace.getListingFee();

  const seedItems: Array<{ tokenUri: string; priceEth: string }> = [
    { tokenUri: "https://picsum.photos/seed/nftmarket-1/800/800", priceEth: "0.01" },
    { tokenUri: "https://picsum.photos/seed/nftmarket-2/800/800", priceEth: "0.025" },
    { tokenUri: "https://picsum.photos/seed/nftmarket-3/800/800", priceEth: "0.04" },
    { tokenUri: "https://picsum.photos/seed/nftmarket-4/800/800", priceEth: "0.075" },
    { tokenUri: "https://picsum.photos/seed/nftmarket-5/800/800", priceEth: "0.1" }
  ];

  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Marketplace:", marketplaceAddress);
  console.log("Listing fee (wei):", listingFee.toString());

  for (let i = 0; i < seedItems.length; i += 1) {
    const item = seedItems[i];
    const priceWei = ethers.parseEther(item.priceEth);
    const tx = await marketplace.createToken(item.tokenUri, priceWei, { value: listingFee });
    const receipt = await tx.wait();
    console.log(`Seeded ${i + 1}/${seedItems.length}: price ${item.priceEth} ETH, tx ${receipt?.hash ?? ""}`);
  }

  console.log("Done.");

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
