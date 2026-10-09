/**
 * Envoi automatique par l'API WhatsApp Cloud (Meta).
 *
 * Un message envoyé à l'initiative de l'entreprise doit utiliser un
 * « modèle » validé par Meta à l'avance. Les deux modèles attendus, et leur
 * texte, sont décrits dans `docs/WHATSAPP.md`. Sans configuration, l'envoi
 * automatique est simplement désactivé et l'application garde les liens
 * WhatsApp pré-remplis.
 *
 * Aucun import « @/… » ni « server-only » ici : ce module est aussi utilisé
 * par la tâche planifiée.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export const TEMPLATES = {
  lesson: () => process.env.WHATSAPP_TEMPLATE_LESSON || "rappel_lecon",
  payment: () => process.env.WHATSAPP_TEMPLATE_PAYMENT || "rappel_paiement",
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendTemplate(to: string, template: string, params: string[]): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp non configuré" };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "fr" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok || !body.messages?.[0]?.id) {
      return { ok: false, error: body.error?.message?.slice(0, 300) ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: body.messages[0].id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erreur réseau" };
  }
}
