import { describe, expect, it } from "vitest";
import {
  getSeoulDayBounds,
  getSeoulTodayKey,
  seoulDateKey,
} from "@/lib/dates";

describe("dates (Seoul)", () => {
  it("uses Seoul calendar date for KST morning", () => {
    const kstMorning = new Date("2025-06-30T01:30:00+09:00");
    expect(getSeoulTodayKey(kstMorning)).toBe("2025-06-30");
  });

  it("returns full-day bounds in Seoul", () => {
    const ref = new Date("2025-06-30T12:00:00+09:00");
    const { start, end, startKey } = getSeoulDayBounds(ref);
    expect(startKey).toBe("2025-06-30");
    expect(start.toISOString()).toBe("2025-06-29T15:00:00.000Z");
    expect(end.toISOString()).toBe("2025-06-30T14:59:59.999Z");
  });

  it("builds stable date keys", () => {
    expect(seoulDateKey(2025, 5, 3)).toBe("2025-06-03");
  });
});
