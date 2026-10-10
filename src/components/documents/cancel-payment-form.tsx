"use client";

import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Textarea } from "@/components/ui/fields";
import { cancelPayment } from "@/app/app/actions";

export function CancelPaymentForm({ paymentId }: { paymentId: string }) {
  return (
    <ActionForm action={cancelPayment} className="space-y-4">
      <input type="hidden" name="payment_id" value={paymentId} />
      <Field label="Motif de l'annulation" hint="Visible sur le reçu et dans l'historique.">
        <Textarea name="reason" required minLength={3} placeholder="Ex. erreur de montant, paiement saisi deux fois…" />
      </Field>
      <Submit className="w-full bg-red-600 shadow-red-600/25 hover:bg-red-700">Annuler ce paiement</Submit>
    </ActionForm>
  );
}
