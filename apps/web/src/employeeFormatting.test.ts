import { describe, expect, it } from "vitest";
import { formatBackToTopParts } from "./employeeFormatting";

describe("back-to-top labels", () => {
  it("keeps English words intact and separated", () => {
    expect(formatBackToTopParts("en")).toEqual(["Back", "to", "top"]);
  });

  it("keeps Vietnamese words intact and separated", () => {
    expect(formatBackToTopParts("vi")).toEqual(["Về", "đầu", "trang"]);
  });
});
