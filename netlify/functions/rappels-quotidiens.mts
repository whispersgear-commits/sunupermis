import type { Config } from "@netlify/functions";

/**
 * Tâche planifiée : chaque jour à 18 h UTC (18 h à Dakar), demande à
 * l'application d'envoyer les rappels WhatsApp du lendemain.
 *
 * La logique vit dans l'application (`/api/cron/rappels`) ; cette fonction ne
 * fait que la déclencher, avec le secret partagé.
 */
export default async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return;
  const res = await fetch(`${base}/api/cron/rappels`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  console.log("rappels", res.status, await res.text());
};

export const config: Config = {
  schedule: "0 18 * * *",
};
