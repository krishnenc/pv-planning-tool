# How Net Metering Works in Mauritius

## What is net metering?

When a solar system produces more electricity than the household is using at that moment, the surplus flows back into the CEB grid. Under the **CEB Net Metering Scheme**, the homeowner earns a credit for every unit exported. At the end of the billing period, CEB settles the account: the household pays for the net electricity drawn from the grid and receives a payment (or bill credit) for the net electricity exported.

---

## The two savings streams

Installing solar saves money in two distinct ways:

| Stream | Mechanism | Rate |
|--------|-----------|------|
| **Bill reduction** | Solar covers daytime consumption — fewer kWh drawn from the grid means a lower CEB bill | Progressive tariff (Rs 5.40–16.20/kWh depending on band) |
| **Export credit** | Surplus solar exported to the grid earns a credit | Rs 5.10/kWh (CEB net metering tariff) |

A calculator that only applies a "percentage offset" to the existing bill misses the export credit entirely and applies the wrong rate to the bill reduction.

---

## How SolarMoris models it

SolarMoris assumes **85% self-consumption** (energy used directly on-site, including battery storage) and **15% export** (surplus fed to the grid). For a given monthly consumption:

```
remaining_grid_kwh  = monthly_kwh × (1 − 0.85)   = 15% of consumption
exported_kwh        = remaining_grid_kwh           = same 15%

bill_reduction      = original_bill − CEB_tariff(remaining_grid_kwh)
export_credit       = exported_kwh × Rs 5.10

monthly_savings     = bill_reduction + export_credit
```

The bill reduction is calculated by running the remaining consumption through the full CEB progressive tariff — not by multiplying the original bill by 0.85. This matters because a high-consumption household has units priced at Rs 11.35 or Rs 16.20/kWh; reducing consumption from 350 kWh to 52.5 kWh eliminates the expensive upper bands, so the saving is disproportionately large.

---

## Worked example — 350 kWh/month household

| Step | Calculation | Result |
|------|-------------|--------|
| Original monthly bill | CEB tariff(350 kWh) | Rs 2,727.50 |
| Remaining grid consumption | 350 × 15% | 52.5 kWh |
| New bill on remaining grid | CEB tariff(52.5 kWh) | Rs 283.50 |
| Bill reduction | 2,727.50 − 283.50 | Rs 2,444.00 |
| Export credit | 52.5 kWh × Rs 5.10 | Rs 267.75 |
| **Total monthly savings** | 2,444.00 + 267.75 | **Rs 2,711.75** |

Compare this to the naive approach of multiplying the original bill by 0.85: Rs 2,727.50 × 0.85 = **Rs 2,318.38** — an underestimate of **Rs 393/month**, or **Rs 4,716/year**.

Over a 25-year project life that gap, inflated and discounted, represents a material NPV difference.

---

## Applying for net metering in Mauritius

1. Install a CEB-approved solar system with a certified installer.
2. Submit the net metering application via the **ceb.mu** portal.
3. CEB installs a bidirectional meter that records both import and export.
4. Monthly billing reflects the net position; export credits can offset future bills.

The **DBM/MDB Green Loan** (3–5% p.a.) and **MRA VAT exemption** on solar equipment are companion incentives worth exploring alongside the net metering application.
