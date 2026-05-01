"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { api, TokenResponse } from "@/lib/api"

interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, fullName: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function storeTokens(tokens: TokenResponse) {
  localStorage.setItem("access_token", tokens.access_token)
  localStorage.setItem("refresh_token", tokens.refresh_token)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ isLoading: true, isAuthenticated: false })

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    setState({ isLoading: false, isAuthenticated: !!token })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.login({ email, password })
    storeTokens(tokens)
    setState({ isLoading: false, isAuthenticated: true })
  }, [])

  const register = useCallback(async (email: string, fullName: string, password: string) => {
    const tokens = await api.register({ email, full_name: fullName, password })
    storeTokens(tokens)
    setState({ isLoading: false, isAuthenticated: true })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setState({ isLoading: false, isAuthenticated: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
