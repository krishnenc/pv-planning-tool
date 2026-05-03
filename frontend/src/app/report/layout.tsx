import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Solar Investment Report",
  robots: { index: false, follow: false },
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
