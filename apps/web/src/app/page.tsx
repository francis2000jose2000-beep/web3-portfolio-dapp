import { BigNFTSlider } from "@/components/BigNFTSlider";
import { HeroSection } from "@/components/HeroSection";
import { Service } from "@/components/Service";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-16">
      <HeroSection />
      <Service />
      <BigNFTSlider />
    </div>
  );
}
