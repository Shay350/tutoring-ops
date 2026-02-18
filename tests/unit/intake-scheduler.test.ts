import { describe, expect, it } from "vitest";

import { buildSchedulerSlots, toTimeInput } from "../../src/lib/intake-scheduler";

describe("intake scheduler slots", () => {
  it("builds selectable slots when within open windows and marked available", () => {
    const slotId = `2026-02-16|${toTimeInput(9 * 60)}|${toTimeInput(10 * 60)}`;
    const slots = buildSchedulerSlots({
      weekDates: ["2026-02-16"],
      gridStartMinutes: 9 * 60,
      gridEndMinutes: 11 * 60,
      openWindowByDate: {
        "2026-02-16": { openMinutes: 9 * 60, closeMinutes: 17 * 60 },
      },
      busyRangesByDate: {
        "2026-02-16": [],
      },
      capacityPerSlot: 2,
      availableSlotIdSet: new Set([slotId]),
    });

    const firstSlot = slots[0];
    expect(firstSlot.slotId).toBe(slotId);
    expect(firstSlot.openCount).toBe(2);
    expect(firstSlot.isSelectable).toBe(true);
  });

  it("marks closed-day slots as disabled", () => {
    const slots = buildSchedulerSlots({
      weekDates: ["2026-02-16"],
      gridStartMinutes: 9 * 60,
      gridEndMinutes: 10 * 60,
      openWindowByDate: {
        "2026-02-16": { openMinutes: null, closeMinutes: null },
      },
      busyRangesByDate: {
        "2026-02-16": [],
      },
      capacityPerSlot: 2,
      availableSlotIdSet: new Set(),
    });

    expect(slots[0].isOpenWindow).toBe(false);
    expect(slots[0].openCount).toBe(0);
    expect(slots[0].isSelectable).toBe(false);
  });

  it("prevents selection for full slots", () => {
    const slotId = `2026-02-16|${toTimeInput(9 * 60)}|${toTimeInput(10 * 60)}`;
    const slots = buildSchedulerSlots({
      weekDates: ["2026-02-16"],
      gridStartMinutes: 9 * 60,
      gridEndMinutes: 10 * 60,
      openWindowByDate: {
        "2026-02-16": { openMinutes: 9 * 60, closeMinutes: 17 * 60 },
      },
      busyRangesByDate: {
        "2026-02-16": [{ startMinutes: 9 * 60, endMinutes: 10 * 60 }],
      },
      capacityPerSlot: 1,
      availableSlotIdSet: new Set([slotId]),
    });

    expect(slots[0].openCount).toBe(0);
    expect(slots[0].isSelectable).toBe(false);
  });

  it("allows up to four concurrent students per tutor-hour", () => {
    const slotId = `2026-02-16|${toTimeInput(9 * 60)}|${toTimeInput(10 * 60)}`;
    const slots = buildSchedulerSlots({
      weekDates: ["2026-02-16"],
      gridStartMinutes: 9 * 60,
      gridEndMinutes: 10 * 60,
      openWindowByDate: {
        "2026-02-16": { openMinutes: 9 * 60, closeMinutes: 17 * 60 },
      },
      busyRangesByDate: {
        "2026-02-16": [
          { startMinutes: 9 * 60, endMinutes: 10 * 60 },
          { startMinutes: 9 * 60, endMinutes: 10 * 60 },
          { startMinutes: 9 * 60, endMinutes: 10 * 60 },
        ],
      },
      capacityPerSlot: 4,
      availableSlotIdSet: new Set([slotId]),
    });

    expect(slots[0].openCount).toBe(1);
    expect(slots[0].isSelectable).toBe(true);
  });
});
