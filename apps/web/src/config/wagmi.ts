import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { hardhat, mainnet } from "wagmi/chains";

const hardhatRpcUrl: string = process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";

export const wagmiConfig = createConfig({
  chains: [hardhat, mainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [hardhat.id]: http(hardhatRpcUrl),
    [mainnet.id]: http()
  },
  ssr: true
});
