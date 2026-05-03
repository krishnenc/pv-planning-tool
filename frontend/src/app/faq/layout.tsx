import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FAQ — Solar PV in Mauritius | CEB Scheme, Costs & ROI Explained",
  description:
    "Answers to common questions about solar panels in Mauritius: CEB net metering, system sizing, payback periods, battery storage, NPV, IRR, DBM green loans and MRA VAT exemptions.",
  keywords: [
    "solar FAQ Mauritius",
    "CEB net metering explained",
    "solar payback period Mauritius",
    "solar NPV IRR explained",
    "DBM green loan solar",
    "MRA VAT solar exemption Mauritius",
    "battery storage Mauritius",
    "how does solar work Mauritius",
    "solar panel cost Mauritius",
  ],
  alternates: { canonical: "/faq" },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
