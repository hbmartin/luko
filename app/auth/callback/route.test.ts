import { beforeEach, describe, expect, it, vi } from "vitest"

const { createMutableServerSupabaseClientMock } = vi.hoisted(() => ({
  createMutableServerSupabaseClientMock: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createMutableServerSupabaseClient: createMutableServerSupabaseClientMock,
}))

import { POST } from "./route"

const validSession = {
  access_token: "access-token",
  refresh_token: "refresh-token",
}

const createRequest = (body: unknown) =>
  new Request("http://localhost/auth/callback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

describe("auth callback POST", () => {
  beforeEach(() => {
    createMutableServerSupabaseClientMock.mockReset()
  })

  it("checks signOut result when clearing a failed setSession", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: new Error("sign out failed") })

    createMutableServerSupabaseClientMock.mockResolvedValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({ error: new Error("invalid session") }),
        signOut,
        getUser: vi.fn(),
      },
    })

    const response = await POST(createRequest({ event: "SIGNED_IN", session: validSession }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Unable to clear invalid session",
    })
  })

  it("checks signOut result when clearing a missing user", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: new Error("sign out failed") })

    createMutableServerSupabaseClientMock.mockResolvedValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({ error: undefined }),
        signOut,
        getUser: vi.fn().mockResolvedValue({
          data: { user: undefined },
          error: new Error("missing user"),
        }),
      },
    })

    const response = await POST(createRequest({ event: "TOKEN_REFRESHED", session: validSession }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Unable to clear invalid session",
    })
  })
})
