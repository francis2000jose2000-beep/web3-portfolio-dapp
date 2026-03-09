import { createConfig, http } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { baseSepolia, hardhat, mainnet, polygon } from "wagmi/chains";

const hardhatRpcUrl: string = process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";

export const wagmiConfig = createConfig({
  chains: [hardhat, baseSepolia, mainnet, polygon],
  connectors: [
    metaMask(),
    injected({ target: "phantom" }),
  ],
  transports: {
    [hardhat.id]: http(hardhatRpcUrl),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
  },
  ssr: true,
});
