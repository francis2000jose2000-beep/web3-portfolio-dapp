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

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  const factory = await ethers.getContractFactory("NFTMarketplace");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address: string = await contract.getAddress();
  const chainId: number = Number((await ethers.provider.getNetwork()).chainId);
  const networkName: string = network.name;

  const output: DeploymentOutput = {
    network: networkName,
    contractName: "NFTMarketplace",
    address,
    chainId,
    deployedAt: new Date().toISOString()
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const fileName = `${networkName}.json`;
  fs.writeFileSync(path.join(deploymentsDir, fileName), JSON.stringify(output, null, 2), {
    encoding: "utf-8"
  });

  console.log("Deployer:", deployer.address);
  console.log("NFTMarketplace deployed to:", address);
  console.log("Wrote deployment:", path.join("deployments", fileName));

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
