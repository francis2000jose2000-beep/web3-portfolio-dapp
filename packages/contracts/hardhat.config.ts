import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const amoyRpcUrl: string | undefined = process.env.POLYGON_AMOY_RPC_URL;
const baseSepoliaRpcUrl: string = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const deployerPrivateKey: string | undefined = process.env.DEPLOYER_PRIVATE_KEY;
const basescanApiKey: string | undefined = process.env.BASESCAN_API_KEY;

const networks: HardhatUserConfig["networks"] = {
  hardhat: {},
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  baseSepolia: {
    url: baseSepoliaRpcUrl,
    chainId: 84532,
    accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
  }
};

if (amoyRpcUrl && deployerPrivateKey) {
  networks.amoy = {
    url: amoyRpcUrl,
    chainId: 80002,
    accounts: [deployerPrivateKey]
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks,
  etherscan: {
    apiKey: {
      baseSepolia: basescanApiKey || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
