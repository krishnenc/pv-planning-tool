import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── Hoisted mocks (vi.mock factory is hoisted before variable declarations) ──

const { mockPush, mockCalculate, mockUploadBill } = vi.hoisted(() => ({
  mockPush:       vi.fn(),
  mockCalculate:  vi.fn(),
  mockUploadBill: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}))

vi.mock("@/lib/api", () => ({
  api: { calculate: mockCalculate, uploadBill: mockUploadBill },
}))

import DashboardPage from "@/app/dashboard/page"

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockCalculate.mockReset()
  mockUploadBill.mockReset()
  mockPush.mockReset()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Form validation ───────────────────────────────────────────────────────────

describe("DashboardPage — form validation", () => {
  it("Calculate button is disabled when the kWh field is empty", () => {
    render(<DashboardPage />)
    const btn = screen.getByRole("button", { name: /calculate potential/i })
    expect(btn).toBeDisabled()
  })

  it("Calculate button becomes enabled after entering a kWh value", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    expect(screen.getByRole("button", { name: /calculate potential/i })).toBeEnabled()
  })

  it("Calculate button is disabled again when the field is cleared", async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    const input = screen.getByLabelText(/units consumed/i)
    await user.type(input, "350")
    await user.clear(input)
    expect(screen.getByRole("button", { name: /calculate potential/i })).toBeDisabled()
  })

  it("passes include_battery=false by default", async () => {
    mockCalculate.mockResolvedValue({ pv_kw: 2.8 })
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    await waitFor(() => expect(mockCalculate).toHaveBeenCalled())
    expect(mockCalculate.mock.calls[0][0].include_battery).toBe(false)
  })

  it("passes include_battery=true when the battery toggle is on", async () => {
    mockCalculate.mockResolvedValue({ pv_kw: 2.8 })
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.click(screen.getByRole("switch", { name: /include battery storage/i }))
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    await waitFor(() => expect(mockCalculate).toHaveBeenCalled())
    expect(mockCalculate.mock.calls[0][0].include_battery).toBe(true)
  })

  it("passes roof_area_m2 when the roof field is filled", async () => {
    mockCalculate.mockResolvedValue({ pv_kw: 2.8 })
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.type(screen.getByLabelText(/usable roof area/i), "40")
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    await waitFor(() => expect(mockCalculate).toHaveBeenCalled())
    expect(mockCalculate.mock.calls[0][0].roof_area_m2).toBe(40)
  })

  it("passes roof_area_m2=null when the roof field is empty", async () => {
    mockCalculate.mockResolvedValue({ pv_kw: 2.8 })
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    await waitFor(() => expect(mockCalculate).toHaveBeenCalled())
    expect(mockCalculate.mock.calls[0][0].roof_area_m2).toBeNull()
  })
})

// ── API error handling ────────────────────────────────────────────────────────

describe("DashboardPage — API error handling", () => {
  it("shows a calculation error message when api.calculate rejects", async () => {
    mockCalculate.mockRejectedValue(new Error("Backend unavailable"))
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    expect(await screen.findByText(/Backend unavailable/i)).toBeInTheDocument()
  })

  it("does not navigate to /results when the API call fails", async () => {
    mockCalculate.mockRejectedValue(new Error("500"))
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    await waitFor(() => expect(screen.getByText(/500/)).toBeInTheDocument())
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("navigates to /results and stores results on success", async () => {
    const fakeResults = { monthly_kwh: 350, pv_kw: 2.8 }
    mockCalculate.mockResolvedValue(fakeResults)
    const user = userEvent.setup()
    render(<DashboardPage />)
    await user.type(screen.getByLabelText(/units consumed/i), "350")
    await user.click(screen.getByRole("button", { name: /calculate potential/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/results"))
    expect(JSON.parse(localStorage.getItem("solariq_results") ?? "null")).toEqual(fakeResults)
  })

  it("shows upload error and keeps field editable when bill upload fails", async () => {
    mockUploadBill.mockRejectedValue(new Error("Could not parse bill"))
    render(<DashboardPage />)

    const file = new File(["data"], "bill.pdf", { type: "application/pdf" })
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await userEvent.upload(fileInput, file)

    expect(await screen.findByText(/Could not parse bill/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/units consumed/i)).not.toBeDisabled()
  })

  it("auto-fills the kWh field when bill upload succeeds", async () => {
    mockUploadBill.mockResolvedValue({ monthly_kwh: 312, estimated: false })
    render(<DashboardPage />)

    const file = new File(["data"], "bill.pdf", { type: "application/pdf" })
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await userEvent.upload(fileInput, file)

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>(/units consumed/i).value).toBe("312"),
    )
    expect(screen.getByText(/312 kWh/i)).toBeInTheDocument()
  })
})
