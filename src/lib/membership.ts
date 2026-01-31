export type MembershipAdjustmentInput = {
  deltaHours: number;
  reason: string;
};

export function validateMembershipAdjustment(
  input: MembershipAdjustmentInput
): string | null {
  if (!Number.isFinite(input.deltaHours) || input.deltaHours === 0) {
    return "Adjustment hours must be a non-zero number.";
  }

  if (!input.reason.trim()) {
    return "Adjustment reason is required.";
  }

  return null;
}

export type BillingDecision = {
  shouldBill: boolean;
  nextHoursRemaining: number;
  error?: string;
};

export function computeBillingDecision({
  sessionStatus,
  billedToMembership,
  hoursRemaining,
  billAmount = 1,
}: {
  sessionStatus: string | null;
  billedToMembership: boolean | null;
  hoursRemaining: number | null;
  billAmount?: number;
}): BillingDecision {
  const safeHours = Number.isFinite(hoursRemaining ?? NaN)
    ? (hoursRemaining as number)
    : 0;

  if (sessionStatus !== "completed") {
    return {
      shouldBill: false,
      nextHoursRemaining: safeHours,
      error: "Session must be completed before billing.",
    };
  }

  if (billedToMembership) {
    return {
      shouldBill: false,
      nextHoursRemaining: safeHours,
    };
  }

  if (!Number.isFinite(hoursRemaining ?? NaN)) {
    return {
      shouldBill: false,
      nextHoursRemaining: 0,
      error: "Membership hours remaining are unavailable.",
    };
  }

  if (safeHours < billAmount) {
    return {
      shouldBill: false,
      nextHoursRemaining: safeHours,
      error: "Not enough hours remaining to bill this session.",
    };
  }

  return {
    shouldBill: true,
    nextHoursRemaining: safeHours - billAmount,
  };
}
