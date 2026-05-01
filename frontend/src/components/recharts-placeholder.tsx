"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const placeholderData = [
  { year: "Y1",  cumSavings: 58_000,    systemCost: 450_000 },
  { year: "Y2",  cumSavings: 119_000,   systemCost: 450_000 },
  { year: "Y3",  cumSavings: 183_000,   systemCost: 450_000 },
  { year: "Y4",  cumSavings: 250_000,   systemCost: 450_000 },
  { year: "Y5",  cumSavings: 320_000,   systemCost: 450_000 },
  { year: "Y6",  cumSavings: 393_000,   systemCost: 450_000 },
  { year: "Y7",  cumSavings: 470_000,   systemCost: 450_000 },
  { year: "Y10", cumSavings: 710_000,   systemCost: 450_000 },
  { year: "Y15", cumSavings: 1_180_000, systemCost: 450_000 },
  { year: "Y25", cumSavings: 2_400_000, systemCost: 450_000 },
];

export function RechartsPlaceholder() {
  return (
    <section id="tariffs" className="py-16 bg-muted/20">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Cumulative Savings Projection
          </h2>
          <p className="text-sm text-muted-foreground">
            Sample 5 kWp hybrid system · Port Louis · CEB 2026 tariffs
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-base">25-Year Cash Flow (Rs)</CardTitle>
            <CardDescription>Cumulative savings vs. system cost</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={placeholderData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorSavings"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorCost"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(120, 10%, 88%)"
                />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    `Rs ${(v / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `Rs ${value.toLocaleString()}`,
                    name === "cumSavings" ? "Cumulative Savings" : "System Cost",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="systemCost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#colorCost)"
                  name="systemCost"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="cumSavings"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#colorSavings)"
                  name="cumSavings"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
