import { ethers, run, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  console.log(`🚀 Deploying to Base Sepolia...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  const MarketFactory = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await MarketFactory.deploy();

  console.log("Waiting for deployment...");
  await marketplace.waitForDeployment();

  const marketAddress = await marketplace.getAddress();
  console.log(`✅ NFTMarketplace deployed to: ${marketAddress}`);

  // Wait for 5 block confirmations to ensure propagation before verification
  console.log("Waiting for 5 block confirmations...");
  await marketplace.deploymentTransaction()?.wait(5);

  console.log("Verifying contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: marketAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }

  // Update frontend config
  const envPath = path.join(process.cwd(), "../../apps/web/.env.local");
  const envContent = `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketAddress}\n`;
  
  // Append or overwrite? The original script overwrites. Let's append if exists or create.
  // Actually, standard practice for .env.local is usually manual management, but here we are automating.
  // I'll read existing content and replace the specific key, or append if not found.
  
  let currentEnv = "";
  if (fs.existsSync(envPath)) {
    currentEnv = fs.readFileSync(envPath, "utf-8");
  }

  const newEnvLine = `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketAddress}`;
  
  if (currentEnv.includes("NEXT_PUBLIC_MARKETPLACE_ADDRESS=")) {
    currentEnv = currentEnv.replace(/NEXT_PUBLIC_MARKETPLACE_ADDRESS=.*\n?/, `${newEnvLine}\n`);
  } else {
    currentEnv += `\n${newEnvLine}\n`;
  }

  fs.writeFileSync(envPath, currentEnv, { encoding: "utf-8" });
  console.log(`🌐 Updated .env.local with new contract address.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
