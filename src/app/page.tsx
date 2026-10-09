import { MotionRoot } from "@/components/motion-root";
import { Hero } from "@/components/site/hero";
import { Faq, Features, FinalCta, Footer, Nav, Pricing, Stats, Steps, WhatsAppDemo } from "@/components/site/sections";

export default function Home() {
  return (
    <MotionRoot>
      <Nav />
      <main>
        <Hero />
        <Stats />
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
