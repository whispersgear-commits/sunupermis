import Link from "next/link";
import { SunuAgence } from "@/components/sunu-agence";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-6xl">🚧</p>
        <h1 className="mt-4 text-2xl font-extrabold">Route barrée</h1>
        <p className="mt-2 text-muted">Cette page n'existe pas ou n'est plus accessible.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 font-semibold text-white">
          Revenir à l'accueil
        </Link>
        <div className="mt-10">
          <SunuAgence />
        </div>
      </div>
    </div>
  );
}
