"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { validateTimeRange } from "@/lib/schedule";
import { getDefaultLocationId, requireManagerLocationAccess } from "@/lib/locations";

type OperatingHoursUpsert = {
  location_id: string;
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

export async function updateOperatingHours(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const formLocationId = String(formData.get("location_id") ?? "").trim();
  let locationId = formLocationId;
  if (!locationId) {
    try {
      locationId = await getDefaultLocationId(context.supabase);
    } catch (error) {
      return toActionError(
        error instanceof Error ? error.message : "Unable to load default location."
      );
    }
  }

  try {
    await requireManagerLocationAccess(context.supabase, context.user.id, locationId);
  } catch (error) {
    return toActionError(
      error instanceof Error ? error.message : "Unable to validate location access."
    );
  }

  const weekdaysRaw = formData.getAll("weekdays").map((value) => String(value));
  const weekdayKeys = Array.from(
    new Set(
      weekdaysRaw
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 6)
    )
  ).sort((a, b) => a - b);

  if (weekdayKeys.length === 0) {
    return toActionError("No weekdays provided.");
  }

  const payload: OperatingHoursUpsert[] = [];
  for (const weekday of weekdayKeys) {
    const prefix = `weekday_${weekday}`;
    const isClosed = Boolean(formData.get(`${prefix}_closed`));
    const openTime = String(formData.get(`${prefix}_open`) ?? "").trim();
    const closeTime = String(formData.get(`${prefix}_close`) ?? "").trim();

    if (isClosed) {
      payload.push({
        location_id: locationId,
        weekday,
        is_closed: true,
        open_time: null,
        close_time: null,
      });
      continue;
    }

    const timeError = validateTimeRange(openTime, closeTime);
    if (timeError) {
      return toActionError(`Weekday ${weekday}: ${timeError}`);
    }

    payload.push({
      location_id: locationId,
      weekday,
      is_closed: false,
      open_time: openTime,
      close_time: closeTime,
    });
  }

  const { error } = await context.supabase
    .from("operating_hours")
    .upsert(payload, { onConflict: "location_id,weekday" });

  if (error) {
    return toActionError("Unable to save operating hours. Is the VS8 migration applied?");
  }

  revalidatePath("/manager/schedule");
  return toActionSuccess("Operating hours saved.");
}
