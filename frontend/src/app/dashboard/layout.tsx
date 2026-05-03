import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Solar Assessment Tool — CEB PV Scheme 2026 for Households",
  description:
    "Enter your monthly electricity usage or upload your CEB bill to get a free solar system sizing, payback period, NPV, IRR and CO₂ estimate tailored to your Mauritius home.",
  keywords: [
    "solar assessment Mauritius",
    "CEB solar PV scheme 2026",
    "solar calculator Mauritius",
    "upload CEB bill",
    "solar panel sizing",
    "how many solar panels do I need",
    "panneau solaire Maurice",
    "solar feasibility Mauritius",
  ],
  alternates: { canonical: "/dashboard" },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
