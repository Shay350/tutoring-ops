function toText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value.map(toText).filter((entry): entry is string => Boolean(entry));
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
    const maybeMessage = (value as { message?: unknown }).message;
    const messageText = toText(maybeMessage);
    if (messageText) {
      return messageText;
    }
    return JSON.stringify(value);
  }

  return null;
}

function toWeekdayLabel(weekday: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday] ?? String(weekday);
}

function toClockLabel(startMinutes: number): string {
  const normalized = ((startMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatSlottingReasons(reasons: unknown): {
  summary: string | null;
  lines: string[];
} {
  if (typeof reasons === "string") {
    const text = toText(reasons);
    return {
      summary: text,
      lines: [],
    };
  }

  if (Array.isArray(reasons)) {
    const lines = reasons.map(toText).filter((entry): entry is string => Boolean(entry));
    return {
      summary: null,
      lines: lines.length ? lines : ["No explanation available."],
    };
  }

  if (reasons && typeof reasons === "object") {
    const obj = reasons as {
      summary?: unknown;
      headline?: unknown;
      details?: unknown;
      reasons?: unknown;
      generated?: unknown;
      manager?: unknown;
    };

    const generated =
      obj.generated && typeof obj.generated === "object"
        ? (obj.generated as {
            intakeAvailability?: unknown;
            rules?: unknown;
            ranking?: unknown;
          })
        : null;

    if (generated) {
      const ranking =
        generated.ranking && typeof generated.ranking === "object"
          ? (generated.ranking as {
              score?: unknown;
              weekday?: unknown;
              startMinutes?: unknown;
              dayOffset?: unknown;
              overlapCount?: unknown;
              preferenceBonus?: unknown;
            })
          : null;

      const rules =
        generated.rules && typeof generated.rules === "object"
          ? (generated.rules as {
              capacityPerTutorHour?: unknown;
              durationMinutes?: unknown;
            })
          : null;

      const intakeAvailability =
        generated.intakeAvailability && typeof generated.intakeAvailability === "object"
          ? (generated.intakeAvailability as {
              source?: unknown;
              allowedWeekdays?: unknown;
              preferredWindows?: unknown;
            })
          : null;

      const score =
        ranking && typeof ranking.score === "number" ? ranking.score : null;
      const weekday =
        ranking && typeof ranking.weekday === "number" ? ranking.weekday : null;
      const startMinutes =
        ranking && typeof ranking.startMinutes === "number"
          ? ranking.startMinutes
          : null;

      const summaryParts = [
        score !== null ? `Score ${score}` : null,
        weekday !== null && startMinutes !== null
          ? `${toWeekdayLabel(weekday)} ${toClockLabel(startMinutes)}`
          : null,
      ].filter((entry): entry is string => Boolean(entry));

      const lines: string[] = [];

      const source = toText(intakeAvailability?.source);
      if (source) {
        lines.push(`Availability parse: ${source}`);
      }

      if (Array.isArray(intakeAvailability?.allowedWeekdays)) {
        const labels = intakeAvailability.allowedWeekdays
          .filter((entry): entry is number => typeof entry === "number")
          .map((entry) => toWeekdayLabel(entry));
        if (labels.length) {
          lines.push(`Allowed weekdays: ${labels.join(", ")}`);
        }
      }

      if (Array.isArray(intakeAvailability?.preferredWindows)) {
        const windows = intakeAvailability.preferredWindows
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const row = entry as {
              label?: unknown;
              startTime?: unknown;
              endTime?: unknown;
              weight?: unknown;
            };
            const label = toText(row.label);
            const start = toText(row.startTime);
            const end = toText(row.endTime);
            const weight =
              typeof row.weight === "number" ? `w=${row.weight}` : null;

            const parts = [
              label,
              start && end ? `${start}-${end}` : start ?? end,
              weight,
            ].filter((part): part is string => Boolean(part));

            return parts.length ? parts.join(" ") : null;
          })
          .filter((entry): entry is string => Boolean(entry));

        if (windows.length) {
          lines.push(`Preferred windows: ${windows.join("; ")}`);
        }
      }

      const overlapCount =
        ranking && typeof ranking.overlapCount === "number"
          ? ranking.overlapCount
          : null;
      const capacity =
        rules && typeof rules.capacityPerTutorHour === "number"
          ? rules.capacityPerTutorHour
          : null;
      if (overlapCount !== null) {
        lines.push(
          capacity !== null
            ? `Tutor overlap: ${overlapCount}/${capacity}`
            : `Tutor overlap: ${overlapCount}`
        );
      }

      const preferenceBonus =
        ranking && typeof ranking.preferenceBonus === "number"
          ? ranking.preferenceBonus
          : null;
      if (preferenceBonus !== null) {
        lines.push(`Preference bonus: ${preferenceBonus}`);
      }

      const dayOffset =
        ranking && typeof ranking.dayOffset === "number"
          ? ranking.dayOffset
          : null;
      if (dayOffset !== null) {
        lines.push(`Day offset: +${dayOffset}`);
      }

      const duration =
        rules && typeof rules.durationMinutes === "number"
          ? rules.durationMinutes
          : null;
      if (duration !== null) {
        lines.push(`Session duration: ${duration} minutes`);
      }

      const manager =
        obj.manager && typeof obj.manager === "object"
          ? (obj.manager as { decision?: unknown })
          : null;
      const decision =
        manager?.decision && typeof manager.decision === "object"
          ? (manager.decision as { kind?: unknown; note?: unknown })
          : null;
      const decisionKind = toText(decision?.kind);
      const decisionNote = toText(decision?.note);
      if (decisionKind) {
        lines.push(
          decisionNote
            ? `Manager decision: ${decisionKind} (${decisionNote})`
            : `Manager decision: ${decisionKind}`
        );
      }

      return {
        summary: summaryParts.length ? summaryParts.join(" · ") : null,
        lines: lines.length ? lines : ["No explanation available."],
      };
    }

    const summary = toText(obj.summary) ?? toText(obj.headline);
    const detailValue = Array.isArray(obj.details) ? obj.details : obj.reasons;
    const lines = Array.isArray(detailValue)
      ? detailValue.map(toText).filter((entry): entry is string => Boolean(entry))
      : [];

    return {
      summary,
      lines: lines.length ? lines : ["No explanation available."],
    };
  }

  return {
    summary: null,
    lines: ["No explanation available."],
  };
}
