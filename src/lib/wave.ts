import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paiement de l'abonnement par Wave (API Checkout de Wave Business).
 *
 * 1. Le serveur crée une session de paiement ; Wave rend une URL.
 * 2. Le propriétaire paie dans l'application Wave.
 * 3. Wave appelle notre webhook, signé avec le secret partagé ; seul ce
 *    webhook peut prolonger l'abonnement.
 *
 * Les détails du format (en-tête `Wave-Signature`, champs de l'événement)
 * sont ceux de la documentation Wave ; voir `docs/PAIEMENT.md`.
 */

export function waveConfigured(): boolean {
  return Boolean(process.env.WAVE_API_KEY && process.env.WAVE_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createCheckout(input: {
  amount: number;
  clientReference: string;
  successUrl: string;
  errorUrl: string;
}): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WAVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(input.amount),
        currency: "XOF",
        client_reference: input.clientReference,
        success_url: input.successUrl,
        error_url: input.errorUrl,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; wave_launch_url?: string; message?: string };
    if (!res.ok || !body.id || !body.wave_launch_url) {
      return { ok: false, error: body.message ?? `Wave a répondu ${res.status}` };
    }
    return { ok: true, id: body.id, url: body.wave_launch_url };
  } catch {
    return { ok: false, error: "Wave est injoignable pour le moment." };
  }
}

/**
 * Vérifie l'en-tête `Wave-Signature: t=<horodatage>,v1=<signature>`.
 * La signature est un HMAC-SHA256 de `horodatage + corps brut` avec le secret
 * du webhook. Les événements trop anciens sont refusés (rejeu).
 */
export function verifyWaveSignature(rawBody: string, header: string | null, now = Date.now()): boolean {
  const secret = process.env.WAVE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = parts.t;
  const signatures = header
    .split(",")
    .filter((p) => p.trim().startsWith("v1="))
    .map((p) => p.trim().slice(3));
  if (!t || !signatures.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > 15 * 60) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(t + rawBody).digest("hex"));
  return signatures.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
