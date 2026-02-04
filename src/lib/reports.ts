import { formatDateKey } from "@/lib/schedule";

export type MonthRange = {
  month: string;
  startDate: string;
  endDate: string;
  label: string;
};

export function normalizeMonth(
  value: string | string[] | null | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  if (!/^\d{4}-\d{2}$/.test(raw)) {
    return null;
  }

  const [yearValue, monthValue] = raw.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return `${yearValue}-${monthValue}`;
}

export function formatMonthValue(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function buildMonthRange(month: string): MonthRange {
  const [yearValue, monthValue] = month.split("-");
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    month,
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(start),
  };
}

export function getMonthRange(
  value: string | string[] | null | undefined,
  fallbackDate: Date = new Date()
): MonthRange {
  const normalized = normalizeMonth(value);
  const month = normalized ?? formatMonthValue(fallbackDate);
  return buildMonthRange(month);
}

export function computeDurationHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number {
  if (!startTime || !endTime) {
    return 0;
  }

  const parse = (value: string): number | null => {
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
      return null;
    }

    const [hoursValue, minutesValue] = value.split(":");
    const hours = Number(hoursValue);
    const minutes = Number(minutesValue);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  };

  const startMinutes = parse(startTime);
  const endMinutes = parse(endTime);

  if (startMinutes === null || endMinutes === null) {
    return 0;
  }

  if (endMinutes <= startMinutes) {
    return 0;
  }

  return (endMinutes - startMinutes) / 60;
}
