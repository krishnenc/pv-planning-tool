"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sun, ChevronDown, ArrowLeft } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string
  a: React.ReactNode
}

interface FAQSection {
  title: string
  id: string
  items: FAQItem[]
}

// ─── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ item, defaultOpen = false }: { item: FAQItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        <span>{item.q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 mt-0.5",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
          {item.a}
        </div>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ section }: { section: FAQSection }) {
  return (
    <div id={section.id} className="scroll-mt-20">
      <h2 className="text-base font-semibold text-foreground mb-1 mt-8 first:mt-0">
        {section.title}
      </h2>
      <div className="rounded-lg border border-border bg-card px-4">
        {section.items.map((item, i) => (
          <AccordionItem key={i} item={item} defaultOpen={i === 0 && section.items.length === 1} />
        ))}
      </div>
    </div>
  )
}

// ─── Shared formatting helpers ────────────────────────────────────────────────

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-2 rounded-md bg-muted px-4 py-3 text-xs font-mono text-foreground whitespace-pre-wrap">
      {children}
    </pre>
  )
}

function Table({ rows, headers }: { rows: (string | number)[][]; headers: string[] }) {
  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 bg-muted font-semibold border border-border/60">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/40"}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border border-border/60">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {children}
    </div>
  )
}

// ─── FAQ content ──────────────────────────────────────────────────────────────

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: "Understanding Your Electricity Bill",
    id: "bill",
    items: [
      {
        q: "What is a kWh and how do I find mine?",
        a: (
          <>
            <p>
              A <strong>kilowatt-hour (kWh)</strong> is the standard unit of electricity.
              One kWh is the energy used by a 1,000-watt appliance running for one hour —
              for example, a 100W fan running for 10 hours uses 1 kWh.
            </p>
            <p>
              Your monthly kWh consumption appears on your CEB bill as <em>"Units consumed"</em>.
              Look for a number like <strong>320 kWh</strong> or <strong>480 Units</strong>.
              If you have several recent bills, use the average — consumption varies with seasons
              (air-conditioning in summer pushes it up significantly).
            </p>
            <p>
              You can also use the <strong>bill upload</strong> feature to let the tool extract
              the figure automatically from a PDF or photo of your bill.
            </p>
          </>
        ),
      },
      {
        q: "What are the CEB 2026 tariff bands and how is my bill calculated?",
        a: (
          <>
            <p>
              The CEB uses a <strong>progressive (tiered) tariff</strong>: the more electricity
              you use, the higher the rate on the extra units. As of 2026 there are four bands
              for domestic customers:
            </p>
            <Table
              headers={["Band", "kWh range", "Rate (Rs/kWh)"]}
              rows={[
                ["1", "0 – 100 kWh", "Rs 5.40"],
                ["2", "101 – 300 kWh", "Rs 8.10"],
                ["3", "301 – 600 kWh", "Rs 11.35"],
                ["4", "above 600 kWh", "Rs 16.20"],
              ]}
            />
            <p>
              Each band applies only to the units within that range. A household using
              350 kWh pays:
            </p>
            <Formula>
              {`Band 1:  100 kWh × Rs  5.40 = Rs   540.00
Band 2:  200 kWh × Rs  8.10 = Rs 1,620.00
Band 3:   50 kWh × Rs 11.35 = Rs   567.50
─────────────────────────────────────────
Total:   350 kWh           = Rs 2,727.50`}
            </Formula>
            <Note>
              These rates are pre-loaded as the default settings. You can update them in
              the <strong>Settings</strong> page if CEB adjusts them.
            </Note>
          </>
        ),
      },
      {
        q: "Why do my savings look much larger than just cutting 85% of my bill?",
        a: (
          <>
            <p>
              Because of how the progressive tariff works. When solar covers most of your
              consumption, the kWh you still draw from the grid come entirely from the
              cheapest bottom band — the expensive upper bands disappear.
            </p>
            <p>
              For a 350 kWh household, solar reduces the grid draw to about 52.5 kWh.
              The new grid bill is only Rs 283.50 (all in Band 1), compared to Rs 2,727.50 before.
              That is a saving of Rs 2,444 — not 85% × Rs 2,727.50 = Rs 2,318. The difference
              is Rs 126/month, or roughly Rs 1,500/year.
            </p>
            <p>
              High-consumption households in Band 3 or Band 4 benefit even more from this effect.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "How the Solar System Is Sized",
    id: "sizing",
    items: [
      {
        q: "What is a kilowatt-peak (kWp) and why does it matter?",
        a: (
          <>
            <p>
              <strong>Kilowatt-peak (kWp)</strong> is the nameplate capacity of a solar
              system — the maximum power it produces under standard test conditions
              (1,000 W/m² of sunlight, 25°C). A 3 kWp system produces up to 3,000 watts
              at peak sun.
            </p>
            <p>
              In practice, panels rarely hit peak output — clouds, morning/evening angles,
              heat, and wiring all reduce real output. The tool accounts for these through
              the <em>system losses</em> figure (default 20%).
            </p>
          </>
        ),
      },
      {
        q: "How does the tool decide how many panels I need?",
        a: (
          <>
            <p>The sizing works in three steps:</p>
            <Formula>
              {`Step 1 — Daily consumption
  daily_kWh = monthly_kWh ÷ 30
  e.g.  350 kWh ÷ 30 = 11.67 kWh/day

Step 2 — Effective peak sun hours (irradiance minus losses)
  effective_hours = irradiance × (1 − system_losses)
  e.g.  5.2 × (1 − 0.20) = 4.16 peak sun hours/day

Step 3 — Required PV capacity
  pv_kW = daily_kWh ÷ effective_hours
  e.g.  11.67 ÷ 4.16 = 2.80 kWp`}
            </Formula>
            <p>
              Panel count is then <code>⌈pv_kW × 1000 ÷ panel_wattage⌉</code>.
              With 400 Wp panels: ⌈2,800 ÷ 400⌉ = <strong>7 panels</strong>.
            </p>
            <p>
              If you enter a roof area, the tool checks whether 7 panels fit
              (7 × 2.0 m² = 14 m²) and caps the system to what the roof can hold
              if it is smaller.
            </p>
          </>
        ),
      },
      {
        q: "What is solar irradiance and what value does SolarMoris use?",
        a: (
          <>
            <p>
              <strong>Solar irradiance</strong> (kWh/m²/day) is the average daily solar energy
              arriving at a horizontal surface. The default for Mauritius is{" "}
              <strong>5.2 kWh/m²/day</strong>, which is the island's annual average based on
              meteorological data from the Mauritius Meteorological Services and NASA's POWER dataset.
            </p>
            <p>
              This is higher than northern Europe (~2.8) but slightly lower than the Sahara (~6.5).
              Mauritius benefits from strong year-round sun with only modest seasonal variation.
            </p>
            <p>
              If you know the specific irradiance for your region of Mauritius
              (north coast vs. highlands), you can adjust this in Settings.
            </p>
          </>
        ),
      },
      {
        q: "What are system losses?",
        a: (
          <>
            <p>
              Real-world solar output is always lower than the nameplate rating. The default
              loss factor of <strong>20%</strong> covers four sources:
            </p>
            <Table
              headers={["Loss source", "Typical contribution"]}
              rows={[
                ["Inverter conversion (DC → AC)", "4 – 6%"],
                ["High temperature (panels run hot under the sun)", "5 – 8%"],
                ["Wiring and connection resistance", "2 – 3%"],
                ["Soiling (dust, bird droppings)", "2 – 4%"],
              ]}
            />
            <p>
              A well-maintained system in Mauritius typically runs at 18–22% total losses.
              If your installer provides a design report, use their figure in Settings for
              a more precise estimate.
            </p>
          </>
        ),
      },
      {
        q: "What is the grid offset factor (self-consumption rate)?",
        a: (
          <>
            <p>
              The <strong>grid offset factor</strong> (default <strong>0.85</strong>) represents
              the fraction of your solar production that is consumed directly on-site — either
              used immediately or stored in a battery for use overnight.
            </p>
            <p>
              The remaining 15% is exported to the CEB grid and earns the net-metering export
              credit of Rs 5.10/kWh.
            </p>
            <p>
              Without a battery, self-consumption is typically 70–80% for a home occupied
              during the day, and can drop to 50–60% for homes empty all day. Adding a battery
              pushes it to 85–95%. The default of 0.85 assumes a battery or a household with
              good daytime occupancy.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Net Metering and Your Monthly Savings",
    id: "savings",
    items: [
      {
        q: "What is net metering?",
        a: (
          <>
            <p>
              Under the <strong>CEB Net Metering Scheme</strong>, any solar electricity you
              produce but do not use immediately flows back into the CEB grid. CEB records
              both what you import from the grid and what you export to it.
            </p>
            <p>
              At billing time, you pay for the <em>net</em> units imported and receive a
              credit for the units exported. The credit rate is{" "}
              <strong>Rs 5.10/kWh</strong> (the CEB export tariff).
            </p>
          </>
        ),
      },
      {
        q: "How exactly are my monthly savings calculated?",
        a: (
          <>
            <p>Savings come from two streams:</p>
            <Formula>
              {`Stream 1 — Bill reduction
  remaining_grid_kWh = monthly_kWh × (1 − grid_offset_factor)
                     = 350 × 0.15 = 52.5 kWh

  new_bill = CEB tariff on 52.5 kWh = Rs 283.50
  bill_reduction = Rs 2,727.50 − Rs 283.50 = Rs 2,444.00

Stream 2 — Export credit (net metering)
  exported_kWh    = 52.5 kWh
  export_credit   = 52.5 × Rs 5.10 = Rs 267.75

Total monthly savings = Rs 2,444.00 + Rs 267.75 = Rs 2,711.75`}
            </Formula>
            <p>
              The new bill is calculated by running the remaining 52.5 kWh through the full
              CEB progressive tariff — not by multiplying the original bill by 15%.
              Because 52.5 kWh falls entirely in Band 1 (Rs 5.40/kWh), the new bill is
              much smaller than 15% of the original.
            </p>
          </>
        ),
      },
      {
        q: "What is the export credit and will I actually receive money from CEB?",
        a: (
          <>
            <p>
              Yes, the export credit is a real payment. CEB pays <strong>Rs 5.10 per kWh</strong>{" "}
              exported to the grid under the net metering scheme. In practice, this typically
              appears as a <em>bill credit</em> rather than a cash payment — it reduces your
              next bill.
            </p>
            <p>
              Note that the export tariff (Rs 5.10/kWh) is lower than any import band
              (Rs 5.40/kWh minimum). This is intentional: CEB discourages oversizing systems
              purely for export. The tool sizes your system to match your consumption, not to maximise export.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Battery Storage",
    id: "battery",
    items: [
      {
        q: "Do I need a battery?",
        a: (
          <>
            <p>
              A battery is not required for solar to work. Without one, surplus solar
              during the day is exported to the grid (earning the Rs 5.10/kWh credit),
              and you draw from the grid at night at the standard import tariff.
            </p>
            <p>
              A battery makes financial sense when:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Your home is empty during the day (low daytime self-consumption)</li>
              <li>You want protection from power cuts</li>
              <li>Night-time consumption is significant (EVs charging overnight, for example)</li>
            </ul>
            <p>
              At Rs 28,000/kWh (2026 benchmark), batteries add substantially to upfront cost
              and typically extend the payback period by 2–4 years. Run the calculation both
              ways to compare.
            </p>
          </>
        ),
      },
      {
        q: "How is the battery size calculated?",
        a: (
          <>
            <p>
              The battery is sized to cover <strong>one full day of consumption</strong>:
            </p>
            <Formula>
              {`battery_kWh = daily_kWh = monthly_kWh ÷ 30
e.g.  350 ÷ 30 = 11.7 kWh`}
            </Formula>
            <p>
              This is a conservative sizing — it ensures you can run through one overcast day
              without drawing from the grid. Many households choose smaller batteries
              (4–8 kWh) to reduce cost; you can model this by adjusting the Settings.
            </p>
          </>
        ),
      },
      {
        q: "How is battery cost calculated?",
        a: (
          <>
            <Formula>
              {`battery_cost = battery_kWh × Rs 28,000/kWh
e.g.  11.7 kWh × Rs 28,000 = Rs 327,600`}
            </Formula>
            <p>
              The Rs 28,000/kWh default reflects 2026 market pricing for LiFePO₄ battery
              systems in Mauritius including inverter/charger. Lithium battery prices are
              falling — check recent quotes from local installers and update this figure in
              Settings for a more accurate estimate.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Roof Area",
    id: "roof",
    items: [
      {
        q: "Why does the tool ask for my roof area?",
        a: (
          <>
            <p>
              Panel count is first determined by your energy needs. The roof area check
              then verifies that those panels physically fit on your roof.
            </p>
            <p>
              Each panel requires <strong>2.0 m²</strong> (the default accounts for the panel
              itself plus spacing between rows needed to avoid self-shading). If your usable
              roof area is smaller than the required footprint, the tool caps the system to what
              fits and shows a warning.
            </p>
            <p>
              Roof area is <strong>optional</strong>. Skip it if you do not know it — the tool
              will give you the unconstrained optimal sizing.
            </p>
          </>
        ),
      },
      {
        q: "How do I estimate my usable roof area?",
        a: (
          <>
            <p>
              <strong>Usable area</strong> means the north- or west-facing sections
              (Mauritius is in the southern hemisphere, so north-facing roofs get the most sun) that
              are free of shading from chimneys, water tanks, and neighbouring trees.
            </p>
            <p>
              A rough estimate: measure the external footprint of your house (length × width)
              and multiply by 0.4 – 0.6 for the accessible roof slope facing the right direction.
              For a 10 m × 8 m house (80 m² footprint), a typical usable area is 30–45 m²,
              enough for 15–22 panels.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Financial Calculations",
    id: "financial",
    items: [
      {
        q: "What is the simple payback period?",
        a: (
          <>
            <p>
              The <strong>simple payback period</strong> is how many years it takes for your
              cumulative savings to equal the upfront system cost — ignoring the time value of money.
            </p>
            <Formula>
              {`simple_payback = total_system_cost ÷ annual_savings
e.g.  Rs 154,000 ÷ Rs 32,541 = 4.7 years`}
            </Formula>
            <p>
              After payback, every rupee saved is net profit. A payback under 6 years is
              generally considered excellent for solar in Mauritius.
            </p>
          </>
        ),
      },
      {
        q: "What is the discounted payback period and why is it longer?",
        a: (
          <>
            <p>
              The <strong>discounted payback</strong> accounts for the time value of money:
              Rs 1,000 saved in year 10 is worth less than Rs 1,000 saved today, because
              money today could be invested or earn interest.
            </p>
            <p>
              Each year's savings are divided by <code>(1 + 8%)^year</code> (the discount rate)
              before being added to the cumulative total. The discounted payback is the year
              when the discounted cumulative savings first exceed the initial investment.
            </p>
            <p>
              It is always equal to or longer than the simple payback. If you are financing
              the system with a loan, the discounted payback gives a more conservative and
              realistic picture.
            </p>
          </>
        ),
      },
      {
        q: "What is NPV (Net Present Value)?",
        a: (
          <>
            <p>
              <strong>NPV</strong> is the total value of the investment in today's rupees.
              It sums up all 25 years of discounted net savings, then subtracts the upfront cost:
            </p>
            <Formula>
              {`NPV = −initial_cost + Σ (net_savings_year_t ÷ (1 + 8%)^t)
        for t = 1 to 25`}
            </Formula>
            <p>
              A <strong>positive NPV</strong> means the investment creates wealth in real terms —
              it beats simply keeping your money in an 8% investment. A negative NPV means the
              opposite.
            </p>
            <p>
              The 8% discount rate represents the opportunity cost of capital (what you could
              earn elsewhere). You can adjust it in Settings.
            </p>
          </>
        ),
      },
      {
        q: "What is IRR (Internal Rate of Return)?",
        a: (
          <>
            <p>
              The <strong>IRR</strong> is the annual percentage return of the investment —
              the discount rate at which NPV would equal zero. Think of it as the interest
              rate your solar investment is effectively earning.
            </p>
            <p>
              If your IRR is 18%, the solar system performs like an investment paying 18% per year.
              Compare this to alternative investments (bank FDs, equities) to assess whether solar
              is a good use of capital for you.
            </p>
            <p>
              The tool calculates IRR using a binary search algorithm applied to the 25-year
              net cash flow series.
            </p>
          </>
        ),
      },
      {
        q: "What is the 25-year ROI?",
        a: (
          <>
            <p>
              The <strong>25-year ROI</strong> shown on the results page is a simple
              (non-discounted) return on investment:
            </p>
            <Formula>
              {`roi_25yr = (total_lifetime_savings − total_cost) ÷ total_cost × 100%

Where total_lifetime_savings = annual_savings × 25
(before degradation and inflation adjustments in the full report)`}
            </Formula>
            <p>
              It answers: "If I spend Rs X today, how many times will I get it back over
              25 years?" A 250% ROI means you get 3.5× your money back.
            </p>
            <Note>
              For investment comparison, use IRR and NPV — they account for the timing of
              cash flows. The 25-year ROI is a quick headline figure only.
            </Note>
          </>
        ),
      },
      {
        q: "How does panel degradation affect year-on-year savings?",
        a: (
          <>
            <p>
              Solar panels lose a small amount of output each year. The default is{" "}
              <strong>0.5% per year</strong> (standard for monocrystalline panels), meaning:
            </p>
            <Formula>
              {`Year  1: 100.0% output  →  full savings
Year  5:  97.5% output
Year 10:  95.1% output
Year 25:  88.4% output`}
            </Formula>
            <p>
              In the 25-year cash flow table, each year's gross savings are multiplied by
              the degradation factor: <code>(1 − 0.005)^(year−1)</code>.
            </p>
          </>
        ),
      },
      {
        q: "How does inflation factor into the projections?",
        a: (
          <>
            <p>
              Inflation is good for solar economics: as electricity tariffs rise, your
              solar savings grow. The model applies <strong>4.5% annual inflation</strong>
              (Mauritius long-run CPI average) to year-1 savings each year:
            </p>
            <Formula>
              {`gross_savings_year_t = annual_savings × degradation_factor_t × (1 + 4.5%)^(t−1)`}
            </Formula>
            <p>
              Degradation (−0.5%/year) and inflation (+4.5%/year) partly offset each other,
              but inflation wins: real-terms savings grow over time. This is why the 25-year
              cumulative saving is substantially larger than 25 × year-1 savings.
            </p>
          </>
        ),
      },
      {
        q: "What is the annual maintenance cost?",
        a: (
          <>
            <p>
              The model deducts <strong>Rs 1,200 per installed kW per year</strong> for
              maintenance. For a 2.8 kWp system that is Rs 3,360/year.
            </p>
            <p>
              This covers annual panel cleaning, inverter inspection, and a provision for
              minor component replacements. It does <em>not</em> cover inverter replacement
              (typically needed once in 25 years at Rs 30,000–80,000 depending on size) —
              factor this in separately for a conservative estimate.
            </p>
          </>
        ),
      },
      {
        q: "How is the loan EMI (monthly instalment) calculated?",
        a: (
          <>
            <p>
              The financing section uses the standard loan amortisation formula:
            </p>
            <Formula>
              {`EMI = P × r × (1 + r)^n
          ───────────────────────
              (1 + r)^n − 1

Where:
  P = principal (total system cost)
  r = monthly interest rate = annual_rate ÷ 12
  n = number of monthly payments = term_years × 12`}
            </Formula>
            <p>
              The default inputs in the report are 7% annual interest over 10 years —
              roughly aligned with the DBM Green Loan and commercial bank solar loan
              products available in Mauritius. Adjust both fields to match any actual
              financing offer you receive.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "CO₂ and Environmental Impact",
    id: "co2",
    items: [
      {
        q: "How is the CO₂ offset calculated?",
        a: (
          <>
            <p>
              The Mauritius grid has an <strong>emission factor of 0.38 kg CO₂ per kWh</strong>{" "}
              (based on the CEB generation mix — predominantly heavy fuel oil and coal with
              some hydro and wind). Every kWh generated by your solar panels avoids 0.38 kg
              of CO₂ that would otherwise have been emitted at the power station.
            </p>
            <Formula>
              {`annual_CO₂_offset = monthly_kWh × 12 × grid_offset_factor × 0.38 kg/kWh
e.g. 350 × 12 × 0.85 × 0.38 = 1,354 kg/year

25-year total: sums each year with panel degradation applied`}
            </Formula>
          </>
        ),
      },
      {
        q: "What does \"equivalent trees\" mean?",
        a: (
          <>
            <p>
              A mature tree absorbs approximately <strong>21 kg of CO₂ per year</strong>
              (a commonly used figure from forestry research). The equivalent tree count is:
            </p>
            <Formula>
              {`equivalent_trees = lifetime_CO₂_offset_kg ÷ (21 kg/tree/year × 25 years)
                 = lifetime_CO₂_offset_kg ÷ 525`}
            </Formula>
            <p>
              This is an illustrative comparison, not a rigorous carbon accounting figure.
              It gives a concrete sense of the environmental scale of the investment.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Settings and Assumptions",
    id: "settings",
    items: [
      {
        q: "What can I customise in Settings?",
        a: (
          <>
            <p>The Settings page lets you adjust 15 parameters grouped into four areas:</p>
            <Table
              headers={["Group", "Parameters"]}
              rows={[
                ["CEB Tariffs", "Band limits (kWh) and rates (Rs/kWh) for all 4 bands"],
                ["Solar Resource", "Irradiance (kWh/m²/day) and system losses (fraction)"],
                ["Costs", "PV system cost (Rs/Wp) and battery cost (Rs/kWh)"],
                ["Panel specs", "Panel wattage (Wp), footprint (m²), grid offset factor"],
                ["Financial", "Project lifetime (years)"],
              ]}
            />
            <p>
              Fields shown with a <strong>custom</strong> badge have been changed from the
              server defaults. All changes are saved locally to your browser — they never
              leave your device.
            </p>
          </>
        ),
      },
      {
        q: "How were the default values chosen?",
        a: (
          <>
            <Table
              headers={["Default", "Value", "Source"]}
              rows={[
                ["Irradiance", "5.2 kWh/m²/day", "NASA POWER / Mauritius Meteorological Services annual average"],
                ["System losses", "20%", "Industry standard for tropical climates"],
                ["PV cost", "Rs 55/Wp", "2026 installed cost benchmark, Mauritius market"],
                ["Battery cost", "Rs 28,000/kWh", "2026 LiFePO₄ system pricing, Mauritius"],
                ["Panel wattage", "400 Wp", "Standard residential monocrystalline panel"],
                ["Grid offset", "0.85", "Typical for battery-equipped or daytime-occupied home"],
                ["Degradation", "0.5%/yr", "Manufacturer warranty standard for monocrystalline"],
                ["Inflation", "4.5%", "Mauritius CPI 10-year average"],
                ["Discount rate", "8%", "Conservative WACC for household investment"],
                ["Maintenance", "Rs 1,200/kW/yr", "Local installer service contract average"],
                ["CO₂ factor", "0.38 kg/kWh", "CEB generation mix, 2024 estimate"],
              ]}
            />
          </>
        ),
      },
      {
        q: "Are my settings saved? Will they be lost if I close the browser?",
        a: (
          <>
            <p>
              Yes, settings are saved to your browser's <strong>local storage</strong> when
              you click Save. They persist across browser restarts and are still there when
              you return to the tool.
            </p>
            <p>
              Settings are stored <em>only on your device</em> — they are not sent to any
              server. If you clear your browser data or use a different device, you will need
              to re-enter any customised values.
            </p>
            <p>
              Click <strong>Reset to defaults</strong> in Settings at any time to restore
              the original CEB 2026 values.
            </p>
          </>
        ),
      },
      {
        q: "I changed Settings — will my previous calculation be affected?",
        a: (
          <>
            <p>
              No. A calculation is a snapshot taken at the moment you click <strong>Calculate</strong>.
              Changing Settings afterwards does not update an existing result.
            </p>
            <p>
              To recalculate with new settings: go back to the Dashboard, confirm your kWh
              input, and click Calculate again. The new settings will be applied to the fresh run.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Bill Upload",
    id: "upload",
    items: [
      {
        q: "How does the bill upload work?",
        a: (
          <>
            <p>
              Upload a recent CEB bill as a <strong>PDF, JPEG, or PNG</strong>. The server
              extracts the text (using OCR for images) and looks for the units-consumed figure.
            </p>
            <p>
              If extraction succeeds, the monthly kWh field is pre-filled automatically.
              You can always edit the value manually if the extracted number looks wrong —
              for example, if the bill shows an unusually high or low month.
            </p>
            <p>
              Your bill file is processed on the server and <strong>not stored</strong>.
              It is discarded immediately after the kWh value is extracted.
            </p>
          </>
        ),
      },
      {
        q: "The upload failed or returned a wrong kWh — what should I do?",
        a: (
          <>
            <p>
              OCR accuracy depends on bill image quality. If the upload fails or returns
              an unexpected value:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong>Enter manually</strong> and type the kWh directly from your bill</li>
              <li>Use a higher-resolution scan or photo (avoid glare and shadows)</li>
              <li>PDF uploads are more reliable than photos — use the PDF version of your bill if your CEB online account provides one</li>
            </ul>
          </>
        ),
      },
    ],
  },
]

// ─── Table of contents ────────────────────────────────────────────────────────

function TOC() {
  return (
    <nav className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Jump to section
      </p>
      <ol className="space-y-1.5">
        {FAQ_SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FAQPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-primary">SolarMoris</span>
            <span role="img" aria-label="Mauritius">🇲🇺</span>
          </a>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        </div>
      </header>

      <main className="container max-w-3xl py-10 space-y-2">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Help &amp; FAQ</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            How the calculations work, what every term means, and how to interpret your results.
          </p>
        </div>

        <TOC />

        <div className="pt-4 space-y-2">
          {FAQ_SECTIONS.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </div>

        <div className="pt-8 pb-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Calculations reflect CEB 2026 domestic tariffs and 2026 market benchmarks.
            All figures are estimates — get quotes from certified installers before making investment decisions.
          </p>
          <p className="text-sm">
            Still have a question?{" "}
            <a href="/contact" className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity">
              Contact us
            </a>
          </p>
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
