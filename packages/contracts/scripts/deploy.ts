import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type DeploymentOutput = {
  network: string;
  chainId: number;
  deployedAt: string;
  contracts: {
    NFTMarketplace: string;
  };
};

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.log(`🚀 Deploying on network: ${network.name}`);
  
  const MarketFactory = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await MarketFactory.deploy();
  await marketplace.waitForDeployment();
  const marketAddress = await marketplace.getAddress();
  
  console.log(`✅ NFTMarketplace deployed to: ${marketAddress}`);

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const output: DeploymentOutput = {
    network: network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    contracts: { NFTMarketplace: marketAddress }
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const fileName = `${network.name}.json`;
  fs.writeFileSync(path.join(deploymentsDir, fileName), JSON.stringify(output, null, 2), { encoding: "utf-8" });

  const envPath = path.join(process.cwd(), "../../apps/web/.env.local"); // Assuming standard turborepo layout
  const envContent = `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketAddress}\n`;
  fs.writeFileSync(envPath, envContent, { encoding: "utf-8", flag: 'w' });
  
  console.log(`🌐 Automatically updated .env.local!`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});