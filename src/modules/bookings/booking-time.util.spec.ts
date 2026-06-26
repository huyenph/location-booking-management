import { OutsideOpenHoursException } from "../../common/exceptions/domain.exceptions";
import { DayOfWeek, OpenTime } from "../locations/entities/open-time.interface";
import { assertWithinOpenHours, hhmmToMinutes } from "./booking-time.util";

const WEEKDAYS_9_18: OpenTime = {
  days: [
    DayOfWeek.MON,
    DayOfWeek.TUE,
    DayOfWeek.WED,
    DayOfWeek.THU,
    DayOfWeek.FRI,
  ],
  startTime: "09:00",
  endTime: "18:00",
};

// 2026-07-01 is a Wednesday; 2026-07-05 is a Sunday (all in UTC).
const d = (iso: string) => new Date(iso);

describe("hhmmToMinutes", () => {
  it("converts HH:mm to minutes since midnight", () => {
    expect(hhmmToMinutes("00:00")).toBe(0);
    expect(hhmmToMinutes("09:30")).toBe(570);
    expect(hhmmToMinutes("18:00")).toBe(1080);
  });
});

describe("assertWithinOpenHours", () => {
  it("passes for a valid weekday booking within the window", () => {
    expect(() =>
      assertWithinOpenHours(
        WEEKDAYS_9_18,
        d("2026-07-01T09:00:00Z"),
        d("2026-07-01T10:00:00Z"),
      ),
    ).not.toThrow();
  });

  it("rejects when endTime <= startTime", () => {
    expect(() =>
      assertWithinOpenHours(
        WEEKDAYS_9_18,
        d("2026-07-01T10:00:00Z"),
        d("2026-07-01T10:00:00Z"),
      ),
    ).toThrow(OutsideOpenHoursException);
  });

  it("rejects a day not in the allowed days (Sunday)", () => {
    expect(() =>
      assertWithinOpenHours(
        WEEKDAYS_9_18,
        d("2026-07-05T09:00:00Z"),
        d("2026-07-05T10:00:00Z"),
      ),
    ).toThrow(/not an open day/);
  });

  it("rejects a start before opening time", () => {
    expect(() =>
      assertWithinOpenHours(
        WEEKDAYS_9_18,
        d("2026-07-01T08:00:00Z"),
        d("2026-07-01T09:30:00Z"),
      ),
    ).toThrow(/must be within/);
  });

  it("rejects an end after closing time", () => {
    expect(() =>
      assertWithinOpenHours(
        WEEKDAYS_9_18,
        d("2026-07-01T17:30:00Z"),
        d("2026-07-01T18:30:00Z"),
      ),
    ).toThrow(/must be within/);
  });

  it("rejects when the room has no open hours configured", () => {
    expect(() =>
      assertWithinOpenHours(
        null,
        d("2026-07-01T09:00:00Z"),
        d("2026-07-01T10:00:00Z"),
      ),
    ).toThrow(/no configured open hours/);
  });

  it("rejects a booking spanning two UTC days", () => {
    expect(() =>
      assertWithinOpenHours(
        WEEKDAYS_9_18,
        d("2026-07-01T23:00:00Z"),
        d("2026-07-02T01:00:00Z"),
      ),
    ).toThrow(/same UTC calendar day/);
  });
});
