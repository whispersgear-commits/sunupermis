import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation du logiciel SunuPermis pour les auto-écoles.",
};

const TOC = [
  { id: "objet", label: "Objet" },
  { id: "definitions", label: "Définitions" },
  { id: "compte", label: "Compte et accès" },
  { id: "essai", label: "Essai gratuit" },
  { id: "tarifs", label: "Abonnement et paiement" },
  { id: "echeance", label: "Échéance et suspension" },
  { id: "engagements", label: "Vos engagements" },
  { id: "eleves", label: "Données des élèves et messages" },
  { id: "recus", label: "Reçus et factures" },
  { id: "disponibilite", label: "Disponibilité du service" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "resiliation", label: "Résiliation et récupération des données" },
  { id: "modification", label: "Modification des conditions" },
  { id: "droit", label: "Droit applicable et litiges" },
];

export default function ConditionsPage() {
  return (
    <LegalPage
      current="/conditions"
      title="Conditions générales d'utilisation"
      toc={TOC}
      intro={
        <>
          Ces conditions encadrent l'utilisation de <b>{LEGAL.product}</b>, le logiciel en ligne de gestion d'auto-école édité par {LEGAL.editor} ({LEGAL.city}).
          En créant un compte ou en utilisant le service, vous les acceptez. Lisez aussi notre <Link href="/confidentialite" className="font-semibold text-brand-700 hover:underline">politique de confidentialité</Link>.
        </>
      }
    >
      <Section id="objet" n={1} title="Objet">
        <p>
          {LEGAL.product} permet à une auto-école de gérer ses élèves, son planning de leçons, ses moniteurs et ses véhicules, les forfaits payés en plusieurs fois,
          les examens, les rappels WhatsApp, les reçus de paiement et la caisse. Les présentes conditions fixent les règles d'accès et d'utilisation de ce service.
        </p>
      </Section>

      <Section id="definitions" n={2} title="Définitions">
        <ul>
          <li>
            <b>Auto-école cliente</b> : l'établissement qui crée un espace sur {LEGAL.product}. Son <b>propriétaire</b> est la personne qui a créé l'espace.
          </li>
          <li>
            <b>Utilisateur</b> : toute personne disposant d'un compte dans l'espace de l'auto-école (propriétaire, secrétaire, moniteur).
          </li>
          <li>
            <b>Élève</b> : personne inscrite par l'auto-école dans le logiciel. L'élève n'a pas de compte ; ses données sont saisies par l'auto-école.
          </li>
        </ul>
      </Section>

      <Section id="compte" n={3} title="Compte et accès">
        <ul>
          <li>Le compte est personnel. Chaque secrétaire ou moniteur reçoit sa propre invitation : un même identifiant ne doit pas être partagé.</li>
          <li>Vous gardez votre mot de passe secret et nous prévenez sans délai de toute utilisation non autorisée de votre compte.</li>
          <li>
            Le propriétaire décide qui accède à l'espace et avec quel rôle. Un moniteur voit ses leçons et les élèves, jamais les paiements ; il peut être retiré à
            tout moment par le propriétaire.
          </li>
          <li>Les informations fournies à l'inscription (nom de l'auto-école, téléphone, e-mail) doivent être exactes et tenues à jour.</li>
        </ul>
      </Section>

      <Section id="essai" n={4} title="Essai gratuit">
        <p>
          Chaque nouvelle auto-école bénéficie de <b>30 jours d'essai gratuit</b>, sans moyen de paiement à fournir. À la fin de l'essai, l'accès au logiciel
          nécessite un abonnement payant. Aucun prélèvement n'a lieu automatiquement.
        </p>
      </Section>

      <Section id="tarifs" n={5} title="Abonnement et paiement">
        <p>Les formules en vigueur sont, par mois et toutes taxes comprises le cas échéant :</p>
        <ul>
          {Object.values(PLANS).map((p) => (
            <li key={p.name}>
              <b>{p.name}</b> : {money(p.price)} par mois ({p.users === null ? "comptes illimités" : `${p.users} compte${p.users > 1 ? "s" : ""}`}).
            </li>
          ))}
        </ul>
        <p>
          L'abonnement annuel est facturé au prix de 10 mois (2 mois offerts). Le paiement s'effectue en ligne par Wave ou, à défaut, selon les modalités
          communiquées par {LEGAL.product}. La période payée s'ajoute à la date de fin en cours : payer avant l'échéance ne fait rien perdre.
        </p>
        <p>
          L'abonnement n'est <b>pas renouvelé automatiquement</b> : chaque période est payée volontairement par le propriétaire. Toute période commencée est due et
          n'est pas remboursée au prorata, sauf erreur de facturation ou interruption du service de plus de 7 jours consécutifs imputable à {LEGAL.product}.
        </p>
        <p>Les tarifs peuvent évoluer ; un nouveau tarif ne s'applique qu'à la période suivante et est annoncé au moins 30 jours à l'avance.</p>
      </Section>

      <Section id="echeance" n={6} title="Échéance et suspension">
        <p>
          À la fin de l'essai ou de la période payée, l'accès aux pages de gestion est suspendu jusqu'au paiement ; les pages Abonnement et Réglages restent
          accessibles. <b>Vos données ne sont pas effacées</b> pendant la suspension : elles réapparaissent dès le renouvellement (voir la durée de conservation
          dans la politique de confidentialité).
        </p>
      </Section>

      <Section id="engagements" n={7} title="Vos engagements">
        <p>En utilisant {LEGAL.product}, vous vous engagez à :</p>
        <ul>
          <li>n'utiliser le service que pour la gestion légitime de votre auto-école, dans le respect des lois du Sénégal ;</li>
          <li>ne saisir que des informations exactes, et ne pas enregistrer de paiements fictifs ni émettre de reçus pour des sommes non reçues ;</li>
          <li>ne pas tenter d'accéder aux données d'une autre auto-école, de contourner les protections du service ou d'en perturber le fonctionnement ;</li>
          <li>ne pas revendre ni mettre le service à disposition de tiers en dehors de votre établissement.</li>
        </ul>
      </Section>

      <Section id="eleves" n={8} title="Données des élèves et messages">
        <p>
          L'auto-école est <b>responsable des données de ses élèves</b> qu'elle saisit dans {LEGAL.product} (identité, téléphone, paiements, leçons, examens). Elle
          informe ses élèves de cette utilisation, recueille leur accord pour être contactés par WhatsApp et, pour un élève mineur, celui de son représentant
          légal. {LEGAL.product} traite ces données pour son compte, uniquement pour fournir le service.
        </p>
        <p>
          Les rappels et relances WhatsApp (envoyés en un clic ou automatiquement) partent au nom de l'auto-école. Elle reste responsable de leur opportunité et
          cesse d'écrire à un élève qui le demande.
        </p>
      </Section>

      <Section id="recus" n={9} title="Reçus et factures">
        <p>
          Chaque paiement enregistré produit un reçu numéroté dans un ordre continu, avec un code de vérification. Un paiement ne peut être ni modifié ni
          supprimé ; seul le propriétaire peut l'annuler, avec un motif, et le reçu reste consultable avec la mention « annulé ». Ce fonctionnement garantit la
          traçabilité de la caisse.
        </p>
        <p>
          Les reçus et factures générés sont des documents établis par l'auto-école, sous sa responsabilité. Ils ne la dispensent pas de ses obligations
          comptables et fiscales.
        </p>
      </Section>

      <Section id="disponibilite" n={10} title="Disponibilité du service">
        <p>
          {LEGAL.product} met tout en œuvre pour que le service soit accessible en permanence et que les données soient sauvegardées. Des interruptions peuvent
          toutefois survenir (maintenance, panne d'un prestataire, coupure de réseau). Les maintenances prévues sont faites, autant que possible, en dehors des
          heures d'ouverture des auto-écoles.
        </p>
        <p>Le service est accessible depuis un navigateur récent, sur téléphone ou ordinateur, avec une connexion internet.</p>
      </Section>

      <Section id="responsabilite" n={11} title="Responsabilité">
        <p>
          {LEGAL.product} est un outil d'aide à la gestion. L'auto-école reste seule responsable de son activité, de ses décisions, de ses relations avec ses
          élèves et de la vérification des informations qu'elle saisit.
        </p>
        <p>
          Sauf faute lourde ou intentionnelle, la responsabilité de {LEGAL.product} est limitée aux dommages directs et plafonnée aux sommes payées par
          l'auto-école au titre des 12 derniers mois d'abonnement. {LEGAL.product} n'est pas responsable des pertes indirectes (manque à gagner, perte de
          clientèle) ni des défaillances des réseaux et services tiers (opérateurs, WhatsApp, Wave).
        </p>
      </Section>

      <Section id="propriete" n={12} title="Propriété intellectuelle">
        <p>
          Le logiciel, son code, sa marque et ses éléments graphiques appartiennent à {LEGAL.editor}. L'abonnement donne un droit d'utilisation personnel, non
          exclusif et non transférable, pour la durée de l'abonnement. Les données saisies par l'auto-école restent sa propriété.
        </p>
      </Section>

      <Section id="resiliation" n={13} title="Résiliation et récupération des données">
        <ul>
          <li>Vous pouvez arrêter à tout moment : il suffit de ne pas renouveler l'abonnement. Vous pouvez aussi demander la fermeture de votre espace par e-mail.</li>
          <li>Les encaissements s'exportent à tout moment au format CSV (page Paiements). Sur demande, nous vous remettons une copie de l'ensemble de vos données.</li>
          <li>
            {LEGAL.product} peut suspendre ou fermer un espace en cas de manquement grave aux présentes conditions (fraude, atteinte à la sécurité, usage
            illicite), après mise en demeure restée sans effet pendant 8 jours, sauf urgence.
          </li>
        </ul>
      </Section>

      <Section id="modification" n={14} title="Modification des conditions">
        <p>
          Ces conditions peuvent évoluer avec le service. Toute modification importante est annoncée dans le logiciel au moins 30 jours avant son entrée en
          vigueur. Continuer à utiliser le service après cette date vaut acceptation de la nouvelle version.
        </p>
      </Section>

      <Section id="droit" n={15} title="Droit applicable et litiges">
        <p>
          Les présentes conditions sont soumises au droit sénégalais. En cas de désaccord, nous cherchons d'abord une solution à l'amiable : écrivez-nous à{" "}
          {LEGAL.email}. À défaut d'accord dans un délai de 30 jours, le litige est porté devant les juridictions compétentes de Dakar.
        </p>
      </Section>
    </LegalPage>
  );
}
