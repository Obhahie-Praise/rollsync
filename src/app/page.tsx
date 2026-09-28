import Navbar from "@/sections/navbar";
import HeroSection from "@/sections/hero";
import ProductSection from "@/sections/product";
import HowItWorksSection from "@/sections/how-it-works";
import UseCasesSection from "@/sections/use-cases";
import MobileSection from "@/sections/mobile";
import CtaSection from "@/sections/cta";
import Footer from "@/sections/footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProductSection />
        <HowItWorksSection />
        <UseCasesSection />
        <MobileSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
