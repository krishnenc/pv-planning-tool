import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
      <p>
        Made with{" "}
        <span role="img" aria-label="love">❤️</span>
        {" "}in Sunny{" "}
        <span role="img" aria-label="sun">☀️</span>
        {" "}Mauritius
        {" "}·{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        {" "}·{" "}
        <Link href="/contact" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Contact
        </Link>
      </p>
    </footer>
  )
}
