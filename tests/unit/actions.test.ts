import { beforeEach, describe, expect, it, vi } from "vitest";

type User = { id: string } | null;

type Profile = {
  role: string | null;
  pending: boolean | null;
  full_name?: string | null;
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

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth-utils", () => ({
  isProfileBlocked: (profile: { pending?: boolean | null } | null) => profile?.pending === true,
}));

const createClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

function setClient(client: ReturnType<typeof buildSupabaseClient>) {
  createClientMock.mockResolvedValue(client);
}

describe("getActionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports legacy single-role call signature", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: false, full_name: "M One" },
      })
    );

    const { getActionContext } = await import("../../src/lib/actions");
    const result = await getActionContext("manager");

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.user.id).toBe("user-1");
      expect(result.profile.role).toBe("manager");
    }
  });

  it("accepts anyOfRoles when current role is included", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "admin", pending: false, full_name: "Admin User" },
      })
    );

    const { getActionContext } = await import("../../src/lib/actions");
    const result = await getActionContext({ anyOfRoles: ["manager", "admin"] });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.profile.role).toBe("admin");
    }
  });

  it("returns access error when role is outside anyOfRoles", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "customer", pending: false, full_name: "C User" },
      })
    );

    const { getActionContext } = await import("../../src/lib/actions");
    const result = await getActionContext({ anyOfRoles: ["manager", "admin"] });

    expect(result).toEqual({ error: "You do not have access to perform this action." });
  });

  it("enforces both requiredRole and anyOfRoles when both are provided", async () => {
    setClient(
      buildSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "manager", pending: false, full_name: "M Two" },
      })
    );

    const { getActionContext } = await import("../../src/lib/actions");

    const passes = await getActionContext({
      requiredRole: "manager",
      anyOfRoles: ["manager", "admin"],
    });
    expect("error" in passes).toBe(false);

    const fails = await getActionContext({
      requiredRole: "manager",
      anyOfRoles: ["admin"],
    });
    expect(fails).toEqual({ error: "You do not have access to perform this action." });
  });
});
