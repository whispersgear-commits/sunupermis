import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Une page déjà ouverte se réaffiche instantanément au retour (30 s),
    // au lieu de repasser par le serveur. Toute modification (action
    // serveur + revalidatePath) vide ce cache : rien de périmé après un clic.
    staleTimes: { dynamic: 30, static: 300 },
    // Charge seulement les icônes et fonctions utilisées.
    optimizePackageImports: ["lucide-react", "date-fns", "motion"],
  },
};

export default nextConfig;
