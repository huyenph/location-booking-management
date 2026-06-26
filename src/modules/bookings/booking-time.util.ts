import { DayOfWeek, OpenTime } from "../locations/entities/open-time.interface";
import { OutsideOpenHoursException } from "../../common/exceptions/domain.exceptions";

/** getUTCDay() index (0=Sun) -> DayOfWeek enum. */
const UTC_DAY_TO_ENUM: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUN,
  1: DayOfWeek.MON,
  2: DayOfWeek.TUE,
  3: DayOfWeek.WED,
  4: DayOfWeek.THU,
  5: DayOfWeek.FRI,
  6: DayOfWeek.SAT,
};

/** "HH:mm" -> minutes since midnight. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function utcMinutesOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function assertWithinOpenHours(
  openTime: OpenTime | null,
  startTime: Date,
  endTime: Date,
): void {
  if (endTime.getTime() <= startTime.getTime()) {
    throw new OutsideOpenHoursException("endTime must be after startTime.");
  }

  if (!openTime) {
    throw new OutsideOpenHoursException(
      "this room has no configured open hours.",
    );
  }

  const sameUtcDay =
    startTime.getUTCFullYear() === endTime.getUTCFullYear() &&
    startTime.getUTCMonth() === endTime.getUTCMonth() &&
    startTime.getUTCDate() === endTime.getUTCDate();
  if (!sameUtcDay) {
    throw new OutsideOpenHoursException(
      "booking must start and end on the same UTC calendar day.",
    );
  }

  const bookingDay = UTC_DAY_TO_ENUM[startTime.getUTCDay()];
  if (!openTime.days.includes(bookingDay)) {
    throw new OutsideOpenHoursException(
      `${bookingDay} is not an open day (open days: ${openTime.days.join(", ")}).`,
    );
  }

  const openStart = hhmmToMinutes(openTime.startTime);
  const openEnd = hhmmToMinutes(openTime.endTime);
  const bookingStart = utcMinutesOfDay(startTime);
  const bookingEnd = utcMinutesOfDay(endTime);

  if (bookingStart < openStart || bookingEnd > openEnd) {
    throw new OutsideOpenHoursException(
      `booking must be within ${openTime.startTime}–${openTime.endTime} UTC (requested ${formatMinutes(bookingStart)}–${formatMinutes(bookingEnd)}).`,
    );
  }
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
