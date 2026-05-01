"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sun, ArrowLeft, RotateCcw, Save, CheckCircle2 } from "lucide-react"
import { api, AppConfig, CONFIG_KEY, DEFAULT_CONFIG } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type FormValues = { [K in keyof AppConfig]: string }

function toForm(cfg: AppConfig): FormValues {
  return Object.fromEntries(
    Object.entries(cfg).map(([k, v]) => [k, String(v)])
  ) as FormValues
}

function fromForm(form: FormValues): AppConfig {
  return {
    ceb_band_1_limit_kwh:    parseInt(form.ceb_band_1_limit_kwh, 10),
    ceb_band_1_rate:         parseFloat(form.ceb_band_1_rate),
    ceb_band_2_limit_kwh:    parseInt(form.ceb_band_2_limit_kwh, 10),
    ceb_band_2_rate:         parseFloat(form.ceb_band_2_rate),
    ceb_band_3_limit_kwh:    parseInt(form.ceb_band_3_limit_kwh, 10),
    ceb_band_3_rate:         parseFloat(form.ceb_band_3_rate),
    ceb_band_4_rate:         parseFloat(form.ceb_band_4_rate),
    solar_irradiance_kwh_m2_day: parseFloat(form.solar_irradiance_kwh_m2_day),
    system_losses:           parseFloat(form.system_losses),
    average_system_cost_rs_wp: parseFloat(form.average_system_cost_rs_wp),
    battery_cost_rs_kwh:     parseFloat(form.battery_cost_rs_kwh),
    solar_panel_wattage:     parseInt(form.solar_panel_wattage, 10),
    solar_panel_footprint_m2: parseFloat(form.solar_panel_footprint_m2),
    grid_offset_factor:      parseFloat(form.grid_offset_factor),
    project_lifetime_years:  parseInt(form.project_lifetime_years, 10),
  }
}

function loadSaved(): AppConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as AppConfig) : null
  } catch {
    return null
  }
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  id,
  label,
  description,
  unit,
  value,
  defaultValue,
  step,
  min,
  onChange,
}: {
  id: keyof AppConfig
  label: string
  description: string
  unit: string
  value: string
  defaultValue: string
  step?: string
  min?: string
  onChange: (id: keyof AppConfig, val: string) => void
}) {
  const isModified = value !== defaultValue
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start py-3 border-b border-border/40 last:border-0">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {isModified && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              custom
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 sm:w-44">
        <Input
          id={id}
          type="number"
          step={step ?? "any"}
          min={min ?? "0"}
          value={value}
          onChange={(e) => onChange(id, e.target.value)}
          className="text-right tabular-nums"
        />
        <span className="text-xs text-muted-foreground w-14 shrink-0">{unit}</span>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [defaults, setDefaults] = useState<AppConfig>(DEFAULT_CONFIG)
  const [form, setForm] = useState<FormValues>(() => toForm(loadSaved() ?? DEFAULT_CONFIG))
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getConfig()
      .then((cfg) => {
        setDefaults(cfg)
        // Only apply fetched defaults if the user has no saved config
        if (!loadSaved()) setForm(toForm(cfg))
      })
      .catch(() => { /* stay with bundled defaults */ })
      .finally(() => setLoading(false))
  }, [])

  const set = (id: keyof AppConfig, val: string) => {
    setSaved(false)
    setForm((prev) => ({ ...prev, [id]: val }))
  }

  const handleSave = () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(fromForm(form)))
    setSaved(true)
  }

  const handleReset = () => {
    localStorage.removeItem(CONFIG_KEY)
    setForm(toForm(defaults))
    setSaved(false)
  }

  const defaultForm = toForm(defaults)
  const hasCustom = Object.keys(form).some(
    (k) => form[k as keyof AppConfig] !== defaultForm[k as keyof AppConfig]
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-primary">SolarMoris</span>
          </a>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculation Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust default parameters for your location and market conditions. Changes are stored
            locally and applied to every new calculation.
          </p>
        </div>

        {/* Status banner */}
        {hasCustom && !saved && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <span className="font-medium">Unsaved changes</span>
            <span className="text-amber-600">— click Save to apply them to future calculations.</span>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">Settings saved.</span>
            <span className="text-emerald-600">All new calculations will use these values.</span>
          </div>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground">Loading server defaults…</p>
        )}

        {/* ── CEB Tariff Rates ─────────────────────────────────────────────── */}
        <Section title="CEB Tariff Rates (2026)">
          <FieldRow id="ceb_band_1_limit_kwh" label="Band 1 limit"
            description="Upper boundary of Band 1 (0 – limit kWh)"
            unit="kWh" step="1" value={form.ceb_band_1_limit_kwh} defaultValue={defaultForm.ceb_band_1_limit_kwh} onChange={set} />
          <FieldRow id="ceb_band_1_rate" label="Band 1 rate"
            description="Rs per kWh for the first band (0–100 kWh)"
            unit="Rs/kWh" step="0.01" value={form.ceb_band_1_rate} defaultValue={defaultForm.ceb_band_1_rate} onChange={set} />
          <FieldRow id="ceb_band_2_limit_kwh" label="Band 2 limit"
            description="Upper boundary of Band 2"
            unit="kWh" step="1" value={form.ceb_band_2_limit_kwh} defaultValue={defaultForm.ceb_band_2_limit_kwh} onChange={set} />
          <FieldRow id="ceb_band_2_rate" label="Band 2 rate"
            description="Rs per kWh for the second band (101–300 kWh)"
            unit="Rs/kWh" step="0.01" value={form.ceb_band_2_rate} defaultValue={defaultForm.ceb_band_2_rate} onChange={set} />
          <FieldRow id="ceb_band_3_limit_kwh" label="Band 3 limit"
            description="Upper boundary of Band 3"
            unit="kWh" step="1" value={form.ceb_band_3_limit_kwh} defaultValue={defaultForm.ceb_band_3_limit_kwh} onChange={set} />
          <FieldRow id="ceb_band_3_rate" label="Band 3 rate"
            description="Rs per kWh for the third band (301–600 kWh)"
            unit="Rs/kWh" step="0.01" value={form.ceb_band_3_rate} defaultValue={defaultForm.ceb_band_3_rate} onChange={set} />
          <FieldRow id="ceb_band_4_rate" label="Band 4 rate"
            description="Rs per kWh for consumption above 600 kWh"
            unit="Rs/kWh" step="0.01" value={form.ceb_band_4_rate} defaultValue={defaultForm.ceb_band_4_rate} onChange={set} />
        </Section>

        {/* ── Solar Resource ───────────────────────────────────────────────── */}
        <Section title="Solar Resource">
          <FieldRow id="solar_irradiance_kwh_m2_day" label="Solar irradiance"
            description="Annual average peak sun hours for your location (Mauritius ≈ 5.2)"
            unit="kWh/m²/day" step="0.1" value={form.solar_irradiance_kwh_m2_day} defaultValue={defaultForm.solar_irradiance_kwh_m2_day} onChange={set} />
          <FieldRow id="system_losses" label="System losses"
            description="Combined inverter, temperature, wiring, and soiling losses (0.0–1.0)"
            unit="fraction" step="0.01" min="0" value={form.system_losses} defaultValue={defaultForm.system_losses} onChange={set} />
        </Section>

        {/* ── System Costs ─────────────────────────────────────────────────── */}
        <Section title="System & Battery Costs">
          <FieldRow id="average_system_cost_rs_wp" label="PV system cost"
            description="Installed cost per watt-peak including panels, inverter, racking, and labour"
            unit="Rs/Wp" step="1" value={form.average_system_cost_rs_wp} defaultValue={defaultForm.average_system_cost_rs_wp} onChange={set} />
          <FieldRow id="battery_cost_rs_kwh" label="Battery cost"
            description="Installed cost per kWh of battery storage (LFP typical)"
            unit="Rs/kWh" step="500" value={form.battery_cost_rs_kwh} defaultValue={defaultForm.battery_cost_rs_kwh} onChange={set} />
        </Section>

        {/* ── Panel Specifications ─────────────────────────────────────────── */}
        <Section title="Panel Specifications">
          <FieldRow id="solar_panel_wattage" label="Panel wattage"
            description="Rated power of each solar panel"
            unit="Wp" step="10" value={form.solar_panel_wattage} defaultValue={defaultForm.solar_panel_wattage} onChange={set} />
          <FieldRow id="solar_panel_footprint_m2" label="Panel footprint"
            description="Area per panel including inter-row and edge spacing"
            unit="m²" step="0.1" value={form.solar_panel_footprint_m2} defaultValue={defaultForm.solar_panel_footprint_m2} onChange={set} />
          <FieldRow id="grid_offset_factor" label="Grid offset factor"
            description="Fraction of the monthly bill eliminated by solar generation (0.0–1.0)"
            unit="fraction" step="0.01" min="0" value={form.grid_offset_factor} defaultValue={defaultForm.grid_offset_factor} onChange={set} />
        </Section>

        {/* ── Financial Assumptions ────────────────────────────────────────── */}
        <Section title="Financial Assumptions">
          <FieldRow id="project_lifetime_years" label="Project lifetime"
            description="Analysis horizon for ROI calculation (typically 25 years for solar panels)"
            unit="years" step="1" min="1" value={form.project_lifetime_years} defaultValue={defaultForm.project_lifetime_years} onChange={set} />
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button size="sm" onClick={handleSave} className={cn("gap-1.5", saved && "bg-emerald-600 hover:bg-emerald-700")}>
            {saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save settings
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
