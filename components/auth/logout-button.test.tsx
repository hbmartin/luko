import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSupabase } from "@/components/supabase/SupabaseProvider"

import { LogoutButton } from "./LogoutButton"

vi.mock("@/components/supabase/SupabaseProvider", () => ({
  useSupabase: vi.fn(),
}))

const mockUseSupabase = vi.mocked(useSupabase)

describe("LogoutButton", () => {
  beforeEach(() => {
    mockUseSupabase.mockReset()
  })

  it("resets the signing-out state after a successful sign out", async () => {
    const signOut = vi.fn(
      () =>
        new Promise<{ error: Error | undefined }>((resolve) => {
          globalThis.setTimeout(() => {
            resolve({ error: undefined })
          }, 0)
        })
    )

    mockUseSupabase.mockReturnValue({
      supabase: { auth: { signOut } },
      session: undefined,
      setSession: vi.fn(),
    } as unknown as ReturnType<typeof useSupabase>)

    render(<LogoutButton />)

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))

    const pendingButton = screen.getByRole("button", { name: /signing out/i })
    expect(pendingButton).toBeDisabled()

    await waitFor(() => {
      expect(pendingButton).toHaveTextContent("Sign out")
      expect(pendingButton).not.toBeDisabled()
    })
  })
})
