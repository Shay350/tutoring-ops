import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const getActionContextMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/actions", () => ({
  getActionContext: getActionContextMock,
}));

describe("manager invite boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows only customer role", async () => {
    const { isAllowedManagerInviteRole, MANAGER_INVITE_ROLE } = await import(
      "../../src/app/manager/invites/actions"
    );

    expect(MANAGER_INVITE_ROLE).toBe("customer");
    expect(isAllowedManagerInviteRole("customer")).toBe(true);
    expect(isAllowedManagerInviteRole("manager")).toBe(false);
    expect(isAllowedManagerInviteRole("tutor")).toBe(false);
  });

  it("does not insert when tampered role is submitted", async () => {
    const insertMock = vi.fn();
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

    getActionContextMock.mockResolvedValue({
      user: { id: "manager-1" },
      supabase: { from: fromMock },
    });

    const { createManagerInvite } = await import("../../src/app/manager/invites/actions");

    const formData = new FormData();
    formData.set("email", "parent@example.com");
    formData.set("role", "admin");

    await createManagerInvite(formData);

    expect(insertMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("creates invite when role is customer", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

    getActionContextMock.mockResolvedValue({
      user: { id: "manager-1" },
      supabase: { from: fromMock },
    });

    const { createManagerInvite } = await import("../../src/app/manager/invites/actions");

    const formData = new FormData();
    formData.set("email", "PARENT@EXAMPLE.COM");
    formData.set("role", "customer");

    await createManagerInvite(formData);

    expect(insertMock).toHaveBeenCalledWith({
      email: "parent@example.com",
      role: "customer",
      created_by: "manager-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/manager/invites");
  });
});
