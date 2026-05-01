import { Sun, ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Decorative gradient blob */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-b from-teal-100/60 via-yellow-50/40 to-transparent blur-3xl" />
      </div>

      <div className="container flex flex-col items-center text-center gap-6">
        <Badge variant="solar" className="gap-1.5 py-1">
          <Sun className="h-3.5 w-3.5" />
          CEB 2026 Tariffs · Moris
        </Badge>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl max-w-4xl">
          Make Smarter Decisions with{" "}
          <span className="text-primary">Hybrid Solar</span>{" "}
          Energy Planning
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground">
          Instantly calculate system sizing, payback period, IRR, and CO₂
          savings for any property in Mauritius — using live CEB 2026 tariff
          bands and real solar irradiance data.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <Button size="lg" className="gap-2" asChild>
            <a href="#features">
              Start Free Assessment
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button size="lg" variant="outline" className="gap-2" asChild>
            <a href="#tariffs">
              <BarChart3 className="h-4 w-4" />
              View Sample Report
            </a>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Trusted framework · Open CEB tariff data ·{" "}
          <span className="text-primary font-medium">No account required</span>
        </p>
      </div>
    </section>
  );
}
