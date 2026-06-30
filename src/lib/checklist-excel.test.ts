import { describe, expect, it } from "vitest";
import { parseBoardMoney } from "@/lib/board-money";
import { parseChecklistSheetRows } from "@/lib/checklist-excel";

describe("board-money", () => {
  it("parses won amounts", () => {
    expect(parseBoardMoney("120만원").amount).toBe(1_200_000);
  });

  it("parses USD", () => {
    const result = parseBoardMoney("$120");
    expect(result.amount).toBe(120);
    expect(result.currency).toBe("USD");
  });
});

describe("checklist-excel", () => {
  it("parses category and label columns", () => {
    const rows = parseChecklistSheetRows([
      ["카테고리", "항목"],
      ["준비", "여권"],
      ["준비", "환전"],
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ groupName: "준비", label: "여권" });
  });
});
