import { parseDateKey, parseTimeToMinutes } from "./schedule";

export type OperatingHoursRow = {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

export const weekdayLabels: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export function defaultOperatingHours(): OperatingHoursRow[] {
  return [
    { weekday: 0, is_closed: true, open_time: null, close_time: null },
    { weekday: 1, is_closed: false, open_time: "09:00", close_time: "17:00" },
    { weekday: 2, is_closed: false, open_time: "09:00", close_time: "17:00" },
    { weekday: 3, is_closed: false, open_time: "09:00", close_time: "17:00" },
    { weekday: 4, is_closed: false, open_time: "09:00", close_time: "17:00" },
    { weekday: 5, is_closed: false, open_time: "09:00", close_time: "17:00" },
    { weekday: 6, is_closed: true, open_time: null, close_time: null },
  ];
}

export function normalizeOperatingHours(
  rows: OperatingHoursRow[] | null | undefined
): OperatingHoursRow[] {
  const defaults = defaultOperatingHours();
  const map = new Map<number, OperatingHoursRow>(
    (rows ?? [])
      .filter((row) => Number.isFinite(row.weekday))
      .map((row) => [row.weekday, row])
  );

  return defaults.map((fallback) => map.get(fallback.weekday) ?? fallback);
}

export function operatingHoursWindowMinutes(row: OperatingHoursRow): {
  openMinutes: number | null;
  closeMinutes: number | null;
} {
  if (row.is_closed) {
    return { openMinutes: null, closeMinutes: null };
  }

  const openMinutes = row.open_time ? parseTimeToMinutes(row.open_time) : null;
  const closeMinutes = row.close_time ? parseTimeToMinutes(row.close_time) : null;

  if (openMinutes === null || closeMinutes === null) {
    return { openMinutes: null, closeMinutes: null };
  }

  if (closeMinutes <= openMinutes) {
    return { openMinutes: null, closeMinutes: null };
  }

  return { openMinutes, closeMinutes };
}

export function mapOperatingHoursByWeekday(
  rows: OperatingHoursRow[]
): Record<number, OperatingHoursRow> {
  return rows.reduce<Record<number, OperatingHoursRow>>((acc, row) => {
    acc[row.weekday] = row;
    return acc;
  }, {});
}

export function isTimeRangeWithinOperatingHours(
  row: OperatingHoursRow | null | undefined,
  startTime: string,
  endTime: string
): boolean {
  if (!row) {
    return false;
  }

  const { openMinutes, closeMinutes } = operatingHoursWindowMinutes(row);
  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
}

export function weekdayFromDateKey(dateKey: string): number | null {
  const date = parseDateKey(dateKey);
  return date ? date.getUTCDay() : null;
}
