import { describe, expect, it, vi } from "vitest";

import { getDefaultLocationId } from "../../src/lib/locations";

describe("getDefaultLocationId", () => {
  it("returns the default location id from RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "loc_123",
      error: null,
    });

    const supabase = { rpc } as unknown as Parameters<typeof getDefaultLocationId>[0];

    await expect(getDefaultLocationId(supabase)).resolves.toBe("loc_123");
    expect(rpc).toHaveBeenCalledWith("default_location_id");
  });

  it("throws a friendly error when RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "db error" },
    });

    const supabase = { rpc } as unknown as Parameters<typeof getDefaultLocationId>[0];

    await expect(getDefaultLocationId(supabase)).rejects.toThrow(
      "Unable to load default location."
    );
  });

  it("throws when no default location exists", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const supabase = { rpc } as unknown as Parameters<typeof getDefaultLocationId>[0];

    await expect(getDefaultLocationId(supabase)).rejects.toThrow(
      "Default location missing. Apply the VS10 DB migration."
    );
  });
});
