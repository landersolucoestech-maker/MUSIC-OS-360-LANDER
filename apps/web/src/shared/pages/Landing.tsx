import { Header } from "./landing/components/Header";
import { Hero } from "./landing/components/Hero";
import { ModulesSection } from "./landing/components/ModulesSection";
import { HowItWorksSection } from "./landing/components/HowItWorksSection";
import { AudienceSection } from "./landing/components/AudienceSection";
import { PlansSection } from "./landing/components/PlansSection";
import { FinalCTA } from "./landing/components/FinalCTA";
import { Footer } from "./landing/components/Footer";
import { ContactModal } from "./landing/components/ContactModal";

export default function Landing() {
  return (
    <div className="landing-theme min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <ModulesSection />
      <HowItWorksSection />
      <AudienceSection />
      <PlansSection />
      <FinalCTA />
      <Footer />
      <ContactModal />
    </div>
  );
}
