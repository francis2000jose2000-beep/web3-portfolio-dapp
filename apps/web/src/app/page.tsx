import { BigNFTSlider } from "@/components/BigNFTSlider";
import { HeroSection } from "@/components/HeroSection";
import { FeaturedDemoSections } from "@/components/FeaturedDemoSections";
import { NFTCard } from "@/components/NFTCard";
import { Service } from "@/components/Service";
import { ipfsToGatewayUrl } from "@/lib/api";
import { DEMO_MAINNET_NFTS } from "@/lib/constants/mock-nfts";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-16">
      <HeroSection />
      <Service />
      <BigNFTSlider />

      <FeaturedDemoSections nfts={DEMO_MAINNET_NFTS} />

      <section className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Featured Mainnet Assets</h2>
            <p className="mt-2 text-sm text-zinc-300">View-only demo NFTs to keep your portfolio UI fully populated.</p>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 sm:block">
            {DEMO_MAINNET_NFTS.length} items
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DEMO_MAINNET_NFTS.map((nft) => (
            <NFTCard
              key={nft.id}
                  href={`/nft-details/${nft.id}`}
              title={nft.name}
              subtitle={nft.collection}
              rightBadge="Mainnet"
              mediaUrl={ipfsToGatewayUrl(nft.image)}
              type={nft.type}
              isExternal={true}
              externalUrl={nft.externalUrl}
              priceLabel={`${nft.priceEth} ETH`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
