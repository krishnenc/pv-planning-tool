"use client"

import { type ReactNode, useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { SiteFooter } from "@/components/site-footer"
import { Sun, ArrowLeft, RefreshCw, Settings, ChevronRight, HelpCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CalculationResponse } from "@/lib/api"
import { CONFIG_KEY, DEFAULT_CONFIG } from "@/lib/api"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

// ─── Shared helpers ───────────────────────────────────────────────────────────

function IconBadge({ emoji, bg, text }: { emoji: string; bg: string; text: string }) {
  return (
    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-lg shrink-0", bg, text)}>
      {emoji}
    </div>
  )
}

function MetricBlock({
  label,
  value,
  unit,
  valueClass,
  infoBtn,
}: {
  label: string
  value: string | number
  unit?: string
  valueClass?: string
  infoBtn?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
        {infoBtn}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-bold tabular-nums", valueClass)}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

function InfoBtn({
  id,
  label,
  active,
  onToggle,
}: {
  id: string
  label: string
  active: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      aria-label={`Explain ${label} calculation`}
      onClick={() => onToggle(id)}
      className={cn(
        "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold transition-colors shrink-0",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/80 text-muted-foreground/70 hover:bg-primary/15 hover:text-primary",
      )}
    >
      ℹ
    </button>
  )
}

function ExplainerPanel({
  formula,
  inputs,
  steps,
}: {
  formula: string
  inputs: { k: string; v: string }[]
  steps: string
}) {
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-3 text-xs">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Formula
        </p>
        <pre className="font-mono text-[11px] leading-relaxed bg-primary/5 border border-primary/20 rounded-md px-3 py-2 text-primary overflow-x-auto whitespace-pre">
          {formula}
        </pre>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Inputs
        </p>
        <div className="font-mono text-[11px] space-y-1 rounded-md bg-muted/40 px-3 py-2">
          {inputs.map(({ k, v }) => (
            <div key={k} className="flex justify-between gap-6">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-foreground font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Step-by-step
        </p>
        <pre className="font-mono text-[11px] leading-relaxed bg-muted/40 border border-border/30 rounded-md px-3 py-2 text-muted-foreground overflow-x-auto whitespace-pre">
          {steps}
        </pre>
      </div>
    </div>
  )
}

const rupeesK = (v: number) => `Rs ${(v / 1000).toFixed(0)}k`
const PIE_COLORS = ["#0d9488", "#e5e7eb"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<CalculationResponse | null>(null)
  const [simPvKw, setSimPvKw] = useState<number>(0)
  const [showAllDetails, setShowAllDetails] = useState(false)
  const [openExplainers, setOpenExplainers] = useState<Set<string>>(new Set())
  const [hasCustomConfig, setHasCustomConfig] = useState(false)

  function toggle(id: string) {
    setOpenExplainers(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function isOpen(id: string) {
    return showAllDetails || openExplainers.has(id)
  }

  function handleToggleAll() {
    const next = !showAllDetails
    setShowAllDetails(next)
    if (!next) setOpenExplainers(new Set())
  }

  const lifetimeYears: number = (() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(CONFIG_KEY) : null
      return raw ? (JSON.parse(raw).project_lifetime_years ?? DEFAULT_CONFIG.project_lifetime_years) : DEFAULT_CONFIG.project_lifetime_years
    } catch { return DEFAULT_CONFIG.project_lifetime_years }
  })()

  useEffect(() => {
    const raw = localStorage.getItem("solariq_results")
    if (!raw) {
      router.replace("/dashboard")
      return
    }
    try {
      const parsed = JSON.parse(raw) as CalculationResponse
      setResults(parsed)
      setSimPvKw(parsed.pv_kw)
    } catch {
      router.replace("/dashboard")
    }
    setHasCustomConfig(localStorage.getItem("solariq_config") !== null)
  }, [router])

  const simMetrics = useMemo(() => {
    if (!results)
      return {
        simPanelCount: 0,
        simSystemCost: 0,
        simMonthlySavings: 0,
        simPayback: "—",
        simData: [] as { year: number; cumSavings: number; systemCost: number }[],
      }
    const simPanelCount = Math.ceil((simPvKw * 1000) / 400)
    const costPerWp = results.system_cost_rs / (results.pv_kw * 1000)
    const simSystemCost = Math.round(simPvKw * 1000 * costPerWp + results.battery_cost_rs)
    const simMonthlySavings = Math.round(
      results.monthly_savings_rs * Math.min(simPvKw / results.pv_kw, 1),
    )
    const simAnnualSavings = simMonthlySavings * 12
    const simPayback =
      simAnnualSavings > 0 ? (simSystemCost / simAnnualSavings).toFixed(1) : "—"
    const simData = Array.from({ length: lifetimeYears + 1 }, (_, y) => ({
      year: y,
      cumSavings: simAnnualSavings * y,
      systemCost: simSystemCost,
    }))
    return { simPanelCount, simSystemCost, simMonthlySavings, simPayback, simData }
  }, [simPvKw, results])

  if (!results) return null

  // ── Roof display helpers ──────────────────────────────────────────────────

  const roofColors =
    results.roof.status === "ok"
      ? "bg-green-50 text-green-700"
      : results.roof.status === "limited"
        ? "bg-amber-50 text-amber-700"
        : "bg-muted text-muted-foreground"
  const roofIcon =
    results.roof.status === "ok" ? "✓" : results.roof.status === "limited" ? "⚠" : "ℹ"
  const roofLabel =
    results.roof.status === "ok"
      ? "Fits on your roof"
      : results.roof.status === "limited"
        ? "Limited — system sized to available area"
        : "Roof area not provided — sized by usage"

  // ── Chart 1 data ──────────────────────────────────────────────────────────

  const roiData = Array.from({ length: lifetimeYears + 1 }, (_, y) => ({
    year: y,
    cumSavings: results.annual_savings_rs * y,
    systemCost: results.total_cost_rs,
  }))

  // ── Chart 2 data ──────────────────────────────────────────────────────────

  const solarKwh = Math.round(results.monthly_kwh * 0.85)
  const gridKwh = Math.round(results.monthly_kwh * 0.15)
  const pieData = [
    { name: "Solar Covered", value: solarKwh },
    { name: "Grid Remaining", value: gridKwh },
  ]

  // ── Explainer pre-computed values ─────────────────────────────────────────

  const dailyKwh = results.monthly_kwh / 30
  const effHrs = 5.2 * 0.8 // 4.16

  // CEB 2026 progressive tariff band split
  const kwh = results.monthly_kwh
  const b1u = Math.min(kwh, 100)
  const b2u = Math.min(Math.max(kwh - 100, 0), 200)
  const b3u = Math.min(Math.max(kwh - 300, 0), 300)
  const b4u = Math.max(kwh - 600, 0)
  const b1rs = b1u * 5.4
  const b2rs = b2u * 8.1
  const b3rs = b3u * 11.35
  const b4rs = b4u * 16.2

  const savings25yr = results.annual_savings_rs * lifetimeYears
  const netGain = savings25yr - results.total_cost_rs

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
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
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </a>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              Step 2 of 3 — Your results
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
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-5">

        {/* Heading + global toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your Solar Assessment</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Based on {results.monthly_kwh.toFixed(0)} kWh/month — CEB 2026 tariffs ·
              Mauritius irradiance 5.2 kWh/m²/day
            </p>
          </div>
          <Button
            variant={showAllDetails ? "secondary" : "outline"}
            size="sm"
            className="shrink-0 text-xs gap-1"
            onClick={handleToggleAll}
          >
            {showAllDetails ? "Hide Details" : "Show Calculation Details"}
          </Button>
        </div>

        {/* ══ 1. System Recommendation ════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="☀️" bg="bg-blue-50" text="text-blue-600" />
              <div>
                <CardTitle className="text-base">Recommended System</CardTitle>
                <CardDescription>Sized for your consumption using 400 Wp panels</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <MetricBlock
                label="PV Size"
                value={results.pv_kw.toFixed(1)}
                unit="kW"
                infoBtn={
                  <InfoBtn
                    id="pv_kw"
                    label="PV Size"
                    active={isOpen("pv_kw")}
                    onToggle={toggle}
                  />
                }
              />
              <MetricBlock
                label="Battery"
                value={results.battery_kwh != null ? results.battery_kwh.toFixed(1) : "—"}
                unit={results.battery_kwh != null ? "kWh" : undefined}
                infoBtn={
                  <InfoBtn
                    id="battery"
                    label="Battery"
                    active={isOpen("battery")}
                    onToggle={toggle}
                  />
                }
              />
              <MetricBlock
                label="Panels"
                value={results.panel_count}
                unit="× 400 Wp"
                infoBtn={
                  <InfoBtn
                    id="panels"
                    label="Panel count"
                    active={isOpen("panels")}
                    onToggle={toggle}
                  />
                }
              />
            </div>

            {isOpen("pv_kw") && (
              <ExplainerPanel
                formula="PV (kW) = (monthly_kWh ÷ 30) ÷ (irradiance × efficiency)"
                inputs={[
                  { k: "Monthly consumption", v: `${results.monthly_kwh.toFixed(0)} kWh` },
                  { k: "Irradiance (Mauritius)", v: "5.2 kWh/m²/day" },
                  { k: "System efficiency", v: "80 %" },
                ]}
                steps={`Daily load   = ${results.monthly_kwh.toFixed(0)} ÷ 30
             = ${dailyKwh.toFixed(3)} kWh/day

Peak sun hrs = 5.2 × 0.80
             = ${effHrs.toFixed(2)} effective hrs/day

PV size      = ${dailyKwh.toFixed(3)} ÷ ${effHrs.toFixed(2)}
             = ${results.pv_kw.toFixed(2)} kW`}
              />
            )}

            {isOpen("battery") && (
              <ExplainerPanel
                formula={
                  results.battery_kwh != null
                    ? "Battery (kWh) = PV (kW) × 1.5"
                    : "Battery storage not requested"
                }
                inputs={
                  results.battery_kwh != null
                    ? [
                        { k: "PV size", v: `${results.pv_kw.toFixed(2)} kW` },
                        { k: "Storage ratio", v: "1.5 kWh per kW" },
                      ]
                    : [{ k: "Status", v: "Not included" }]
                }
                steps={
                  results.battery_kwh != null
                    ? `Battery = ${results.pv_kw.toFixed(2)} × 1.5\n        = ${results.battery_kwh.toFixed(2)} kWh`
                    : "Battery was not selected.\nNo battery storage included in this system."
                }
              />
            )}

            {isOpen("panels") && (
              <ExplainerPanel
                formula="Panels = ⌈ PV (kW) × 1000 ÷ panel capacity (Wp) ⌉"
                inputs={[
                  { k: "PV size", v: `${results.pv_kw.toFixed(2)} kW` },
                  { k: "Panel capacity", v: "400 Wp" },
                ]}
                steps={`Raw count = ${results.pv_kw.toFixed(2)} × 1000 ÷ 400
          = ${(results.pv_kw * 1000 / 400).toFixed(2)}

Panels    = ⌈ ${(results.pv_kw * 1000 / 400).toFixed(2)} ⌉
          = ${results.panel_count} panels`}
              />
            )}

            <div className="mt-5 space-y-1.5 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  System cost
                  <InfoBtn
                    id="system_cost"
                    label="System cost"
                    active={isOpen("system_cost")}
                    onToggle={toggle}
                  />
                </span>
                <span className="font-medium tabular-nums">
                  Rs {results.system_cost_rs.toLocaleString()}
                </span>
              </div>
              {results.battery_kwh != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Battery cost</span>
                  <span className="font-medium tabular-nums">
                    Rs {results.battery_cost_rs.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span>Total investment</span>
                <span className="tabular-nums">Rs {results.total_cost_rs.toLocaleString()}</span>
              </div>
            </div>

            {isOpen("system_cost") && (
              <ExplainerPanel
                formula="System cost (Rs) = PV (kW) × 1000 × Rs 55 per Wp (installed)"
                inputs={[
                  { k: "PV size", v: `${results.pv_kw.toFixed(2)} kW` },
                  { k: "Cost per Wp (2026)", v: "Rs 55.00" },
                  ...(results.battery_kwh != null
                    ? [
                        { k: "Battery size", v: `${results.battery_kwh.toFixed(2)} kWh` },
                        { k: "Battery cost / kWh", v: "Rs 25,000" },
                      ]
                    : []),
                ]}
                steps={
                  results.battery_kwh != null
                    ? `System  = ${results.pv_kw.toFixed(2)} × 1000 × Rs 55
        = Rs ${results.system_cost_rs.toLocaleString()}

Battery = ${results.battery_kwh.toFixed(2)} × Rs 25,000
        = Rs ${results.battery_cost_rs.toLocaleString()}

Total   = Rs ${results.system_cost_rs.toLocaleString()} + Rs ${results.battery_cost_rs.toLocaleString()}
        = Rs ${results.total_cost_rs.toLocaleString()}`
                    : `System  = ${results.pv_kw.toFixed(2)} × 1000 × Rs 55
        = Rs ${results.system_cost_rs.toLocaleString()}`
                }
              />
            )}
          </CardContent>
        </Card>

        {/* ══ 2. Roof Feasibility ═════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="🏡" bg="bg-teal-50" text="text-teal-700" />
              <div>
                <CardTitle className="text-base">Roof Feasibility</CardTitle>
                <CardDescription>Area required vs. your available roof space</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <MetricBlock
                label="Required Area"
                value={results.roof.required_m2.toFixed(0)}
                unit="m²"
                infoBtn={
                  <InfoBtn
                    id="roof_required"
                    label="Required area"
                    active={isOpen("roof_required")}
                    onToggle={toggle}
                  />
                }
              />
              <MetricBlock
                label="Available Area"
                value={
                  results.roof.available_m2 != null
                    ? results.roof.available_m2.toFixed(0)
                    : "—"
                }
                unit={results.roof.available_m2 != null ? "m²" : undefined}
              />
            </div>

            {isOpen("roof_required") && (
              <ExplainerPanel
                formula="Required area (m²) = panel_count × 2.0 m² per panel"
                inputs={[
                  { k: "Panel count", v: `${results.panel_count}` },
                  { k: "Area per 400 Wp panel", v: "2.0 m²" },
                ]}
                steps={`Required = ${results.panel_count} × 2.0
         = ${results.roof.required_m2.toFixed(0)} m²`}
              />
            )}

            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
                roofColors,
              )}
            >
              <span>{roofIcon}</span>
              <span>{roofLabel}</span>
            </div>
          </CardContent>
        </Card>

        {/* ══ 3. Financial Summary ════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="💰" bg="bg-green-50" text="text-green-700" />
              <div>
                <CardTitle className="text-base">Financial Summary</CardTitle>
                <CardDescription>85% grid offset · CEB 2026 tariffs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Monthly bill row with its own ℹ */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/40 px-4 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                Monthly bill
                <InfoBtn
                  id="monthly_bill"
                  label="Monthly bill"
                  active={isOpen("monthly_bill")}
                  onToggle={toggle}
                />
              </span>
              <span className="font-semibold tabular-nums">
                Rs {results.monthly_bill_rs.toLocaleString()}
              </span>
            </div>

            {isOpen("monthly_bill") && (
              <ExplainerPanel
                formula="CEB 2026 progressive tariff — 4 bands"
                inputs={[
                  { k: "Band 1  (0–100 kWh)", v: "Rs  5.40 / kWh" },
                  { k: "Band 2 (101–300 kWh)", v: "Rs  8.10 / kWh" },
                  { k: "Band 3 (301–600 kWh)", v: "Rs 11.35 / kWh" },
                  { k: "Band 4    (> 600 kWh)", v: "Rs 16.20 / kWh" },
                  { k: "Monthly consumption", v: `${results.monthly_kwh.toFixed(0)} kWh` },
                ]}
                steps={`Band 1 (  0–100): ${b1u.toFixed(0).padStart(3)} kWh × Rs  5.40  =  Rs ${b1rs.toFixed(2).padStart(9)}
Band 2 (101–300): ${b2u.toFixed(0).padStart(3)} kWh × Rs  8.10  =  Rs ${b2rs.toFixed(2).padStart(9)}
Band 3 (301–600): ${b3u.toFixed(0).padStart(3)} kWh × Rs 11.35  =  Rs ${b3rs.toFixed(2).padStart(9)}
Band 4 (> 600):   ${b4u.toFixed(0).padStart(3)} kWh × Rs 16.20  =  Rs ${b4rs.toFixed(2).padStart(9)}
                                         ──────────────────
Total                                    Rs ${results.monthly_bill_rs.toFixed(2).padStart(9)}`}
              />
            )}

            <div className="grid grid-cols-3 gap-6">
              <MetricBlock
                label="Monthly Savings"
                value={`Rs ${results.monthly_savings_rs.toLocaleString()}`}
                valueClass="text-green-700 text-2xl"
                infoBtn={
                  <InfoBtn
                    id="monthly_savings"
                    label="Monthly savings"
                    active={isOpen("monthly_savings")}
                    onToggle={toggle}
                  />
                }
              />
              <MetricBlock
                label="Payback"
                value={results.payback_years.toFixed(1)}
                unit="yrs"
                infoBtn={
                  <InfoBtn
                    id="payback"
                    label="Payback period"
                    active={isOpen("payback")}
                    onToggle={toggle}
                  />
                }
              />
              <MetricBlock
                label={`${lifetimeYears}-yr ROI`}
                value={`${results.roi_25yr_pct.toFixed(0)}%`}
                valueClass="text-green-700"
                infoBtn={
                  <InfoBtn
                    id="roi_25yr"
                    label={`${lifetimeYears}-year ROI`}
                    active={isOpen("roi_25yr")}
                    onToggle={toggle}
                  />
                }
              />
            </div>

            {isOpen("monthly_savings") && (
              <ExplainerPanel
                formula="(original_bill − bill_on_remaining_grid) + CEB export credit"
                inputs={[
                  { k: "Monthly bill",          v: `Rs ${results.monthly_bill_rs.toLocaleString()}` },
                  { k: "Self-consumption rate", v: "85 % of solar used on-site" },
                  { k: "CEB export tariff",     v: "Rs 5.10 / kWh (net metering)" },
                ]}
                steps={`Remaining grid  = ${results.monthly_kwh} × 15% = ${(results.monthly_kwh * 0.15).toFixed(1)} kWh
New grid bill   = CEB tariff(${(results.monthly_kwh * 0.15).toFixed(1)} kWh)
                = Rs ${(results.monthly_bill_rs - results.monthly_savings_rs + results.export_credit_rs).toFixed(2)}

Export credit   = ${(results.monthly_kwh * 0.15).toFixed(1)} kWh × Rs 5.10
                = Rs ${results.export_credit_rs.toFixed(2)}

Monthly savings = Rs ${results.monthly_bill_rs.toFixed(2)} − Rs ${(results.monthly_bill_rs - results.monthly_savings_rs + results.export_credit_rs).toFixed(2)} + Rs ${results.export_credit_rs.toFixed(2)}
                = Rs ${results.monthly_savings_rs.toFixed(2)}

Annual savings  = Rs ${results.monthly_savings_rs.toFixed(2)} × 12
                = Rs ${results.annual_savings_rs.toFixed(2)}`}
              />
            )}

            {isOpen("payback") && (
              <ExplainerPanel
                formula="Payback (years) = total_cost ÷ annual_savings"
                inputs={[
                  { k: "Total investment", v: `Rs ${results.total_cost_rs.toLocaleString()}` },
                  { k: "Annual savings", v: `Rs ${results.annual_savings_rs.toLocaleString()}` },
                ]}
                steps={`Payback = Rs ${results.total_cost_rs.toLocaleString()} ÷ Rs ${results.annual_savings_rs.toLocaleString()}
        = ${results.payback_years.toFixed(2)} years`}
              />
            )}

            {isOpen("roi_25yr") && (
              <ExplainerPanel
                formula={`${lifetimeYears}-yr ROI (%) = (total_savings − cost) ÷ cost × 100`}
                inputs={[
                  { k: "Annual savings", v: `Rs ${results.annual_savings_rs.toLocaleString()}` },
                  { k: "Horizon", v: `${lifetimeYears} years` },
                  { k: "Total investment", v: `Rs ${results.total_cost_rs.toLocaleString()}` },
                ]}
                steps={`${lifetimeYears}-yr savings = Rs ${results.annual_savings_rs.toLocaleString()} × ${lifetimeYears}
              = Rs ${savings25yr.toLocaleString()}

Net gain      = Rs ${savings25yr.toLocaleString()} − Rs ${results.total_cost_rs.toLocaleString()}
              = Rs ${netGain.toLocaleString()}

${lifetimeYears}-yr ROI     = Rs ${netGain.toLocaleString()} ÷ Rs ${results.total_cost_rs.toLocaleString()} × 100
              = ${results.roi_25yr_pct.toFixed(1)} %`}
              />
            )}

            <div className="mt-5 flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm">
              <span className="text-green-800 font-medium">Annual savings</span>
              <span className="text-green-700 font-bold tabular-nums text-base">
                Rs {results.annual_savings_rs.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ══ 4. ROI Over Time ════════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="📈" bg="bg-blue-50" text="text-blue-600" />
              <div>
                <CardTitle className="text-base">ROI Over Time</CardTitle>
                <CardDescription>
                  Cumulative savings vs. total investment over {lifetimeYears} years
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={roiData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="roiGradSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="roiGradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 10%, 88%)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `Y${v}`}
                />
                <YAxis width={52} tick={{ fontSize: 12 }} tickFormatter={rupeesK} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `Rs ${value.toLocaleString()}`,
                    name === "cumSavings" ? "Cumulative Savings" : "System Cost",
                  ]}
                  labelFormatter={(label: number) => `Year ${label}`}
                />
                <ReferenceLine
                  x={Math.round(results.payback_years)}
                  stroke="#64748b"
                  strokeDasharray="4 3"
                  label={{
                    value: "Break-even",
                    position: "top",
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="systemCost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#roiGradCost)"
                  dot={false}
                  animationDuration={800}
                />
                <Area
                  type="monotone"
                  dataKey="cumSavings"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#roiGradSavings)"
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ══ 5. Monthly Energy Split ═════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="🔆" bg="bg-amber-50" text="text-amber-600" />
              <div>
                <CardTitle className="text-base">Monthly Energy Split</CardTitle>
                <CardDescription>
                  Solar coverage vs. remaining grid draw at 85% offset
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const total = solarKwh + gridKwh
                    const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0"
                    return [`${value} kWh (${pct}%)`, name]
                  }}
                />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ══ 6. Scenario Simulation ══════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="🔧" bg="bg-teal-50" text="text-teal-700" />
              <div>
                <CardTitle className="text-base">Scenario Simulation</CardTitle>
                <CardDescription>
                  Drag to explore how system size affects your returns
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>System size</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {simPvKw.toFixed(1)} kW
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={Math.max(results.pv_kw * 3, 10)}
                step={0.1}
                value={simPvKw}
                onChange={(e) => setSimPvKw(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded cursor-pointer accent-primary"
              />
            </div>

            {/* Live metric strip */}
            <div className="grid grid-cols-4 gap-3 rounded-lg bg-muted/40 px-4 py-3">
              {[
                { label: "kW", value: simPvKw.toFixed(1), green: false },
                { label: "Panels", value: String(simMetrics.simPanelCount), green: false },
                {
                  label: "Mo. Savings",
                  value: `Rs ${simMetrics.simMonthlySavings.toLocaleString()}`,
                  green: true,
                },
                {
                  label: "Payback",
                  value:
                    simMetrics.simPayback !== "—" ? `${simMetrics.simPayback} yr` : "—",
                  green: false,
                },
              ].map(({ label, value, green }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {label}
                  </span>
                  <span
                    className={cn("text-lg font-bold tabular-nums", green && "text-green-700")}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Live chart */}
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={simMetrics.simData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="simGradSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="simGradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 10%, 88%)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `Y${v}`}
                />
                <YAxis width={52} tick={{ fontSize: 12 }} tickFormatter={rupeesK} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `Rs ${value.toLocaleString()}`,
                    name === "cumSavings" ? "Cumulative Savings" : "System Cost",
                  ]}
                  labelFormatter={(label: number) => `Year ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="systemCost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#simGradCost)"
                  dot={false}
                  animationDuration={400}
                />
                <Area
                  type="monotone"
                  dataKey="cumSavings"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#simGradSavings)"
                  dot={false}
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ══ Actions ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2 justify-between pb-10">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Adjust inputs
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/report")}
          >
            Full Report &amp; Action Plan
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              localStorage.removeItem("solariq_results")
              localStorage.removeItem("solariq_inputs")
              router.push("/dashboard")
            }}
          >
            <RefreshCw className="h-4 w-4" />
            New assessment
          </Button>
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
