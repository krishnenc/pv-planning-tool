import { Sun } from "lucide-react";

export function Footer() {
  return (
    <footer id="about" className="border-t border-border bg-muted/20">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Sun className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm">SolarIQ Mauritius</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Independent solar feasibility tool for Mauritius homeowners and
              businesses. Uses CEB 2026 official tariff schedule.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  CEB Tariff Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Net Metering Info
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Solar Incentives
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  API Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Disclaimer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>© 2026 SolarIQ Mauritius. For informational purposes only.</p>
          <p>Tariff data sourced from CEB Mauritius · Updated January 2026</p>
        </div>
      </div>
    </footer>
  );
}
