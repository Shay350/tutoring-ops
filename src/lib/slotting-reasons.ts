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
    };
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

