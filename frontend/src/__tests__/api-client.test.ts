import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { api } from "@/lib/api"

// ── helpers ───────────────────────────────────────────────────────────────────

function mockFetch(ok: boolean, body: unknown, statusText = "Error") {
  return vi.fn().mockResolvedValue({
    ok,
    statusText,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── calculate ─────────────────────────────────────────────────────────────────

describe("api.calculate", () => {
  it("resolves with the parsed response on success", async () => {
    const payload = { monthly_kwh: 350, pv_kw: 2.8 }
    vi.stubGlobal("fetch", mockFetch(true, payload))

    const result = await api.calculate({ monthly_kwh: 350, include_battery: false })
    expect(result).toEqual(payload)
  })

  it("sends a POST to /api/backend/api/v1/calculate", async () => {
    const fetchMock = mockFetch(true, {})
    vi.stubGlobal("fetch", fetchMock)

    await api.calculate({ monthly_kwh: 350, include_battery: false })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/backend/api/v1/calculate")
    expect(opts.method).toBe("POST")
  })

  it("sends the correct JSON body", async () => {
    const fetchMock = mockFetch(true, {})
    vi.stubGlobal("fetch", fetchMock)

    await api.calculate({
      monthly_kwh: 400,
      roof_area_m2: 30,
      include_battery: true,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ monthly_kwh: 400, roof_area_m2: 30, include_battery: true })
  })

  it("includes Authorization header when a token is stored", async () => {
    localStorage.setItem("access_token", "tok-abc")
    const fetchMock = mockFetch(true, {})
    vi.stubGlobal("fetch", fetchMock)

    await api.calculate({ monthly_kwh: 350, include_battery: false })

    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers.Authorization).toBe("Bearer tok-abc")
  })

  it("throws the error detail from the response on non-OK status", async () => {
    vi.stubGlobal("fetch", mockFetch(false, { detail: "monthly_kwh must be > 0" }))

    await expect(
      api.calculate({ monthly_kwh: 0, include_battery: false }),
    ).rejects.toThrow("monthly_kwh must be > 0")
  })

  it("falls back to statusText when the error body has no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      }),
    )

    await expect(
      api.calculate({ monthly_kwh: 350, include_battery: false }),
    ).rejects.toThrow("Internal Server Error")
  })
})

// ── uploadBill ────────────────────────────────────────────────────────────────

describe("api.uploadBill", () => {
  it("resolves with monthly_kwh and estimated on success", async () => {
    vi.stubGlobal("fetch", mockFetch(true, { monthly_kwh: 312, estimated: false }))

    const file = new File(["data"], "bill.pdf", { type: "application/pdf" })
    const result = await api.uploadBill(file)
    expect(result.monthly_kwh).toBe(312)
    expect(result.estimated).toBe(false)
  })

  it("sends a POST to /api/backend/api/v1/bill/upload", async () => {
    const fetchMock = mockFetch(true, { monthly_kwh: 312, estimated: false })
    vi.stubGlobal("fetch", fetchMock)

    const file = new File(["data"], "bill.pdf", { type: "application/pdf" })
    await api.uploadBill(file)

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/backend/api/v1/bill/upload")
    expect(opts.method).toBe("POST")
  })

  it("sends the file as FormData (no manual Content-Type header)", async () => {
    const fetchMock = mockFetch(true, { monthly_kwh: 312, estimated: false })
    vi.stubGlobal("fetch", fetchMock)

    const file = new File(["data"], "bill.pdf", { type: "application/pdf" })
    await api.uploadBill(file)

    const opts = fetchMock.mock.calls[0][1]
    expect(opts.body).toBeInstanceOf(FormData)
    // Content-Type must NOT be set manually — browser sets the multipart boundary
    expect(opts.headers?.["Content-Type"]).toBeUndefined()
  })

  it("throws the error detail on non-OK response", async () => {
    vi.stubGlobal("fetch", mockFetch(false, { detail: "Unsupported file type" }))

    const file = new File(["data"], "bill.docx", { type: "application/msword" })
    await expect(api.uploadBill(file)).rejects.toThrow("Unsupported file type")
  })
})
