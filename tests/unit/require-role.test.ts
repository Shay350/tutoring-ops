import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth-utils", () => ({
  isProfileBlocked: (profile: { pending?: boolean | null } | null) =>
    profile?.pending === true,
}));

vi.mock("@/lib/roles", () => ({
  resolveRolePath: (role?: string | null) => {
    switch (role) {
      case "admin":
        return "/admin";
      case "manager":
        return "/manager";
      case "tutor":
        return "/tutor";
      case "customer":
        return "/customer";
      default:
        return "/login";
    }
  },
}));

const createClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

const redirectMock = redirect as unknown as ReturnType<typeof vi.fn>;

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

    const { requireRole } = await import("../../src/lib/auth");
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

    const { requireRole } = await import("../../src/lib/auth");
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

    const { requireRole } = await import("../../src/lib/auth");
    await expectRedirect(requireRole("manager"), "/login");
  });

  it("redirects to /no-access when profile is pending", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: true },
      })
    );

    const { requireRole } = await import("../../src/lib/auth");
    await expectRedirect(requireRole("manager"), "/no-access");
  });

  it("redirects to the role home when role mismatches", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "customer", pending: false },
      })
    );

    const { requireRole } = await import("../../src/lib/auth");
    await expectRedirect(requireRole("manager"), "/customer");
  });

  it("does not redirect when role matches", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: false },
      })
    );

    const { requireRole } = await import("../../src/lib/auth");
    await expectNoRedirect(requireRole("manager"));
  });

  it("allows admin through admin guard", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-admin" },
        profile: { role: "admin", pending: false },
      })
    );

    const { requireRole } = await import("../../src/lib/auth");
    await expectNoRedirect(requireRole("admin"));
  });

  it("redirects to /login for unknown role on profile", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "unknown", pending: false },
      })
    );

    const { requireRole } = await import("../../src/lib/auth");
    await expectRedirect(requireRole("tutor"), "/login");
  });
});

describe("requireNonCustomer", () => {
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

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectRedirect(requireNonCustomer(), "/login");
  });

  it("redirects to /login when auth returns an error", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        userError: new Error("auth failure"),
        profile: null,
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectRedirect(requireNonCustomer(), "/login");
  });

  it("redirects to /login when profile lookup fails", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: null,
        profileError: new Error("profile missing"),
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectRedirect(requireNonCustomer(), "/login");
  });

  it("redirects to /no-access when profile is pending", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "tutor", pending: true },
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectRedirect(requireNonCustomer(), "/no-access");
  });

  it("redirects customers to /customer", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "customer", pending: false },
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectRedirect(requireNonCustomer(), "/customer");
  });

  it("does not redirect for tutors", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "tutor", pending: false },
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectNoRedirect(requireNonCustomer());
  });

  it("does not redirect for managers", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: false },
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectNoRedirect(requireNonCustomer());
  });

  it("does not redirect for admins", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-admin" },
        profile: { role: "admin", pending: false },
      })
    );

    const { requireNonCustomer } = await import("../../src/lib/auth");
    await expectNoRedirect(requireNonCustomer());
  });
});
