import Link from "next/link";
import { CookieSettingsLink } from "./cookie-consent";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { LEGAL, LEGAL_PAGES } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { SunuAgence } from "@/components/sunu-agence";

/** Mise en page commune des trois documents légaux : sommaire, texte lisible, liens croisés. */
export function LegalPage({
  current,
  title,
  intro,
  toc,
  children,
}: {
  current: (typeof LEGAL_PAGES)[number]["href"];
  title: string;
  intro: React.ReactNode;
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <nav aria-label="Documents légaux" className="-mx-4 mb-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 print:hidden">
          <div className="flex w-max gap-1 rounded-2xl border border-line bg-surface p-1">
            {LEGAL_PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={p.href === current ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                  p.href === current ? "bg-asphalt text-white dark:bg-brand-600" : "text-muted hover:text-ink",
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Sommaire</p>
              <ol className="space-y-2 text-sm">
                {toc.map((t, i) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="text-muted transition hover:text-brand-700">
                      {i + 1}. {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <article className="min-w-0 rounded-3xl border border-line bg-surface p-6 sm:p-10 print:border-0 print:p-0">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">
              Version en vigueur au {LEGAL.updated} · {LEGAL.product}
            </p>
            <div className="mt-6 rounded-2xl bg-bg p-4 text-[15px] leading-relaxed">{intro}</div>

            <details className="mt-6 rounded-2xl border border-line p-4 lg:hidden print:hidden">
              <summary className="cursor-pointer text-sm font-bold">Sommaire</summary>
              <ol className="mt-3 space-y-2 text-sm">
                {toc.map((t, i) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="text-muted hover:text-brand-700">
                      {i + 1}. {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </details>

            <div className="mt-10 space-y-10">{children}</div>

            <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
              Une question sur ce document ? Écrivez à{" "}
              <a href={`mailto:${LEGAL.email}`} className="font-semibold text-brand-700 hover:underline">
                {LEGAL.email}
              </a>{" "}
              ou appelez le {LEGAL.phone}.
            </p>
          </article>
        </div>
        <div className="mt-8 flex justify-center print:hidden">
          <SunuAgence />
        </div>
      </main>
    </div>
  );
}

/** Une partie numérotée du document, ancrée pour le sommaire. */
export function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-extrabold tracking-tight">
        <span className="mr-2 text-brand-600">{n}.</span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/90 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{children}</div>
    </section>
  );
}

/** Liens vers les trois documents, pour les pieds de page. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted", className)}>
      {LEGAL_PAGES.map((p) => (
        <Link key={p.href} href={p.href} className="hover:text-ink hover:underline">
          {p.label}
        </Link>
      ))}
      <CookieSettingsLink />
    </nav>
  );
}
