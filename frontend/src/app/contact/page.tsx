"use client"

import { useState } from "react"
import { Sun, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { trackEvent } from "@/components/google-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const SUBJECTS = [
  "Question about my results",
  "Something looks wrong",
  "Suggestion or feature request",
  "General enquiry",
  "Other",
]

type Status = "idle" | "submitting" | "success" | "error"

export default function ContactPage() {
  const router = useRouter()

  const [name, setName]       = useState("")
  const [email, setEmail]     = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [honeypot, setHoneypot] = useState("") // hidden anti-spam field
  const [status, setStatus]   = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const canSubmit =
    name.trim() &&
    email.trim() &&
    subject.trim() &&
    message.trim() &&
    status !== "submitting"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus("submitting")
    setErrorMsg("")
    try {
      await api.submitContact({ name, email, subject, message, honeypot })
      setStatus("success")
      trackEvent("contact_submitted", { subject })
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong — please try again.")
      trackEvent("contact_error")
    }
  }

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
            Back
          </button>
        </div>
      </header>

      <main className="container max-w-xl py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Contact us</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Have a question about your results, spotted something wrong, or have a suggestion?
            We read every message.
          </p>
        </div>

        {status === "success" ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-lg">Message sent</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Thank you for reaching out. We'll get back to you at{" "}
                <span className="font-medium text-foreground">{email}</span> as soon as we can.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
                Back to assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Honeypot — hidden from humans, bots fill it in */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Jean-Marie Dupont"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
                      "text-sm ring-offset-background focus-visible:outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      !subject && "text-muted-foreground"
                    )}
                  >
                    <option value="" disabled>Select a subject…</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    rows={6}
                    placeholder="Describe your question or feedback in as much detail as you like…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={5000}
                    className={cn(
                      "flex w-full rounded-md border border-input bg-background px-3 py-2",
                      "text-sm ring-offset-background placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "resize-y min-h-[120px]"
                    )}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length} / 5,000
                  </p>
                </div>

                {status === "error" && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={!canSubmit}
                >
                  {status === "submitting" ? (
                    "Sending…"
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <SiteFooter />
      </main>
    </div>
  )
}
