import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { StatsBar } from "@/components/stats-bar";
import { FeatureCards } from "@/components/feature-cards";
import { RechartsPlaceholder } from "@/components/recharts-placeholder";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsBar />
        <FeatureCards />
        <RechartsPlaceholder />
      </main>
      <Footer />
    </div>
  );
}
