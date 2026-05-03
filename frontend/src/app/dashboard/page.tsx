"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sun, Upload, Plus, Trash2, Loader2, CheckCircle2, Settings, HelpCircle } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { api, BillParseResponse } from "@/lib/api"
import { trackEvent } from "@/components/google-analytics"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Appliance {
  id: number
  preset: string   // catalog key, or "other" for custom entry, or "" if not yet chosen
  name: string     // resolved display name (catalog label or user-typed custom name)
  wattage: string
  hoursPerDay: string
  quantity: string
}

// ─── Small reusable UI pieces ────────────────────────────────────────────────

function IconBadge({
  emoji,
  bg,
  text,
}: {
  emoji: string
  bg: string
  text: string
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg text-lg shrink-0",
        bg,
        text
      )}
    >
      {emoji}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  )
}

function Tooltip({ content }: { content: string }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        aria-label="More information"
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
          "bg-muted text-muted-foreground",
          "hover:bg-primary hover:text-primary-foreground transition-colors"
        )}
      >
        ?
      </button>
      <span
        className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-md",
          "bg-foreground text-background text-xs px-3 py-2 shadow-lg text-center",
          "opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20"
        )}
      >
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
      </span>
    </span>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ─── Appliance catalog ────────────────────────────────────────────────────────

const APPLIANCE_GROUPS: {
  group: string
  items: { key: string; label: string; wattage: string; hours: string }[]
}[] = [
  {
    group: "Cooling & Climate",
    items: [
      { key: "ac_1500",  label: "Air Conditioner (1.5 kW)",      wattage: "1500", hours: "6"   },
      { key: "ac_2500",  label: "Air Conditioner (2.5 kW)",      wattage: "2500", hours: "8"   },
      { key: "fan",      label: "Ceiling / Standing Fan",         wattage: "75",   hours: "12"  },
    ],
  },
  {
    group: "Hot Water",
    items: [
      { key: "geyser_3", label: "Water Heater / Geyser (3 kW)",  wattage: "3000", hours: "1"   },
      { key: "geyser_2", label: "Water Heater / Geyser (2 kW)",  wattage: "2000", hours: "2"   },
    ],
  },
  {
    group: "Kitchen",
    items: [
      { key: "fridge",       label: "Refrigerator (standard)",         wattage: "150",  hours: "24"  },
      { key: "fridge_large", label: "Refrigerator (large / double-door)", wattage: "250", hours: "24" },
      { key: "microwave",    label: "Microwave Oven",                  wattage: "1200", hours: "0.5" },
      { key: "oven",         label: "Electric Oven / Cooker",          wattage: "2000", hours: "1"   },
      { key: "induction",    label: "Induction Hob",                   wattage: "2000", hours: "1.5" },
      { key: "kettle",       label: "Electric Kettle",                 wattage: "2000", hours: "0.3" },
      { key: "dishwasher",   label: "Dishwasher",                      wattage: "1500", hours: "1"   },
    ],
  },
  {
    group: "Laundry",
    items: [
      { key: "washing",  label: "Washing Machine",    wattage: "500",  hours: "1"   },
      { key: "dryer",    label: "Tumble Dryer",        wattage: "2500", hours: "1"   },
      { key: "iron",     label: "Clothes Iron",        wattage: "2000", hours: "0.5" },
    ],
  },
  {
    group: "Entertainment & Office",
    items: [
      { key: "tv",         label: "Television (Smart TV)", wattage: "100", hours: "5" },
      { key: "desktop_pc", label: "Desktop Computer",      wattage: "200", hours: "6" },
      { key: "laptop",     label: "Laptop",                wattage: "60",  hours: "6" },
    ],
  },
  {
    group: "Lighting & Utilities",
    items: [
      { key: "lighting",    label: "Lighting (whole home)",    wattage: "200", hours: "6" },
      { key: "pool_pump",   label: "Swimming Pool Pump",       wattage: "750", hours: "8" },
      { key: "water_pump",  label: "Water Pump / Booster",     wattage: "750", hours: "2" },
    ],
  },
  {
    group: "Other",
    items: [
      { key: "other", label: "Other (specify below)", wattage: "", hours: "" },
    ],
  },
]

const APPLIANCE_MAP = Object.fromEntries(
  APPLIANCE_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i]))
)

// ─── Default seed data (always derived from catalog so labels stay in sync) ──

function fromCatalog(key: string, quantity = "1"): Omit<Appliance, "id"> {
  const { label, wattage, hours } = APPLIANCE_MAP[key]
  return { preset: key, name: label, wattage, hoursPerDay: hours, quantity }
}

const SEED_APPLIANCES: Omit<Appliance, "id">[] = [
  fromCatalog("ac_1500"),
  fromCatalog("fridge"),
  fromCatalog("geyser_2"),
]

const INPUTS_KEY = "solariq_inputs"

interface SavedInputs {
  monthlyKwh: string
  roofArea: string
  includeBattery: boolean
  advancedMode: boolean
  appliances: Appliance[]
  hasEV: boolean
  evKmPerDay: string
  detectedKwh: number | null
}

function loadInputs(): SavedInputs | null {
  try {
    const raw = localStorage.getItem(INPUTS_KEY)
    return raw ? (JSON.parse(raw) as SavedInputs) : null
  } catch {
    return null
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const nextId = useRef(SEED_APPLIANCES.length + 1)

  // All state is initialised with SSR-safe defaults.
  // localStorage is read in useEffect (client-only) to avoid hydration mismatches.
  const [monthlyKwh, setMonthlyKwh] = useState("")
  const [advancedMode, setAdvancedMode] = useState(false)
  const [appliances, setAppliances] = useState<Appliance[]>(
    () => SEED_APPLIANCES.map((a, i) => ({ ...a, id: i + 1 }))
  )
  const [hasEV, setHasEV] = useState(false)
  const [evKmPerDay, setEvKmPerDay] = useState("")
  const [roofArea, setRoofArea] = useState("")
  const [includeBattery, setIncludeBattery] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [hasCustomConfig, setHasCustomConfig] = useState(false)

  type UploadStatus = "idle" | "uploading" | "success" | "error"
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [detectedKwh, setDetectedKwh] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const kwhInputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = loadInputs()
    if (saved) {
      if (saved.monthlyKwh) setMonthlyKwh(saved.monthlyKwh)
      setAdvancedMode(saved.advancedMode ?? false)
      if (saved.appliances?.length) {
        nextId.current = Math.max(...saved.appliances.map((a) => a.id)) + 1
        setAppliances(saved.appliances.map((a) => ({
          ...(a as Appliance),
          preset: (a as Appliance).preset ?? "other",
        })))
      }
      setHasEV(saved.hasEV ?? false)
      if (saved.evKmPerDay) setEvKmPerDay(saved.evKmPerDay)
      if (saved.roofArea) setRoofArea(saved.roofArea)
      setIncludeBattery(saved.includeBattery ?? false)
      if (saved.detectedKwh != null) {
        setDetectedKwh(saved.detectedKwh)
        setUploadStatus("success")
      }
    }
    setHasCustomConfig(localStorage.getItem("solariq_config") !== null)
  }, [])

  const enterManually = useCallback(() => {
    setAdvancedMode(false)
    setUploadStatus("idle")
    setDetectedKwh(null)
    setTimeout(() => kwhInputRef.current?.focus(), 0)
  }, [])

  // ── Appliance helpers ──────────────────────────────────────────────────────

  const addAppliance = () => {
    const id = nextId.current++
    setAppliances((prev) => [
      ...prev,
      { id, preset: "", name: "", wattage: "", hoursPerDay: "", quantity: "1" },
    ])
  }

  const removeAppliance = (id: number) => {
    setAppliances((prev) => prev.filter((a) => a.id !== id))
  }

  const updateAppliance = (
    id: number,
    field: keyof Omit<Appliance, "id">,
    value: string
  ) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  const handlePresetChange = (id: number, key: string) => {
    const item = APPLIANCE_MAP[key]
    if (!item) return
    setAppliances((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        return {
          ...a,
          preset: key,
          name: key === "other" ? "" : item.label,
          wattage: key === "other" ? a.wattage : item.wattage,
          hoursPerDay: key === "other" ? a.hoursPerDay : item.hours,
        }
      })
    )
  }

  // ── Derived estimates ──────────────────────────────────────────────────────

  const applianceKwh = appliances.reduce((sum, a) => {
    const w = parseFloat(a.wattage) || 0
    const h = parseFloat(a.hoursPerDay) || 0
    const q = parseFloat(a.quantity) || 1
    return sum + (w * h * q * 30) / 1000
  }, 0)

  const evKwh = hasEV ? (parseFloat(evKmPerDay) || 0) * 0.2 * 30 : 0
  const estimatedKwh = advancedMode ? applianceKwh + evKwh : null

  const canSubmit = advancedMode
    ? appliances.some((a) => a.wattage)
    : !!monthlyKwh

  const handleCalculate = async () => {
    setCalcError(null)
    setIsCalculating(true)
    try {
      const monthly_kwh = advancedMode
        ? applianceKwh + evKwh
        : parseFloat(monthlyKwh)
      const results = await api.calculate({
        monthly_kwh,
        roof_area_m2: roofArea ? parseFloat(roofArea) : null,
        include_battery: includeBattery,
      })
      localStorage.setItem("solariq_results", JSON.stringify(results))
      localStorage.setItem(
        INPUTS_KEY,
        JSON.stringify({
          monthlyKwh,
          roofArea,
          includeBattery,
          advancedMode,
          appliances,
          hasEV,
          evKmPerDay,
          detectedKwh,
        } satisfies SavedInputs),
      )
      trackEvent("calculate", {
        monthly_kwh: results.monthly_kwh,
        pv_kw: results.pv_kw,
        include_battery: includeBattery,
        advanced_mode: advancedMode,
        payback_years: results.payback_years,
      })
      router.push("/results")
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Calculation failed")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus("uploading")
    setUploadError(null)
    try {
      const result: BillParseResponse = await api.uploadBill(file)
      setDetectedKwh(result.monthly_kwh)
      setMonthlyKwh(String(result.monthly_kwh))
      setUploadStatus("success")
      trackEvent("bill_upload_success", { monthly_kwh: result.monthly_kwh })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
      setUploadStatus("error")
      trackEvent("bill_upload_error")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-primary">SolarMoris</span>
            <span role="img" aria-label="Mauritius">🇲🇺</span>
          </a>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground mr-1">
              Step 1 of 3 — Energy inputs
            </span>
            <a
              href="/faq"
              title="Help & FAQ"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <HelpCircle className="h-4 w-4" />
            </a>
            <a
              href="/settings"
              title="Calculation settings"
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                hasCustomConfig
                  ? "text-amber-600 bg-amber-50 border border-amber-200"
                  : "text-muted-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
            </a>
            <Button
              size="sm"
              disabled={!canSubmit || isCalculating}
              onClick={handleCalculate}
            >
              {isCalculating ? "Calculating…" : "Calculate →"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-5">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solar Assessment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">CEB Mauritius PV scheme 2026 for households</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Tell us about your energy usage and property — we'll size a{" "}
            <a
              href="https://ceb.mu/projects/solar-photovoltaic-scheme-for-households-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              hybrid
            </a>
            {" "}system and calculate your ROI.
          </p>
        </div>

        {/* ══ 1. Energy Input ══════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge
                emoji="⚡"
                bg="bg-amber-50"
                text="text-amber-600"
              />
              <div>
                <CardTitle className="text-base">Monthly Energy Usage</CardTitle>
                <CardDescription>
                  Your average monthly consumption from your CEB bill
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* kWh input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="monthly-kwh">Units consumed (kWh)</Label>
                {(advancedMode || uploadStatus === "success") && (
                  <button
                    type="button"
                    onClick={enterManually}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                  >
                    Enter manually instead
                  </button>
                )}
              </div>
              <div className="relative max-w-xs">
                <Input
                  ref={kwhInputRef}
                  id="monthly-kwh"
                  type="number"
                  min="0"
                  placeholder="e.g. 350"
                  value={monthlyKwh}
                  onChange={(e) => {
                    setMonthlyKwh(e.target.value)
                    if (uploadStatus === "success") {
                      setUploadStatus("idle")
                      setDetectedKwh(null)
                    }
                  }}
                  disabled={advancedMode}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  kWh
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Listed as "Units consumed" on your monthly CEB statement
              </p>
            </div>

            {/* Bill upload zone */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleBillUpload}
                aria-label="Upload CEB electricity bill"
              />

              {(uploadStatus === "idle" || uploadStatus === "error") && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 hover:border-primary/40 transition-colors text-left"
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-medium text-foreground">Upload your CEB bill</span>
                    {" — "}we&apos;ll extract your usage automatically (PDF, JPG, PNG · max 10 MB)
                  </span>
                </button>
              )}

              {uploadStatus === "uploading" && (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Reading your bill…</span>
                </div>
              )}

              {uploadStatus === "success" && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="font-medium">
                      Detected consumption:{" "}
                      <span className="tabular-nums">{detectedKwh} kWh</span>
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0"
                  >
                    auto-filled
                  </Badge>
                </div>
              )}

              {uploadStatus === "error" && uploadError && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {uploadError}{" — "}
                  <span className="font-medium">please enter your kWh manually above.</span>
                </p>
              )}

              {uploadStatus === "success" && (
                <button
                  type="button"
                  onClick={() => { setUploadStatus("idle"); setDetectedKwh(null); setMonthlyKwh("") }}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Upload a different bill
                </button>
              )}
            </div>

            <SectionDivider label="or build from appliances" />

            {/* Advanced mode toggle */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="advanced-toggle"
                className="cursor-pointer space-y-0.5"
              >
                <p className="text-sm font-medium">Advanced mode</p>
                <p className="text-xs text-muted-foreground">
                  Enter each appliance individually for a more accurate estimate
                </p>
              </label>
              <Toggle
                id="advanced-toggle"
                checked={advancedMode}
                onChange={setAdvancedMode}
              />
            </div>

            {/* Live estimate badge */}
            {advancedMode && estimatedKwh !== null && (
              <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Estimated monthly usage
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {estimatedKwh.toFixed(0)} kWh
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ 2. Advanced — Appliances ══════════════════════════════════════ */}
        {advancedMode && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <IconBadge
                    emoji="🏠"
                    bg="bg-teal-50"
                    text="text-teal-700"
                  />
                  <div>
                    <CardTitle className="text-base">Appliances</CardTitle>
                    <CardDescription>
                      Add the main electrical loads in your home
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_88px_76px_60px_36px] gap-2 px-0.5 text-xs font-medium text-muted-foreground">
                  <span>Appliance</span>
                  <span>Watts</span>
                  <span>Hrs / day</span>
                  <span>Qty</span>
                  <span />
                </div>

                {/* Rows */}
                {appliances.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No appliances yet — add one below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {appliances.map((a) => (
                      <div key={a.id} className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_88px_76px_60px_36px] gap-2 items-center">
                          {/* ── Appliance dropdown ── */}
                          <select
                            value={a.preset}
                            onChange={(e) => handlePresetChange(a.id, e.target.value)}
                            className={cn(
                              "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              !a.preset && "text-muted-foreground"
                            )}
                          >
                            <option value="" disabled>Select appliance…</option>
                            {APPLIANCE_GROUPS.map((g) => (
                              <optgroup key={g.group} label={g.group}>
                                {g.items.map((item) => (
                                  <option key={item.key} value={item.key}>
                                    {item.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          <Input
                            type="number"
                            min="0"
                            placeholder="W"
                            value={a.wattage}
                            onChange={(e) =>
                              updateAppliance(a.id, "wattage", e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            placeholder="hrs"
                            value={a.hoursPerDay}
                            onChange={(e) =>
                              updateAppliance(a.id, "hoursPerDay", e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={a.quantity}
                            onChange={(e) =>
                              updateAppliance(a.id, "quantity", e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeAppliance(a.id)}
                            aria-label={`Remove ${a.name || "appliance"}`}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Custom name input — only shown when "Other" is selected */}
                        {a.preset === "other" && (
                          <Input
                            placeholder="Describe the appliance…"
                            value={a.name}
                            onChange={(e) =>
                              updateAppliance(a.id, "name", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAppliance}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add appliance
                </Button>
              </CardContent>
            </Card>

            {/* ══ 2b. EV section ══════════════════════════════════════════════ */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <IconBadge
                    emoji="🚗"
                    bg="bg-blue-50"
                    text="text-blue-600"
                  />
                  <div>
                    <CardTitle className="text-base">
                      Electric Vehicle
                    </CardTitle>
                    <CardDescription>
                      Include EV charging in your load estimate
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="has-ev"
                    checked={hasEV}
                    onChange={(e) => setHasEV(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                  <Label
                    htmlFor="has-ev"
                    className="cursor-pointer font-normal leading-snug"
                  >
                    I have (or plan to get) an electric vehicle
                  </Label>
                </div>

                {hasEV && (
                  <div className="space-y-1.5 pl-7">
                    <Label htmlFor="ev-km">Daily driving distance</Label>
                    <div className="relative max-w-[11rem]">
                      <Input
                        id="ev-km"
                        type="number"
                        min="0"
                        placeholder="e.g. 40"
                        value={evKmPerDay}
                        onChange={(e) => setEvKmPerDay(e.target.value)}
                        className="pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        km / day
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Assumes ~0.2 kWh / km average charging consumption
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ══ 3. Roof Area ═════════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <IconBadge
                emoji="🏡"
                bg="bg-green-50"
                text="text-green-700"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Roof Area</CardTitle>
                  <span className="text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-medium">
                    Optional
                  </span>
                </div>
                <CardDescription>
                  Available north- or west-facing unshaded roof space
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="roof-area">Usable roof area</Label>
              <Tooltip content="We use this to cap the maximum number of panels and verify your roof can accommodate the recommended system. North- and west-facing, unshaded sections count best — Mauritius is in the southern hemisphere." />
            </div>

            <div className="relative max-w-[11rem]">
              <Input
                id="roof-area"
                type="number"
                min="0"
                placeholder="e.g. 30"
                value={roofArea}
                onChange={(e) => setRoofArea(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                m²
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              If unknown, we'll size the system based on your usage alone
            </p>
          </CardContent>
        </Card>

        {/* ══ 4. Battery Storage ═══════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <IconBadge emoji="🔋" bg="bg-violet-50" text="text-violet-700" />
              <div>
                <CardTitle className="text-base">Battery Storage</CardTitle>
                <CardDescription>
                  Add a battery to store excess solar and power your home at night
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="battery-toggle" className="cursor-pointer space-y-0.5">
                <p className="text-sm font-medium">Include battery storage</p>
                <p className="text-xs text-muted-foreground">
                  Sized to cover one day of consumption · Rs 28,000 / kWh (2026)
                </p>
              </label>
              <Toggle
                id="battery-toggle"
                checked={includeBattery}
                onChange={setIncludeBattery}
              />
            </div>
            {includeBattery && (
              <p className="text-xs text-muted-foreground rounded-lg bg-violet-50/60 px-3 py-2">
                Battery capacity will be calculated based on your daily energy needs. Cost and payback are updated in your results.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ══ Submit ════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between pb-10">
          <div className="space-y-2 flex-1 mr-4">
            <p className="text-xs text-muted-foreground max-w-xs">
              All calculations use CEB 2026 tariff bands and Mauritius-specific
              solar irradiance data.
            </p>
            {calcError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {calcError}
              </p>
            )}
          </div>
          <Button
            size="lg"
            disabled={!canSubmit || isCalculating}
            onClick={handleCalculate}
            className="gap-2 shrink-0"
          >
            {isCalculating ? "Calculating…" : "Calculate potential →"}
          </Button>
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
