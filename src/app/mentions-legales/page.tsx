import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergement et contact du site SunuPermis.",
  alternates: { canonical: "/mentions-legales" },
};

const TOC = [
  { id: "editeur", label: "Éditeur" },
  { id: "publication", label: "Directeur de la publication" },
  { id: "hebergement", label: "Hébergement" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "donnees", label: "Données personnelles" },
  { id: "contact", label: "Contact" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      current="/mentions-legales"
      title="Mentions légales"
      toc={TOC}
      intro={<>Informations sur l'éditeur et l'hébergeur du site {LEGAL.site.replace(/^https?:\/\//, "")}, conformément à la loi n° 2008-08 du 25 janvier 2008 sur les transactions électroniques.</>}
    >
      <Section id="editeur" n={1} title="Éditeur">
        <div className="mb-3 flex items-center gap-4 rounded-2xl bg-[#F4EBD9] p-4 text-[#2D6A4F]">
          <Image src="/brand/sunu-agence-baobab.png" alt="" width={48} height={48} className="h-12 w-12 rounded-full" />
          <p className="font-semibold">
            {LEGAL.product} est un produit de {LEGAL.editor}.
          </p>
        </div>
        <dl>
          <Row label="Nom">{LEGAL.editor}</Row>
          <Row label="Statut">{LEGAL.status}</Row>
          {LEGAL.address && <Row label="Adresse">{LEGAL.address}</Row>}
          <Row label="Ville">{LEGAL.city}</Row>
          {LEGAL.ninea && <Row label="NINEA">{LEGAL.ninea}</Row>}
          {LEGAL.rccm && <Row label="RCCM">{LEGAL.rccm}</Row>}
          <Row label="E-mail">
            <a href={`mailto:${LEGAL.email}`} className="text-brand-700 hover:underline">
              {LEGAL.email}
            </a>
          </Row>
          <Row label="Téléphone">
            <a href={`tel:${LEGAL.phone.replace(/\s/g, "")}`} className="text-brand-700 hover:underline">
              {LEGAL.phone}
            </a>
          </Row>
        </dl>
      </Section>

      <Section id="publication" n={2} title="Directeur de la publication">
        <p>{LEGAL.director}, pour {LEGAL.editor}.</p>
      </Section>

      <Section id="hebergement" n={3} title="Hébergement">
        <dl>
          <Row label="Site et application">Netlify, Inc. · San Francisco, Californie, États-Unis · netlify.com</Row>
          <Row label="Base de données">Supabase, Inc. · données hébergées en Irlande (Union européenne) · supabase.com</Row>
        </dl>
      </Section>

      <Section id="propriete" n={4} title="Propriété intellectuelle">
        <p>
          L'ensemble du site et du logiciel {LEGAL.product} (textes, code, logo, interface, éléments graphiques) est la propriété de {LEGAL.editor}. Toute
          reproduction ou réutilisation, totale ou partielle, sans autorisation écrite est interdite. Les données saisies par chaque auto-école restent sa
          propriété.
        </p>
      </Section>

      <Section id="donnees" n={5} title="Données personnelles">
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite" className="font-semibold text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          . L'utilisation du logiciel est encadrée par les{" "}
          <Link href="/conditions" className="font-semibold text-brand-700 hover:underline">
            conditions générales d'utilisation
          </Link>
          .
        </p>
        {LEGAL.cdpDeclaration && <p>Déclaration auprès de la Commission de Protection des Données Personnelles : {LEGAL.cdpDeclaration}.</p>}
      </Section>

      <Section id="contact" n={6} title="Contact">
        <p>
          Pour toute question, réclamation ou demande concernant le site : {LEGAL.email} · {LEGAL.phone}.
        </p>
      </Section>
    </LegalPage>
  );
}
