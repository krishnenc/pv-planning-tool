import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConfigInitializer } from "@/components/config-initializer";
import { GoogleAnalytics } from "@/components/google-analytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://solarmoris.mu"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SolarMoris — Free Solar PV Calculator for Mauritius | CEB 2026 Scheme",
    template: "%s | SolarMoris",
  },
  description:
    "Free solar feasibility calculator for Mauritius households. Estimate solar panel system size, payback period, NPV, IRR and CO₂ savings using CEB 2026 tariff bands and the new Solar PV Scheme for Households.",
  keywords: [
    "solar calculator Mauritius",
    "CEB solar scheme 2026",
    "solar PV Mauritius",
    "panneau solaire Maurice",
    "solar panels Mauritius",
    "CEB net metering",
    "hybrid solar system",
    "solar feasibility tool",
    "solar ROI calculator",
    "photovoltaic Mauritius",
    "renewable energy Mauritius",
    "solar payback period",
    "CEB electricity tariff",
    "battery storage Mauritius",
    "DBM green loan",
    "MRA VAT solar exemption",
    "solar PV scheme households",
    "SolarMoris",
    "CEB",
    "solar",
    "PV",
  ],
  authors: [
    { name: "Krishnen Chedambarum" },
    { name: "Sundeepsingh Neerunjun" },
  ],
  creator: "SolarMoris",
  openGraph: {
    type: "website",
    locale: "en_MU",
    url: SITE_URL,
    title: "SolarMoris — Free Solar PV Calculator for Mauritius",
    description:
      "Estimate solar panel sizing, payback period, NPV & CO₂ savings for your Mauritius home. Built for the CEB Solar PV Scheme 2026.",
    siteName: "SolarMoris",
  },
  twitter: {
    card: "summary",
    title: "SolarMoris — Free Solar PV Calculator for Mauritius",
    description:
      "Estimate solar panel sizing, payback period, NPV & CO₂ savings for your Mauritius home. Built for the CEB Solar PV Scheme 2026.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "SolarMoris",
              url: SITE_URL,
              description:
                "Free solar feasibility calculator for Mauritius households. Estimate system size, payback period, NPV and CO₂ savings using CEB 2026 tariff bands.",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "MUR" },
              author: [
                { "@type": "Person", name: "Krishnen Chedambarum" },
                { "@type": "Person", name: "Sundeepsingh Neerunjun" },
              ],
              keywords:
                "solar Mauritius, CEB solar scheme 2026, solar PV calculator, panneau solaire Maurice, net metering, photovoltaic",
              inLanguage: "en",
              isAccessibleForFree: true,
            }),
          }}
        />
        <GoogleAnalytics />
        <ConfigInitializer />
        {children}
      </body>
    </html>
  );
}
