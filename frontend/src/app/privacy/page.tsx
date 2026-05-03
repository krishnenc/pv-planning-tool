import Link from "next/link"
import { Sun, ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy and disclaimer for SolarMoris.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-primary">SolarMoris</span>
            <span role="img" aria-label="Mauritius">🇲🇺</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="container max-w-2xl py-12">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Privacy Policy &amp; Disclaimer</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground">

          <section>
            <h2 className="text-base font-semibold mb-2">1. About this tool</h2>
            <p>
              SolarMoris is a free, publicly accessible solar feasibility calculator for properties in Mauritius.
              It uses CEB 2026 tariff bands and publicly available solar irradiance data to provide indicative
              estimates of system sizing, payback period, and financial return. It is provided <strong>as a
              convenience and for informational purposes only</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">2. No warranty — tool provided as-is</h2>
            <p>
              This tool is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>,
              without any warranty of any kind, express or implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, or non-infringement. The outputs are estimates
              based on simplified models and publicly available data. Actual system performance, costs, savings,
              and payback periods will vary depending on site-specific factors, equipment specifications,
              installer pricing, CEB policy changes, weather, shading, and many other variables.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">3. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, the authors and operators of SolarMoris
              accept <strong>no liability whatsoever</strong> for any loss, damage, cost, or expense — whether
              direct, indirect, incidental, special, consequential, or otherwise — arising from or in connection
              with your use of, or reliance on, the outputs of this tool. This includes, without limitation,
              any financial decisions made on the basis of estimates produced by this calculator.
            </p>
            <p className="mt-2">
              You should always obtain independent professional advice from a qualified solar installer and
              financial adviser before making any investment decision.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">4. Data we collect</h2>
            <p>
              <strong>Calculation inputs</strong> (monthly kWh, roof area, appliance list) are processed
              entirely in your browser and on our server to compute results. They are <strong>not stored or
              linked to you</strong>.
            </p>
            <p className="mt-2">
              <strong>Settings</strong> you adjust (tariff rates, financial assumptions) are saved in your
              browser&apos;s <code>localStorage</code> only — they never leave your device.
            </p>
            <p className="mt-2">
              <strong>Bill uploads</strong> (PDF or image files) are sent to our server for OCR processing to
              extract your kWh figure. The file is processed in memory and is <strong>not retained</strong> after
              the response is returned.
            </p>
            <p className="mt-2">
              <strong>Contact form submissions</strong> (name, email, subject, message) are stored in our
              database so we can respond to your enquiry. We do not share this information with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">5. Analytics</h2>
            <p>
              We use Google Analytics 4 to understand how the tool is used (page views, feature usage).
              This data is aggregated and anonymous. Google&apos;s privacy policy applies:{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-primary"
              >
                policies.google.com/privacy
              </a>.
              Analytics is a no-op if the measurement ID is not configured.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">6. Cookies</h2>
            <p>
              We do not set any first-party cookies. Google Analytics may set cookies in accordance with its
              own policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">7. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The &quot;Last updated&quot; date at the top of this
              page reflects when changes were last made. Continued use of the tool after any changes constitutes
              acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">8. Contact</h2>
            <p>
              Questions about this policy? Use the{" "}
              <Link href="/contact" className="underline underline-offset-2 hover:text-primary">
                contact form
              </Link>
              .
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-border/60 text-center text-xs text-muted-foreground">
          <p>
            Made with{" "}
            <span role="img" aria-label="love">❤️</span>
            {" "}in Sunny{" "}
            <span role="img" aria-label="sun">☀️</span>
            {" "}Mauritius
          </p>
        </div>
      </main>
    </div>
  )
}
