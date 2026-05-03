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

export interface AppConfig {
  ceb_band_1_limit_kwh: number
  ceb_band_1_rate: number
  ceb_band_2_limit_kwh: number
  ceb_band_2_rate: number
  ceb_band_3_limit_kwh: number
  ceb_band_3_rate: number
  ceb_band_4_rate: number
  solar_irradiance_kwh_m2_day: number
  system_losses: number
  average_system_cost_rs_wp: number
  battery_cost_rs_kwh: number
  solar_panel_wattage: number
  solar_panel_footprint_m2: number
  grid_offset_factor: number
  project_lifetime_years: number
  discount_rate: number
  inflation_rate: number
  solar_panel_degradation_per_year: number
  maintenance_cost_rs_kw_year: number
  ceb_export_tariff_rs_kwh: number
}

export const CONFIG_KEY = "solariq_config"

export const DEFAULT_CONFIG: AppConfig = {
  ceb_band_1_limit_kwh: 100,
  ceb_band_1_rate: 5.40,
  ceb_band_2_limit_kwh: 300,
  ceb_band_2_rate: 8.10,
  ceb_band_3_limit_kwh: 600,
  ceb_band_3_rate: 11.35,
  ceb_band_4_rate: 16.20,
  solar_irradiance_kwh_m2_day: 5.2,
  system_losses: 0.20,
  average_system_cost_rs_wp: 55.0,
  battery_cost_rs_kwh: 28000.0,
  solar_panel_wattage: 400,
  solar_panel_footprint_m2: 2.0,
  grid_offset_factor: 0.85,
  project_lifetime_years: 25,
  discount_rate: 0.08,
  inflation_rate: 0.045,
  solar_panel_degradation_per_year: 0.005,
  maintenance_cost_rs_kw_year: 1200,
  ceb_export_tariff_rs_kwh: 5.10,
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
  export_credit_rs: number
  payback_years: number
  roi_25yr_pct: number
}

const BASE = "/api/backend"

class ApiClient {
  private getToken(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  }

  private getStoredConfig(): AppConfig | null {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(CONFIG_KEY) : null
      return raw ? (JSON.parse(raw) as AppConfig) : null
    } catch {
      return null
    }
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
    const config_overrides = this.getStoredConfig()
    return this.request<CalculationResponse>("/api/v1/calculate", {
      method: "POST",
      body: JSON.stringify({ ...data, ...(config_overrides ? { config_overrides } : {}) }),
    })
  }

  getConfig() {
    return this.request<AppConfig>("/api/v1/config")
  }

  uploadBill(file: File): Promise<BillParseResponse> {
    const form = new FormData()
    form.append("file", file)
    return this.uploadRequest<BillParseResponse>("/api/v1/bill/upload", form)
  }

  submitContact(data: {
    name: string
    email: string
    subject: string
    message: string
    honeypot?: string
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/v1/contact", {
      method: "POST",
      body: JSON.stringify({ honeypot: "", ...data }),
    })
  }
}

export const api = new ApiClient()
