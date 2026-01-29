export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const [hoursValue, minutesValue] = value.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start && !end) {
    return "—";
  }

  if (start && end) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  return start ? formatTime(start) : formatTime(end);
}
