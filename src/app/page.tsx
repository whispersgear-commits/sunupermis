import type { Metadata } from "next";
import { Hero } from "@/components/site/hero";
import { Showcase } from "@/components/site/showcase";
import { Faq, Features, FinalCta, Footer, Nav, Pricing, Stats, Steps, WhatsAppDemo } from "@/components/site/sections";
import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: "SunuPermis · Logiciel de gestion d'auto-école au Sénégal · Essai gratuit 3 jours" },
  description:
    "Gérez votre auto-école depuis votre téléphone : élèves, planning des leçons, paiements en plusieurs fois, reçus avec QR code et rappels WhatsApp. Essai gratuit de 3 jours.",
  alternates: { canonical: "/" },
};

/** Données structurées pour Google : le logiciel, ses prix, l'essai gratuit. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SunuPermis",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  url: LEGAL.site,
  inLanguage: "fr",
  description: "Logiciel de gestion pour auto-écoles : élèves, planning, paiements, reçus et rappels WhatsApp.",
  publisher: { "@type": "Organization", name: LEGAL.editor, url: LEGAL.site },
  offers: Object.values(PLANS).map((p) => ({
    "@type": "Offer",
    name: p.name,
    price: p.price,
    priceCurrency: "XOF",
    description: "Prix mensuel, 3 jours d'essai gratuit.",
  })),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
    </>
  );
}
