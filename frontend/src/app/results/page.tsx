"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sun, ArrowLeft, RefreshCw } from "lucide-react"
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

// ─── Local helpers ────────────────────────────────────────────────────────────

function IconBadge({ emoji, bg, text }: { emoji: string; bg: string; text: string }) {
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

function MetricBlock({
  label,
  value,
  unit,
  valueClass,
}: {
  label: string
  value: string | number
  unit?: string
  valueClass?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-bold tabular-nums", valueClass)}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<CalculationResponse | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("solariq_results")
    if (!raw) {
      router.replace("/dashboard")
      return
    }
    try {
      setResults(JSON.parse(raw) as CalculationResponse)
    } catch {
      router.replace("/dashboard")
    }
  }, [router])

  if (!results) return null

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

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">
              <span className="text-primary">Solar</span>
              <span className="text-foreground">IQ</span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                Mauritius
              </span>
            </span>
          </a>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            Step 2 of 3 — Your results
          </span>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-5">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Solar Assessment</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Based on {results.monthly_kwh.toFixed(0)} kWh/month — CEB 2026 tariffs ·
            Mauritius irradiance 5.2 kWh/m²/day
          </p>
        </div>

        {/* ══ 1. System Recommendation ════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="☀️" bg="bg-blue-50" text="text-blue-600" />
              <div>
                <CardTitle className="text-base">Recommended System</CardTitle>
                <CardDescription>
                  Sized for your consumption using 400 Wp panels
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <MetricBlock
                label="PV Size"
                value={results.pv_kw.toFixed(1)}
                unit="kW"
              />
              <MetricBlock
                label="Battery"
                value={results.battery_kwh != null ? results.battery_kwh.toFixed(1) : "—"}
                unit={results.battery_kwh != null ? "kWh" : undefined}
              />
              <MetricBlock
                label="Panels"
                value={results.panel_count}
                unit="× 400 Wp"
              />
            </div>

            {/* Cost breakdown */}
            <div className="mt-5 space-y-1.5 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">System cost</span>
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
                <span className="tabular-nums">
                  Rs {results.total_cost_rs.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══ 2. Roof Feasibility ═════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <IconBadge emoji="🏡" bg="bg-teal-50" text="text-teal-700" />
              <div>
                <CardTitle className="text-base">Roof Feasibility</CardTitle>
                <CardDescription>
                  Area required vs. your available roof space
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <MetricBlock
                label="Required Area"
                value={results.roof.required_m2.toFixed(0)}
                unit="m²"
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

            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
                roofColors
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
                <CardDescription>
                  Current monthly bill: Rs {results.monthly_bill_rs.toLocaleString()} · 85%
                  grid offset
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <MetricBlock
                label="Monthly Savings"
                value={`Rs ${results.monthly_savings_rs.toLocaleString()}`}
                valueClass="text-green-700 text-2xl"
              />
              <MetricBlock
                label="Payback"
                value={results.payback_years.toFixed(1)}
                unit="yrs"
              />
              <MetricBlock
                label="25-yr ROI"
                value={`${results.roi_25yr_pct.toFixed(0)}%`}
                valueClass="text-green-700"
              />
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm">
              <span className="text-green-800 font-medium">Annual savings</span>
              <span className="text-green-700 font-bold tabular-nums text-base">
                Rs {results.annual_savings_rs.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ══ Actions ═════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between pb-10">
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
            onClick={() => {
              localStorage.removeItem("solariq_results")
              router.push("/dashboard")
            }}
          >
            <RefreshCw className="h-4 w-4" />
            New assessment
          </Button>
        </div>
      </main>
    </div>
  )
}
