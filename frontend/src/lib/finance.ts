// ─── Constants ────────────────────────────────────────────────────────────────

export const INFLATION_RATE            = 0.045   // Mauritius CPI
export const DISCOUNT_RATE             = 0.08    // WACC
export const PANEL_DEGRADATION         = 0.005   // 0.5 %/yr
export const MAINTENANCE_RS_PER_KW_YR  = 1_200
export const CO2_KG_PER_KWH            = 0.38    // Mauritius grid emission factor
export const TREE_CO2_KG_PER_YR        = 21      // kg CO₂ absorbed per tree per year
export const EV_CO2_KG_PER_KM          = 0.12    // petrol car equivalent

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CashFlowRow {
  year: number                    // 1-based (1–25)
  degradationFactor: number       // (1 - PANEL_DEGRADATION)^(year-1)
  grossSavingsRs: number          // annual_savings × degradation × inflation
  maintenanceCostRs: number       // MAINTENANCE_RS_PER_KW_YR × pv_kw
  netCashFlowRs: number           // gross - maintenance
  cumulativeNetRs: number         // running undiscounted sum (no year-0 outflow)
  discountedCashFlowRs: number    // net / (1 + discountRate)^year
  cumulativeDiscountedRs: number  // seeded at -total_cost, adds discounted CF each year
}

export interface BuildCashFlowsParams {
  annual_savings_rs: number
  total_cost_rs: number
  pv_kw: number
  years?: number
  inflationRate?: number
  discountRate?: number
  degradationPerYear?: number
  maintenanceRsPerKwYr?: number
}

export interface CO2Result {
  annualCO2OffsetKg: number
  lifetime25yrCO2Kg: number
  equivalentTrees: number
  equivalentKmNotDriven: number
}

// ─── buildCashFlows ───────────────────────────────────────────────────────────

export function buildCashFlows(params: BuildCashFlowsParams): CashFlowRow[] {
  const {
    annual_savings_rs,
    total_cost_rs,
    pv_kw,
    years                = 25,
    inflationRate        = INFLATION_RATE,
    discountRate         = DISCOUNT_RATE,
    degradationPerYear   = PANEL_DEGRADATION,
    maintenanceRsPerKwYr = MAINTENANCE_RS_PER_KW_YR,
  } = params

  const rows: CashFlowRow[] = []
  let cumNet        = 0
  let cumDiscounted = -total_cost_rs   // year-0 outflow seeds the discounted cumulative

  for (let y = 1; y <= years; y++) {
    const degradationFactor    = Math.pow(1 - degradationPerYear, y - 1)
    const inflationMultiplier  = Math.pow(1 + inflationRate,      y - 1)
    const grossSavingsRs       = annual_savings_rs * degradationFactor * inflationMultiplier
    const maintenanceCostRs    = maintenanceRsPerKwYr * pv_kw
    const netCashFlowRs        = grossSavingsRs - maintenanceCostRs
    const discountedCashFlowRs = netCashFlowRs / Math.pow(1 + discountRate, y)

    cumNet        += netCashFlowRs
    cumDiscounted += discountedCashFlowRs

    rows.push({
      year: y,
      degradationFactor,
      grossSavingsRs,
      maintenanceCostRs,
      netCashFlowRs,
      cumulativeNetRs:        cumNet,
      discountedCashFlowRs,
      cumulativeDiscountedRs: cumDiscounted,
    })
  }

  return rows
}

// ─── calcNPV ─────────────────────────────────────────────────────────────────

export function calcNPV(rows: CashFlowRow[]): number {
  return rows[rows.length - 1].cumulativeDiscountedRs
}

// ─── calcIRR ─────────────────────────────────────────────────────────────────

function npvAtRate(rate: number, totalCostRs: number, rows: CashFlowRow[]): number {
  let pv = -totalCostRs
  for (const row of rows) {
    pv += row.netCashFlowRs / Math.pow(1 + rate, row.year)
  }
  return pv
}

export function calcIRR(
  totalCostRs: number,
  rows: CashFlowRow[],
  maxIter = 100,
  tol     = 0.0001,
): number | null {
  const lo0 = 0
  const hi0 = 5.0

  if (npvAtRate(lo0, totalCostRs, rows) <= 0) return null  // project never breaks even

  let lo = lo0
  let hi = hi0

  for (let i = 0; i < maxIter; i++) {
    const mid    = (lo + hi) / 2
    const npvMid = npvAtRate(mid, totalCostRs, rows)
    if (Math.abs(npvMid) < tol) return mid
    if (npvMid > 0) lo = mid
    else             hi = mid
  }

  return (lo + hi) / 2
}

// ─── calcDiscountedPayback ────────────────────────────────────────────────────

export function calcDiscountedPayback(rows: CashFlowRow[]): number | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].cumulativeDiscountedRs >= 0) {
      if (i === 0) return rows[i].year
      const prev = rows[i - 1].cumulativeDiscountedRs  // negative
      const curr = rows[i].cumulativeDiscountedRs       // zero or positive
      const fraction = Math.abs(prev) / (Math.abs(prev) + curr)
      return (i) + fraction   // i is 0-based, row.year == i+1; result is fractional years
    }
  }
  return null  // never repaid within project lifetime
}

// ─── calcEMI ─────────────────────────────────────────────────────────────────

export function calcEMI(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  const n = termYears * 12
  const r = annualRatePercent / 100 / 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// ─── calcCO2 ─────────────────────────────────────────────────────────────────

export function calcCO2(params: {
  monthly_kwh: number
  grid_offset_factor?: number
  rows: CashFlowRow[]
}): CO2Result {
  const { monthly_kwh, grid_offset_factor = 0.85, rows } = params
  const annualSolarKwhY1 = monthly_kwh * 12 * grid_offset_factor
  const annualCO2OffsetKg = annualSolarKwhY1 * CO2_KG_PER_KWH

  const lifetime25yrCO2Kg = rows.reduce(
    (sum, row) => sum + annualSolarKwhY1 * row.degradationFactor * CO2_KG_PER_KWH,
    0,
  )

  return {
    annualCO2OffsetKg,
    lifetime25yrCO2Kg,
    equivalentTrees:       Math.round(lifetime25yrCO2Kg / TREE_CO2_KG_PER_YR),
    equivalentKmNotDriven: Math.round(lifetime25yrCO2Kg / EV_CO2_KG_PER_KM),
  }
}
