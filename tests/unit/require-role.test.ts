import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireRole } from "../../src/lib/auth";
import type { Role } from "../../src/lib/roles";
import { createClient } from "../../src/lib/supabase/server";
import { redirect } from "next/navigation";

type User = { id: string } | null;

type Profile = {
  role: string | null;
  pending: boolean | null;
} | null;

function buildSupabaseClient({
  user,
  userError,
  profile,
  profileError,
}: {
  user: User;
  userError?: Error | null;
  profile: Profile;
  profileError?: Error | null;
}) {
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);
  profileQuery.maybeSingle.mockResolvedValue({
    data: profile,
    error: profileError ?? null,
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: userError ?? null,
      }),
    },
    from: vi.fn().mockReturnValue(profileQuery),
  };
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    const error = new Error("REDIRECT");
    (error as Error & { path?: string }).path = path;
    throw error;
  }),
}));

vi.mock("../../src/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const redirectMock = redirect as unknown as ReturnType<typeof vi.fn>;
const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;

async function expectRedirect(promise: Promise<void>, path: string) {
  await expect(promise).rejects.toThrowError("REDIRECT");
  expect(redirectMock).toHaveBeenCalledWith(path);
}

async function expectNoRedirect(promise: Promise<void>) {
  await expect(promise).resolves.toBeUndefined();
  expect(redirectMock).not.toHaveBeenCalled();
}

function setClient(client: ReturnType<typeof buildSupabaseClient>) {
  createClientMock.mockResolvedValue(client);
}

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when there is no user", async () => {
    setClient(
      buildSupabaseClient({
        user: null,
        profile: null,
      })
    );

    await expectRedirect(requireRole("manager"), "/login");
  });

  it("redirects to /login when auth returns an error", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        userError: new Error("auth failure"),
        profile: null,
      })
    );

    await expectRedirect(requireRole("manager"), "/login");
  });

  it("redirects to /login when profile lookup fails", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: null,
        profileError: new Error("profile missing"),
      })
    );

    await expectRedirect(requireRole("manager"), "/login");
  });

  it("redirects to /no-access when profile is pending", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: true },
      })
    );

    await expectRedirect(requireRole("manager"), "/no-access");
  });

  it("redirects to the role home when role mismatches", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "customer", pending: false },
      })
    );

    await expectRedirect(requireRole("manager"), "/customer");
  });

  it("does not redirect when role matches", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: false },
      })
    );

    await expectNoRedirect(requireRole("manager"));
  });

  it("redirects to /login for unknown role on profile", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "unknown", pending: false },
      })
    );

    await expectRedirect(requireRole("tutor" as Role), "/login");
  });
});
