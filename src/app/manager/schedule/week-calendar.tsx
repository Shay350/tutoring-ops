import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTimeRange } from "@/lib/format";
import type { OperatingHoursRow } from "@/lib/operating-hours";
import { operatingHoursWindowMinutes } from "@/lib/operating-hours";
import {
  formatMinutesToTimeLabel,
  parseDateKey,
  parseTimeToMinutes,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

type SessionRow = {
  id: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  tutor_id: string | null;
  students?: Array<{ id: string; full_name: string | null }> | null;
};

export default function WeekCalendar({
  weekDates,
  sessionsByDate,
  tutorNames,
  operatingHours,
}: {
  weekDates: string[];
  sessionsByDate: Record<string, SessionRow[]>;
  tutorNames: Record<string, string>;
  operatingHours: OperatingHoursRow[];
}) {
  const hoursByWeekday = operatingHours.reduce<Record<number, OperatingHoursRow>>(
    (acc, row) => {
      acc[row.weekday] = row;
      return acc;
    },
    {}
  );

  const weekdayForDate = (dateKey: string): number => {
    const parsed = parseDateKey(dateKey);
    return parsed ? parsed.getUTCDay() : 0;
  };

  const windows = weekDates.map((dateKey) => {
    const weekday = weekdayForDate(dateKey);
    const row = hoursByWeekday[weekday];
    const window = row ? operatingHoursWindowMinutes(row) : { openMinutes: null, closeMinutes: null };
    return { dateKey, weekday, ...window };
  });

  const openMinutesAll = windows
    .map((window) => window.openMinutes)
    .filter((value): value is number => value !== null);
  const closeMinutesAll = windows
    .map((window) => window.closeMinutes)
    .filter((value): value is number => value !== null);

  const fallbackStart = 9 * 60;
  const fallbackEnd = 17 * 60;

  const startMinutes = openMinutesAll.length
    ? Math.min(...openMinutesAll)
    : fallbackStart;
  const endMinutes = closeMinutesAll.length ? Math.max(...closeMinutesAll) : fallbackEnd;

  const slotSize = 30;
  const slots: number[] = [];
  for (let m = startMinutes; m < endMinutes; m += slotSize) {
    slots.push(m);
  }

  const sessionsByDateAndSlot = weekDates.reduce<
    Record<string, Record<number, SessionRow[]>>
  >((acc, dateKey) => {
    const rows = sessionsByDate[dateKey] ?? [];
    const bySlot = rows.reduce<Record<number, SessionRow[]>>((inner, session) => {
      if (!session.start_time) {
        return inner;
      }
      const sessionStart = parseTimeToMinutes(session.start_time);
      if (sessionStart === null) {
        return inner;
      }
      const slot = Math.floor((sessionStart - startMinutes) / slotSize) * slotSize + startMinutes;
      if (!inner[slot]) {
        inner[slot] = [];
      }
      inner[slot].push(session);
      return inner;
    }, {});

    acc[dateKey] = bySlot;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar view</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div
          className="grid min-w-[960px]"
          style={{ gridTemplateColumns: `140px repeat(${weekDates.length}, minmax(0, 1fr))` }}
        >
          <div className="sticky left-0 z-10 border-b border-border bg-background p-3 text-sm font-medium text-slate-900">
            Time
          </div>
          {weekDates.map((dateKey) => (
            <div
              key={dateKey}
              className="border-b border-border bg-background p-3 text-sm font-medium text-slate-900"
            >
              {formatDate(dateKey)}
            </div>
          ))}

          {slots.map((slotMinutes) => (
            <div key={slotMinutes} className="contents">
              <div className="sticky left-0 z-10 border-b border-border bg-background p-3 text-sm text-muted-foreground">
                {formatMinutesToTimeLabel(slotMinutes)}
              </div>
              {weekDates.map((dateKey) => {
                const weekday = weekdayForDate(dateKey);
                const dayHours = hoursByWeekday[weekday];
                const { openMinutes, closeMinutes } = dayHours
                  ? operatingHoursWindowMinutes(dayHours)
                  : { openMinutes: null, closeMinutes: null };

                const isOpen =
                  openMinutes !== null &&
                  closeMinutes !== null &&
                  slotMinutes >= openMinutes &&
                  slotMinutes < closeMinutes;

                const sessionsAtSlot =
                  sessionsByDateAndSlot[dateKey]?.[slotMinutes] ?? [];

                return (
                  <div
                    key={`${dateKey}-${slotMinutes}`}
                    className={cn(
                      "min-h-[56px] border-b border-l border-border p-2",
                      isOpen ? "bg-white" : "bg-slate-50"
                    )}
                  >
                    {sessionsAtSlot.length > 0 ? (
                      <div className="space-y-2">
                        {sessionsAtSlot.map((session) => {
                          const studentName =
                            session.students?.[0]?.full_name ?? "Student";
                          const tutorName =
                            tutorNames[session.tutor_id ?? ""] ?? "Tutor";

                          return (
                            <div
                              key={session.id}
                              className="rounded-md border border-slate-200 bg-slate-50 p-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-medium text-slate-900">
                                  {formatTimeRange(session.start_time, session.end_time)}
                                </p>
                                <Badge variant="secondary" className="capitalize">
                                  {session.status ?? "scheduled"}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-700">
                                {studentName} • {tutorName}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
