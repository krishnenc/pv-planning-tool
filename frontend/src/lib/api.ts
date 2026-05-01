export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface ForgotPasswordResponse {
  message: string
  reset_token: string | null
}

export interface BillParseResponse {
  monthly_kwh: number
  estimated: boolean
}

export interface CalculationRequest {
  monthly_kwh: number
  roof_area_m2?: number | null
  include_battery: boolean
}

export interface RoofFeasibility {
  required_m2: number
  available_m2: number | null
  status: "ok" | "limited" | "unknown"
}

export interface CalculationResponse {
  monthly_kwh: number
  monthly_bill_rs: number
  pv_kw: number
  panel_count: number
  battery_kwh: number | null
  roof: RoofFeasibility
  system_cost_rs: number
  battery_cost_rs: number
  total_cost_rs: number
  monthly_savings_rs: number
  annual_savings_rs: number
  payback_years: number
  roi_25yr_pct: number
}

const BASE = "/api/backend"

class ApiClient {
  private getToken(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  }

  private async uploadRequest<T>(path: string, formData: FormData): Promise<T> {
    const token = this.getToken()
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || "Upload failed")
    }
    return res.json() as Promise<T>
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    }
    const res = await fetch(`${BASE}${path}`, { ...options, headers })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || "Request failed")
    }
    return res.json() as Promise<T>
  }

  register(data: { email: string; full_name: string; password: string }) {
    return this.request<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  login(data: { email: string; password: string }) {
    return this.request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  forgotPassword(email: string) {
    return this.request<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  }

  resetPassword(token: string, new_password: string) {
    return this.request<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    })
  }

  calculate(data: CalculationRequest) {
    return this.request<CalculationResponse>("/api/v1/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  uploadBill(file: File): Promise<BillParseResponse> {
    const form = new FormData()
    form.append("file", file)
    return this.uploadRequest<BillParseResponse>("/api/v1/bill/upload", form)
  }
}

export const api = new ApiClient()
