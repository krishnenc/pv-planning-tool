import { Sun, Battery, Zap, Leaf, TrendingUp, BarChart3 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const features = [
  {
    icon: Sun,
    title: "Solar System Sizing",
    description:
      "Automatically sizes your PV array based on roof area, local irradiance (5.2 kWh/m²/day), and your monthly CEB consumption.",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Battery,
    title: "Battery Storage Planning",
    description:
      "Optimize battery capacity for overnight self-consumption and grid outage resilience, with real Rs/kWh cost modelling.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: Zap,
    title: "CEB Tariff Engine",
    description:
      "Apply 2026 progressive tariff bands (Rs 5.40–16.20/kWh) and net-metering export rates to calculate exact bill reduction.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: TrendingUp,
    title: "ROI & Financial Analysis",
    description:
      "NPV, IRR, and simple payback calculated with Mauritius CPI (4.5%) inflation and your chosen discount rate.",
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
  {
    icon: Leaf,
    title: "Environmental Impact",
    description:
      "Quantify annual CO₂ avoided, equivalent trees planted, and lifetime emissions reduction for your installation.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: BarChart3,
    title: "Interactive Reports",
    description:
      "Visual charts of annual cash flows, cumulative savings, and energy balance — exportable to PDF for CEB applications.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

export function FeatureCards() {
  return (
    <section id="features" className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Everything You Need to Go Solar
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Purpose-built for the Mauritius energy market, using official CEB
            data and real installation cost benchmarks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color, bg }) => (
            <Card
              key={title}
              className="group hover:shadow-md transition-shadow duration-200 border-border/60"
            >
              <CardHeader className="pb-3">
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${bg} mb-3`}
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <CardTitle className="text-base font-semibold">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
