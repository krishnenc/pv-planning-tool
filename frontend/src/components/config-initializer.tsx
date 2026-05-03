"use client"

import { useEffect } from "react"
import { api, CONFIG_KEY } from "@/lib/api"

export function ConfigInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(CONFIG_KEY) !== null) return
    api.getConfig()
      .then((cfg) => localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)))
      .catch(() => { /* bundled DEFAULT_CONFIG fallback used by other pages */ })
  }, [])

  return null
}
