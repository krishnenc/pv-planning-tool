interface Window {
  gtag: (
    command: "event" | "config" | "js" | "set",
    targetOrDate: string | Date,
    params?: Record<string, unknown>,
  ) => void
  dataLayer: unknown[]
}
