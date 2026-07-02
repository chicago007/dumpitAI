import { describe, expect, it } from "vitest";
import { parseActivityInput } from "@/lib/activity-input";

const customTypes = [
  { key: "custom_meditation", label: "명상", color: "#8B5CF6" },
  { key: "custom_english", label: "영어", color: "#0EA5E9" },
];

describe("parseActivityInput", () => {
  it("parses reading with minutes", () => {
    expect(parseActivityInput("독서 30분")).toEqual({
      activityKey: "reading",
      content: "",
      durationMin: 30,
      quantity: null,
      unit: "min",
    });
  });

  it("parses reading with content", () => {
    expect(parseActivityInput("독서 30분 클린 코드")).toEqual({
      activityKey: "reading",
      content: "클린 코드",
      durationMin: 30,
      quantity: null,
      unit: "min",
    });
  });

  it("parses exercise with km", () => {
    expect(parseActivityInput("러닝 5km")).toEqual({
      activityKey: "exercise",
      content: "",
      durationMin: null,
      quantity: 5,
      unit: "km",
    });
  });

  it("parses exercise with hours", () => {
    expect(parseActivityInput("헬스 1시간")).toEqual({
      activityKey: "exercise",
      content: "",
      durationMin: 60,
      quantity: null,
      unit: "min",
    });
  });

  it("parses custom activity with minutes", () => {
    expect(parseActivityInput("명상 20분", customTypes)).toEqual({
      activityKey: "custom_meditation",
      content: "",
      durationMin: 20,
      quantity: null,
      unit: "min",
    });
  });

  it("prefers longer custom label match", () => {
    const types = [
      { key: "a", label: "영", color: "#000" },
      { key: "b", label: "영어", color: "#000" },
    ];
    expect(parseActivityInput("영어 30분", types)?.activityKey).toBe("b");
  });

  it("returns null for unrecognized input", () => {
    expect(parseActivityInput("보고서 작성")).toBeNull();
    expect(parseActivityInput("보고서 작성", customTypes)).toBeNull();
  });
});
