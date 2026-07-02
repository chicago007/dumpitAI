import { describe, expect, it } from "vitest";
import { parseMultiDayScheduleInput } from "@/lib/multi-day-schedule-input";

const ref = new Date("2025-07-03T12:00:00+09:00");

describe("parseMultiDayScheduleInput", () => {
  it("parses title with multiple day-of-month entries and trailing space", () => {
    const items = parseMultiDayScheduleInput(
      "분배금, 16일, 29일, 30일, 31일/업무",
      "work",
      { now: ref },
    );

    expect(items).not.toBeNull();
    expect(items).toHaveLength(4);
    expect(items?.every((item) => item.kind === "schedule")).toBe(true);
    expect(items?.every((item) => item.content === "분배금")).toBe(true);
    expect(items?.every((item) => item.targetSpace === "work")).toBe(true);
    expect(items?.map((item) => item.dueAt?.slice(0, 10))).toEqual([
      "2025-07-16",
      "2025-07-29",
      "2025-07-30",
      "2025-07-31",
    ]);
  });

  it("parses leading space prefix", () => {
    const items = parseMultiDayScheduleInput(
      "/업무 분배금, 16일, 29일",
      "all",
      { now: ref },
    );

    expect(items).toHaveLength(2);
    expect(items?.[0]?.targetSpace).toBe("work");
  });

  it("returns null when day parts are invalid", () => {
    expect(
      parseMultiDayScheduleInput("분배금, 내일, 29일", "work", { now: ref }),
    ).toBeNull();
  });

  it("parses spaced commas and trailing space suffix", () => {
    const items = parseMultiDayScheduleInput(
      "분배금 , 16일, 29일, 30일, 31일 /업무",
      "work",
      { now: ref },
    );

    expect(items).toHaveLength(4);
    expect(items?.[0]?.content).toBe("분배금");
    expect(items?.[0]?.targetSpace).toBe("work");
  });
});
