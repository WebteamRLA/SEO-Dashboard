import { describe, expect, it } from "vitest";
import { describeChange, eventLabel, pointLabel, windowNote } from "./trend";

describe("describeChange", () => {
  it("words position as improved when the number falls", () => {
    expect(describeChange("position", 12.6, 13.2, "September")).toBe("Improved by 0.6 vs September");
    expect(describeChange("position", 13.2, 12.6, "September")).toBe("Worsened by 0.6 vs September");
  });
  it("reports percent change", () => {
    expect(describeChange("percent", 110, 100, "Sep")).toBe("Up 10.0% vs Sep");
    expect(describeChange("percent", 90, 100, "Sep")).toBe("Down 10.0% vs Sep");
    expect(describeChange("percent", 100, 100, "Sep")).toBe("No change vs Sep");
  });
  it("reports CTR change in points", () => {
    expect(describeChange("points", 3.3, 3.1, "Sep")).toBe("Up 0.2 points vs Sep");
  });
  it("has nothing to say without a usable prior", () => {
    expect(describeChange("percent", 5, undefined, "Sep")).toBeUndefined();
    expect(describeChange("percent", 5, 0, "Sep")).toBeUndefined();
    expect(describeChange("points", null, 2, "Sep")).toBeUndefined();
    expect(describeChange("position", 4, null, "Sep")).toBeUndefined();
  });
});

describe("labels", () => {
  it("turns GA4 event names into words", () => {
    expect(eventLabel("contact_page_form_submit")).toBe("Contact page form submit");
  });
  it("labels days and months", () => {
    expect(pointLabel({ start: "2026-11-03", unit: "day" })).toBe("Nov 3");
    expect(pointLabel({ start: "2026-11-01", unit: "month" })).toBe("Nov");
    expect(pointLabel({ start: "2025-11-01", unit: "month" }, true)).toBe("Nov 2025");
  });
  it("describes the window and its comparison", () => {
    expect(
      windowNote({ current: { from: "2026-11-01", to: "2026-11-22" }, previous: { from: "2026-10-10", to: "2026-10-31" }, days: 22 }),
    ).toMatch(/22 days, through yesterday\), compared with /);
  });
});
