import { BigNFTSlider } from "@/components/BigNFTSlider";
import { HeroSection } from "@/components/HeroSection";
import { FeaturedDemoSections } from "@/components/FeaturedDemoSections";
import { FeaturedMainnetAssets } from "@/components/FeaturedMainnetAssets";
import { Service } from "@/components/Service";
import { DEMO_MAINNET_NFTS } from "@/lib/constants/mock-nfts";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-16">
      <HeroSection />
      <Service />
      <BigNFTSlider />

      <FeaturedDemoSections nfts={DEMO_MAINNET_NFTS} />

      <FeaturedMainnetAssets />
    </div>
  );
}
