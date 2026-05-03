"use client"

import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// ─── Page-view tracker ────────────────────────────────────────────────────────
// Wrapped in Suspense because useSearchParams() requires it in App Router.

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_ID || typeof window.gtag === "undefined") return
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : "")
    window.gtag("event", "page_view", { page_path: url })
  }, [pathname, searchParams])

  return null
}

// ─── Public event helper ──────────────────────────────────────────────────────

export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined" || typeof window.gtag === "undefined") return
  window.gtag("event", action, params)
}

// ─── Root component (render null when GA_ID is not configured) ────────────────

export function GoogleAnalytics() {
  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { send_page_view: false });
      `}</Script>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  )
}
