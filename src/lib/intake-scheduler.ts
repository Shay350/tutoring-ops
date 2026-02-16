export type SchedulerSlot = {
  slotId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  openCount: number;
  isSelectable: boolean;
  isOpenWindow: boolean;
};

export function toTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function buildSchedulerSlots(params: {
  weekDates: string[];
  gridStartMinutes: number;
  gridEndMinutes: number;
  openWindowByDate: Record<string, { openMinutes: number | null; closeMinutes: number | null }>;
  busyRangesByDate: Record<string, Array<{ startMinutes: number; endMinutes: number }>>;
  capacityPerSlot: number;
  availableSlotIdSet: Set<string>;
}): SchedulerSlot[] {
  const slots: SchedulerSlot[] = [];
  const step = 60;

  for (const dateKey of params.weekDates) {
    const openWindow = params.openWindowByDate[dateKey] ?? {
      openMinutes: null,
      closeMinutes: null,
    };
    const openMinutes = openWindow.openMinutes;
    const closeMinutes = openWindow.closeMinutes;

    for (
      let start = params.gridStartMinutes;
      start + step <= params.gridEndMinutes;
      start += step
    ) {
      const end = start + step;
      const slotId = `${dateKey}|${toTimeInput(start)}|${toTimeInput(end)}`;
      const isOpenWindow =
        openMinutes !== null &&
        closeMinutes !== null &&
        start >= openMinutes &&
        end <= closeMinutes;
      const activeCount = (params.busyRangesByDate[dateKey] ?? []).filter(
        (range) => start < range.endMinutes && end > range.startMinutes
      ).length;
      const openCount = isOpenWindow
        ? Math.max(params.capacityPerSlot - activeCount, 0)
        : 0;

      slots.push({
        slotId,
        dateKey,
        startTime: toTimeInput(start),
        endTime: toTimeInput(end),
        startMinutes: start,
        openCount,
        isOpenWindow,
        isSelectable: params.availableSlotIdSet.has(slotId) && openCount > 0,
      });
    }
  }

  return slots;
}
