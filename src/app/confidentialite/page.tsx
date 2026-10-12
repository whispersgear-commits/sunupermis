import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment SunuPermis collecte, utilise et protège les données des auto-écoles et de leurs élèves.",
};

const TOC = [
  { id: "roles", label: "Qui est responsable ?" },
  { id: "donnees", label: "Données traitées" },
  { id: "finalites", label: "Pourquoi nous les utilisons" },
  { id: "acces", label: "Qui y a accès" },
  { id: "prestataires", label: "Prestataires et hébergement" },
  { id: "transferts", label: "Données hors du Sénégal" },
  { id: "duree", label: "Durée de conservation" },
  { id: "securite", label: "Sécurité" },
  { id: "cookies", label: "Cookies" },
  { id: "droits", label: "Vos droits" },
  { id: "recu-public", label: "Page publique de vérification des reçus" },
  { id: "contact", label: "Contact et réclamations" },
];

export default function ConfidentialitePage() {
  return (
    <LegalPage
      current="/confidentialite"
      title="Politique de confidentialité"
      toc={TOC}
      intro={
        <>
          Cette politique explique quelles données {LEGAL.product} traite, pourquoi, qui y a accès et comment exercer vos droits, conformément à la{" "}
          <b>loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel</b>. En résumé : nous ne vendons aucune donnée,
          nous n'affichons aucune publicité, et chaque auto-école ne voit que ses propres données.
        </>
      }
    >
      <Section id="roles" n={1} title="Qui est responsable ?">
        <ul>
          <li>
            Pour les <b>comptes des utilisateurs</b> (propriétaire, secrétaire, moniteur) et la <b>facturation de l'abonnement</b>, le responsable du traitement est{" "}
            {LEGAL.editor}, éditeur de {LEGAL.product} ({LEGAL.city}, {LEGAL.email}).
          </li>
          <li>
            Pour les <b>données des élèves</b> saisies par une auto-école, le responsable du traitement est <b>l'auto-école</b>. {LEGAL.product} agit comme
            sous-traitant : il traite ces données uniquement sur ses instructions et pour lui fournir le service. Un élève qui souhaite exercer ses droits
            s'adresse d'abord à son auto-école ; nous l'aidons à y répondre.
          </li>
        </ul>
      </Section>

      <Section id="donnees" n={2} title="Données traitées">
        <p>
          <b>Utilisateurs</b> : nom, adresse e-mail, mot de passe (enregistré sous forme chiffrée, jamais lisible), rôle dans l'auto-école, date d'inscription.
        </p>
        <p>
          <b>Auto-école</b> : nom, ville, adresse, téléphone, formule d'abonnement, historique des paiements d'abonnement.
        </p>
        <p>
          <b>Élèves</b> : nom, numéro de téléphone (WhatsApp), type de permis, forfait et échéancier, paiements et reçus, leçons (date, moniteur, voiture,
          présence), examens et résultats, notes libres saisies par l'auto-école.
        </p>
        <p>
          <b>Moniteurs et véhicules</b> : nom et téléphone du moniteur, nom et immatriculation des voitures.
        </p>
        <p>
          <b>Données techniques</b> : journaux de connexion et d'erreurs conservés par nos hébergeurs pour la sécurité, journal des messages WhatsApp envoyés
          automatiquement (destinataire, date, statut).
        </p>
        <p>Nous ne collectons ni données bancaires (le paiement Wave se fait chez Wave), ni localisation, ni données de santé.</p>
      </Section>

      <Section id="finalites" n={3} title="Pourquoi nous les utilisons">
        <ul>
          <li>Fournir le service : gestion des élèves, planning, paiements, reçus, examens, caisse (exécution du contrat avec l'auto-école).</li>
          <li>Envoyer les rappels de leçons et relances de paiement WhatsApp demandés par l'auto-école.</li>
          <li>Gérer les comptes, les invitations, l'abonnement et sa facturation.</li>
          <li>Assurer la sécurité du service, prévenir la fraude et corriger les erreurs (intérêt légitime).</li>
          <li>Répondre à vos demandes d'assistance.</li>
        </ul>
        <p>Les données ne sont jamais vendues, louées ni utilisées à des fins publicitaires.</p>
      </Section>

      <Section id="acces" n={4} title="Qui y a accès">
        <ul>
          <li>
            <b>Chaque auto-école ne voit que ses propres données.</b> Cette séparation est appliquée par la base de données elle-même, et non par la seule
            interface.
          </li>
          <li>Dans une auto-école : le propriétaire et la secrétaire voient tout ; un moniteur voit les élèves et ses leçons, jamais les paiements.</li>
          <li>L'éditeur n'accède aux données d'une auto-école que pour l'assistance demandée par celle-ci, la sécurité, ou une obligation légale.</li>
        </ul>
      </Section>

      <Section id="prestataires" n={5} title="Prestataires et hébergement">
        <p>{LEGAL.product} s'appuie sur des prestataires techniques, choisis pour leurs garanties de sécurité :</p>
        <ul>
          <li>
            <b>Supabase</b> : base de données et authentification. Les données sont hébergées dans un centre de données situé en <b>Irlande (Union européenne)</b>.
          </li>
          <li>
            <b>Netlify</b> : hébergement du site et exécution de l'application (États-Unis).
          </li>
          <li>
            <b>Meta (WhatsApp Business)</b> : uniquement si l'envoi automatique des rappels est activé ; reçoit le numéro de l'élève et le texte du rappel.
          </li>
          <li>
            <b>Wave</b> : paiement de l'abonnement en ligne ; reçoit le montant et une référence, jamais les données des élèves.
          </li>
        </ul>
        <p>
          Les boutons « WhatsApp » qui ouvrent un message pré-rempli utilisent l'application WhatsApp de votre téléphone : le message part de votre numéro, sous
          votre contrôle.
        </p>
      </Section>

      <Section id="transferts" n={6} title="Données hors du Sénégal">
        <p>
          L'hébergement en Union européenne et le recours à des prestataires établis aux États-Unis impliquent un transfert de données hors du Sénégal. Ces
          transferts se font dans le cadre prévu par la loi n° 2008-12 et vers des prestataires offrant des garanties contractuelles et techniques de protection
          (chiffrement, contrôle d'accès, engagements de confidentialité).
        </p>
      </Section>

      <Section id="duree" n={7} title="Durée de conservation">
        <ul>
          <li>Pendant toute la durée de l'abonnement, y compris les périodes de suspension pour non-renouvellement.</li>
          <li>
            Après la fermeture d'un espace ou 12 mois sans renouvellement, les données sont supprimées, sauf les pièces de caisse (reçus, paiements) que la
            réglementation comptable OHADA impose de conserver 10 ans ; elles sont alors archivées et ne sont plus utilisées.
          </li>
          <li>L'auto-école peut à tout moment demander la suppression anticipée des données d'un élève, sous réserve de cette obligation comptable.</li>
          <li>Les journaux techniques sont conservés au plus 12 mois.</li>
        </ul>
      </Section>

      <Section id="securite" n={8} title="Sécurité">
        <ul>
          <li>Connexions chiffrées (HTTPS) et mots de passe stockés sous forme chiffrée.</li>
          <li>Cloisonnement des auto-écoles et des rôles directement dans la base de données.</li>
          <li>Paiements non modifiables et numérotés, pour qu'aucune somme encaissée ne disparaisse.</li>
          <li>Sauvegardes régulières assurées par l'hébergeur de la base de données.</li>
        </ul>
        <p>En cas de violation de données susceptible de vous porter atteinte, nous vous en informons dans les meilleurs délais.</p>
      </Section>

      <Section id="cookies" n={9} title="Cookies">
        <p>
          {LEGAL.product} n'utilise que des <b>cookies strictement nécessaires</b> : ceux qui maintiennent votre connexion. Aucun cookie publicitaire, aucun outil
          de mesure d'audience, aucun traceur de réseau social. Ces cookies ne demandent donc pas de consentement ; les supprimer vous déconnecte.
        </p>
      </Section>

      <Section id="droits" n={10} title="Vos droits">
        <p>Conformément à la loi n° 2008-12, vous disposez des droits suivants sur les données qui vous concernent :</p>
        <ul>
          <li>
            <b>Accès</b> : savoir si des données vous concernant sont traitées et en obtenir une copie ;
          </li>
          <li>
            <b>Rectification</b> : faire corriger des données inexactes ou incomplètes ;
          </li>
          <li>
            <b>Opposition</b> : vous opposer, pour un motif légitime, à un traitement, et à tout moment aux messages de relance ;
          </li>
          <li>
            <b>Suppression</b> : faire effacer des données dont la conservation n'est plus nécessaire.
          </li>
        </ul>
        <p>
          Utilisateurs : écrivez à <b>{LEGAL.email}</b>. Élèves : adressez-vous à votre auto-école, ou à nous si vous ne parvenez pas à la joindre. Nous
          répondons dans un délai d'un mois. Une pièce d'identité peut être demandée en cas de doute sur l'identité du demandeur.
        </p>
      </Section>

      <Section id="recu-public" n={11} title="Page publique de vérification des reçus">
        <p>
          Chaque reçu porte un QR code menant à une page publique qui confirme son authenticité. Cette page n'affiche que le nom de l'auto-école, le numéro, le
          montant, le moyen et la date du paiement, ainsi que le <b>prénom et l'initiale du nom</b> de l'élève. Aucun numéro de téléphone n'y figure, et le
          lien, composé d'un code aléatoire, ne peut pas être deviné.
        </p>
      </Section>

      <Section id="contact" n={12} title="Contact et réclamations">
        <p>
          Pour toute question : {LEGAL.email} · {LEGAL.phone}.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la <b>Commission de Protection des Données Personnelles (CDP)</b> du Sénégal
          (www.cdp.sn).
        </p>
        {LEGAL.cdpDeclaration && <p>Déclaration auprès de la CDP : {LEGAL.cdpDeclaration}.</p>}
      </Section>
    </LegalPage>
  );
}
