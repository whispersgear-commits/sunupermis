import Link from "next/link";

/** Case à cocher obligatoire à l'inscription : acceptation des conditions et de la politique de confidentialité. */
export function TermsCheckbox() {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-line bg-bg p-3 text-sm">
      <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" />
      <span className="text-muted">
        J'accepte les{" "}
        <Link href="/conditions" target="_blank" className="font-semibold text-brand-700 hover:underline">
          conditions d'utilisation
        </Link>{" "}
        et la{" "}
        <Link href="/confidentialite" target="_blank" className="font-semibold text-brand-700 hover:underline">
          politique de confidentialité
        </Link>
        .
      </span>
    </label>
  );
}
