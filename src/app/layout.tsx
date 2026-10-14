import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { LEGAL } from "@/lib/legal";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(LEGAL.site),
  applicationName: "SunuPermis",
  openGraph: {
    type: "website",
    locale: "fr_SN",
    siteName: "SunuPermis",
    title: "SunuPermis — le logiciel des auto-écoles",
    description: "Élèves, planning des leçons, paiements en plusieurs fois, reçus et rappels WhatsApp : gérez votre auto-école depuis votre téléphone.",
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "SunuPermis — le logiciel des auto-écoles",
    template: "%s · SunuPermis",
  },
  description:
    "Élèves, planning des leçons, paiements en plusieurs fois et rappels WhatsApp : gérez votre auto-école depuis votre téléphone.",
};

export const viewport: Viewport = {
  themeColor: "#0b8a5a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <CookieConsent />
      </body>
    </html>
  );
}
