/** Squelette affiché pendant le chargement d'une page de l'application. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="animate-pulse">
      <div className="mb-8 h-9 w-56 rounded-xl bg-line" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 rounded-3xl border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-3xl border border-line bg-surface" />
    </div>
  );
}
