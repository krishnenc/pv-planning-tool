"use client"

import { useState } from "react"
import { Mail, Sun, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const result = await api.forgotPassword(email)
      setDevToken(result.reset_token)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">
              <span className="text-primary">Solar</span>
              <span className="text-foreground">IQ</span>
            </span>
          </a>
        </div>

        <Card className="shadow-lg">
          {submitted ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl text-center">Check your email</CardTitle>
                <CardDescription className="text-center">
                  {`If ${email} exists in our system, a reset link has been sent.`}
                </CardDescription>
              </CardHeader>
              {devToken && (
                <CardContent>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-800">
                      Development mode — token (would be emailed in production):
                    </p>
                    <code className="block break-all text-xs bg-white border border-amber-200 rounded px-2 py-1 text-amber-900 select-all">
                      {devToken}
                    </code>
                  </div>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    <a href="/login" className="text-primary hover:underline font-medium">
                      Back to sign in
                    </a>
                  </p>
                </CardContent>
              )}
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl text-center">Forgot password?</CardTitle>
                <CardDescription className="text-center">
                  Enter your email and we&apos;ll send you a reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md transition-all duration-200">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending…" : "Send Reset Link"}
                  </Button>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </a>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
