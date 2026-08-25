import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = mockFetch;

describe("API", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("authApi.login sends correct request", async () => {
    const { authApi } = await import("../api");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ access_token: "test-token", token_type: "bearer" }),
    });

    const result = await authApi.login("test@test.com", "password123");
    expect(result.access_token).toBe("test-token");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@test.com", password: "password123" }),
      })
    );
  });

  it("authApi.register sends correct request", async () => {
    const { authApi } = await import("../api");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 1, email: "test@test.com", created_at: "" }),
    });

    const result = await authApi.register("test@test.com", "password123");
    expect(result.email).toBe("test@test.com");
  });

  it("api.listTransactions sends correct request", async () => {
    const { api } = await import("../api");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const result = await api.listTransactions();
    expect(result).toEqual([]);
  });
});
