import { TrendingUp, Zap, Leaf, Sun } from "lucide-react";

const stats = [
  {
    icon: Sun,
    label: "Avg. Payback",
    value: "6–8 yrs",
    sub: "typical Mauritius household",
  },
  {
    icon: TrendingUp,
    label: "IRR",
    value: "12–18%",
    sub: "over 25-year project life",
  },
  {
    icon: Zap,
    label: "Grid Savings",
    value: "60–85%",
    sub: "reduction in CEB bill",
  },
  {
    icon: Leaf,
    label: "CO₂ Avoided",
    value: "3–5 t/yr",
    sub: "per 5 kWp system",
  },
];

export function StatsBar() {
  return (
    <section id="how-it-works" className="border-y border-border bg-muted/30">
      <div className="container py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div
            key={label}
            className="flex flex-col items-center text-center gap-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-1">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
