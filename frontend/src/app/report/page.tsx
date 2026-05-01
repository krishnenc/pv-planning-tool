"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sun, ArrowLeft, ChevronDown, ChevronUp, Printer, RefreshCw, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { type CalculationResponse } from "@/lib/api"
import {
  buildCashFlows,
  calcNPV,
  calcIRR,
  calcDiscountedPayback,
  calcEMI,
  calcCO2,
} from "@/lib/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"

// ─── Small helpers ────────────────────────────────────────────────────────────

function rs(n: number) {
  return `Rs ${Math.round(n).toLocaleString()}`
}
function rsK(n: number) {
  return Math.abs(n) >= 1000
    ? `Rs ${(n / 1000).toFixed(0)}k`
    : `Rs ${Math.round(n)}`
}

function IconBadge({ emoji, bg, text }: { emoji: string; bg: string; text: string }) {
  return (
    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-lg shrink-0", bg, text)}>
      {emoji}
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  sub,
  highlight,
}: {
  label: string
  value: string
  unit?: string
  sub?: string
  highlight?: "green" | "red"
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-xl font-bold tabular-nums",
        highlight === "green" && "text-emerald-600",
        highlight === "red"   && "text-rose-600",
      )}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Next Steps data ──────────────────────────────────────────────────────────

const NEXT_STEPS = [
  {
    title: "Get 3 certified installer quotes",
    detail: "Use MRC-approved solar installers. Compare system specs, panel brands, inverter warranties, and after-sales service.",
  },
  {
    title: "Apply for CEB Net Metering",
    detail: "Submit your application to the Central Electricity Board. Processing typically takes 4–8 weeks. Allows you to export surplus to the grid at Rs 5.10/kWh.",
    link: "https://ceb.mu",
  },
  {
    title: "Explore DBM / MDB Green Loans",
    detail: "Development Bank of Mauritius and MDB offer preferential financing for renewable energy at 3–5% p.a. — significantly below commercial rates.",
  },
  {
    title: "Register panels with MRA",
    detail: "Solar equipment may qualify for VAT exemption or duty relief under the MRA scheme. Confirm eligibility at registration.",
  },
  {
    title: "Assess your roof condition",
    detail: "Ensure structural integrity before installation. Budget Rs 15,000–40,000 for re-roofing or reinforcement if required.",
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuth()

  const [results, setResults]               = useState<CalculationResponse | null>(null)
  const [showFinancing, setShowFinancing]   = useState(false)
  const [loanTermYears, setLoanTermYears]   = useState(10)
  const [annualInterest, setAnnualInterest] = useState(7.0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("solariq_results")
      if (!raw) { router.replace("/results"); return }
      setResults(JSON.parse(raw) as CalculationResponse)
    } catch {
      router.replace("/results")
    }
  }, [router])

  const report = useMemo(() => {
    if (!results) return null
    const rows             = buildCashFlows({
      annual_savings_rs: results.annual_savings_rs,
      total_cost_rs:     results.total_cost_rs,
      pv_kw:             results.pv_kw,
    })
    const npv              = calcNPV(rows)
    const irr              = calcIRR(results.total_cost_rs, rows)
    const discountedPayback = calcDiscountedPayback(rows)
    const lifetimeNetGain  = rows[rows.length - 1].cumulativeNetRs - results.total_cost_rs
    const emi              = calcEMI(results.total_cost_rs, annualInterest, loanTermYears)
    const co2              = calcCO2({ monthly_kwh: results.monthly_kwh, rows })
    const paybackRowIndex  = rows.findIndex(r => r.cumulativeNetRs >= results.total_cost_rs)
    return { rows, npv, irr, discountedPayback, lifetimeNetGain, emi, co2, paybackRowIndex }
  }, [results, annualInterest, loanTermYears])

  if (!results || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const netMonthly = Math.round(results.monthly_savings_rs - report.emi)

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-primary">SolarMoris</span>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground">
              Step 3 of 3 — Investment Report
            </span>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { logout(); router.push("/") }}
                className="gap-1.5 text-muted-foreground"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-5">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investment Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            25-year cash-flow analysis, NPV/IRR, financing scenarios, and your next steps.
          </p>
        </div>

        {/* ══ 1. Cash Flow Table ══════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <IconBadge emoji="📋" bg="bg-blue-50" text="text-blue-600" />
              <div>
                <CardTitle className="text-base">25-Year Cash Flow</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Accounts for 0.5%/yr panel degradation, {(4.5).toFixed(1)}% CPI tariff inflation, and Rs 1,200/kW/yr maintenance
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/60">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      {["Yr", "Output", "Gross Savings", "Maintenance", "Net CF", "Cumul. Net", "Disc. CF"].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => {
                      const isPayback = i === report.paybackRowIndex
                      return (
                        <tr
                          key={row.year}
                          className={cn(
                            "border-t border-border/40",
                            isPayback
                              ? "border-l-4 border-l-amber-400 bg-amber-50 font-semibold"
                              : i % 2 === 1 ? "bg-muted/20" : "",
                          )}
                        >
                          <td className="px-2 py-1.5 tabular-nums">{row.year}</td>
                          <td className="px-2 py-1.5 tabular-nums">{(row.degradationFactor * 100).toFixed(1)}%</td>
                          <td className="px-2 py-1.5 tabular-nums">{rs(row.grossSavingsRs)}</td>
                          <td className="px-2 py-1.5 tabular-nums text-amber-700">{rs(row.maintenanceCostRs)}</td>
                          <td className="px-2 py-1.5 tabular-nums text-emerald-700">{rs(row.netCashFlowRs)}</td>
                          <td className="px-2 py-1.5 tabular-nums">{rs(row.cumulativeNetRs)}</td>
                          <td className="px-2 py-1.5 tabular-nums text-indigo-700">{rs(row.discountedCashFlowRs)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {report.paybackRowIndex >= 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 mr-1.5 align-middle" />
                Highlighted row = simple payback year (Year {report.rows[report.paybackRowIndex].year})
              </p>
            )}
          </CardContent>
        </Card>

        {/* ══ 2. Key Metrics + Chart ══════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <IconBadge emoji="📈" bg="bg-emerald-50" text="text-emerald-700" />
              <div>
                <CardTitle className="text-base">Financial Metrics</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Discounted at 8% WACC</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Net Present Value (NPV)"
                value={rs(report.npv)}
                highlight={report.npv >= 0 ? "green" : "red"}
                sub="At 8% discount rate"
              />
              <Metric
                label="Internal Rate of Return"
                value={report.irr !== null ? `${(report.irr * 100).toFixed(1)}%` : "N/A"}
                highlight={report.irr !== null && report.irr > 0.08 ? "green" : undefined}
                sub="Your investment's effective yield"
              />
              <Metric
                label="Discounted Payback"
                value={report.discountedPayback !== null ? `${report.discountedPayback.toFixed(1)} yrs` : "> 25 yrs"}
                sub="Time-value-adjusted break-even"
              />
              <Metric
                label="Total Lifetime Net Gain"
                value={rs(report.lifetimeNetGain)}
                highlight="green"
                sub="Nominal 25-yr profit after maintenance"
              />
            </div>

            {/* Dual-axis ComposedChart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={report.rows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
                  <XAxis dataKey="year" tickFormatter={(v: number) => `Y${v}`} tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v: number) => rsK(v)}
                    width={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v: number) => rsK(v)}
                    width={68}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [rs(value), name]}
                    labelFormatter={(y: number) => `Year ${y}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="netCashFlowRs"    name="Net savings"  stackId="cf" fill="#0d9488" opacity={0.85} />
                  <Bar yAxisId="left" dataKey="maintenanceCostRs" name="Maintenance"  stackId="cf" fill="#f59e0b" opacity={0.85} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativeNetRs"
                    name="Cumulative net"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={results.total_cost_rs}
                    stroke="#94a3b8"
                    strokeDasharray="4 3"
                    label={{ value: "Break-even", fontSize: 10, fill: "#64748b", position: "insideTopRight" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Bars show annual net savings (teal) + maintenance cost (amber). Line shows cumulative net cash flow vs. the break-even threshold (dashed).
            </p>
          </CardContent>
        </Card>

        {/* ══ 3. Financing Scenarios ══════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconBadge emoji="🏦" bg="bg-violet-50" text="text-violet-700" />
                <div>
                  <CardTitle className="text-base">Financing Scenarios</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Model a loan to see your monthly cash position</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => setShowFinancing(v => !v)}
              >
                {showFinancing ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showFinancing ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>

          {showFinancing && (
            <CardContent className="space-y-4">
              {/* Loan term segmented control */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Loan term</p>
                <div className="flex gap-2">
                  {[5, 10, 15].map(t => (
                    <Button
                      key={t}
                      size="sm"
                      variant={loanTermYears === t ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setLoanTermYears(t)}
                    >
                      {t} yr
                    </Button>
                  ))}
                </div>
              </div>

              {/* Interest rate slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Annual interest rate</p>
                  <span className="text-xs font-semibold tabular-nums">{annualInterest.toFixed(1)}% p.a.</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={0.5}
                  value={annualInterest}
                  onChange={e => setAnnualInterest(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>3% (DBM green)</span>
                  <span>15% (commercial max)</span>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly EMI</span>
                  <span className="font-semibold tabular-nums">{rs(report.emi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly savings (Year 1)</span>
                  <span className="font-semibold tabular-nums text-emerald-700">{rs(results.monthly_savings_rs)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Net monthly impact</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold tabular-nums", netMonthly >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {netMonthly >= 0 ? "+" : ""}{rs(netMonthly)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] py-0",
                        netMonthly >= 0
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-amber-300 bg-amber-50 text-amber-700"
                      )}
                    >
                      {netMonthly >= 0 ? "Cash positive" : "Shortfall"}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Loan principal = total system cost ({rs(results.total_cost_rs)}). Savings are Year-1 figures; they grow with tariff inflation over time.
              </p>
            </CardContent>
          )}
        </Card>

        {/* ══ 4. Environmental Impact ═════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <IconBadge emoji="🌱" bg="bg-green-50" text="text-green-700" />
              <div>
                <CardTitle className="text-base">Environmental Impact</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Based on Mauritius grid emission factor</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Annual CO₂ offset"
                value={`${(report.co2.annualCO2OffsetKg / 1000).toFixed(1)} t`}
                unit="CO₂/yr"
                highlight="green"
              />
              <Metric
                label="25-year CO₂ saved"
                value={`${(report.co2.lifetime25yrCO2Kg / 1000).toFixed(1)} t`}
                unit="CO₂"
                highlight="green"
              />
              <Metric
                label="Equivalent trees planted"
                value={report.co2.equivalentTrees.toLocaleString()}
                unit="trees"
              />
              <Metric
                label="Km of driving avoided"
                value={report.co2.equivalentKmNotDriven.toLocaleString()}
                unit="km"
              />
            </div>
            <div className="rounded-lg bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
              Emission factors: Mauritius grid = 0.38 kg CO₂/kWh (Statistics Mauritius) · 1 tree ≈ 21 kg CO₂/yr · Petrol vehicle ≈ 0.12 kg CO₂/km. Lifetime figures account for 0.5%/yr panel degradation.
            </div>
          </CardContent>
        </Card>

        {/* ══ 5. Next Steps ═══════════════════════════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <IconBadge emoji="✅" bg="bg-teal-50" text="text-teal-700" />
              <div>
                <CardTitle className="text-base">Next Steps</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Your action checklist to go from estimate to installation</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {NEXT_STEPS.map((step, i) => (
                <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                    {i + 1}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                    {"link" in step && step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        Visit site →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ══ Actions ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2 justify-between pb-10">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/results")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to results
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
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
      </main>
    </div>
  )
}
