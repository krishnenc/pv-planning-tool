import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the SolarMoris team — questions, feedback, or suggestions about the solar PV calculator.",
  alternates: { canonical: "/contact" },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
