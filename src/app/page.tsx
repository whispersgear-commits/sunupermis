import { MotionRoot } from "@/components/motion-root";
import { Hero } from "@/components/site/hero";
import { Showcase } from "@/components/site/showcase";
import { Faq, Features, FinalCta, Footer, Nav, Pricing, Stats, Steps, WhatsAppDemo } from "@/components/site/sections";

export default function Home() {
  return (
    <MotionRoot>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Showcase />
        <Features />
        <WhatsAppDemo />
        <Steps />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </MotionRoot>
  );
}
