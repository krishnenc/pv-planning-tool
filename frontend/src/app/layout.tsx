import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SolarMoris — Hybrid Solar Feasibility & ROI Planning",
    template: "%s | SolarMoris",
  },
  description:
    "Calculate hybrid solar system sizing, payback period, IRR, and CO₂ savings for Mauritius properties using CEB 2026 tariff bands.",
  keywords: [
    "solar",
    "Mauritius",
    "CEB",
    "photovoltaic",
    "battery storage",
    "net metering",
    "ROI",
    "feasibility",
    "renewable energy",
  ],
  openGraph: {
    type: "website",
    locale: "en_MU",
    title: "SolarMoris",
    description: "Hybrid Solar Feasibility & ROI Planning Tool — CEB 2026",
    siteName: "SolarMoris",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
