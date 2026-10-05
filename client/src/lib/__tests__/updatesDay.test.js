import { describe, expect, it } from "vitest";
import { resolveUpdatesDay, updatesDays } from "../updatesDay.js";

// Which day Team updates shows (design §3.16): a holiday and a day still ahead can't be
// chosen; the default is today, or the latest day that can be.

const at = (y, m, d) => new Date(y, m - 1, d, 10, 0);
const WEDNESDAY = at(2026, 10, 7); // 2026-W41
const SATURDAY = at(2026, 10, 10);
const THIS = "2026-W41";
const poya = { name: "Poya" };

describe("which days can be chosen", () => {
  it("closes a holiday and the days ahead in the current week", () => {
    const days = updatesDays(THIS, { tue: poya }, WEDNESDAY);
    expect(days.map((d) => [d.weekday, d.open])).toEqual([
      ["mon", true],
      ["tue", false],
      ["wed", true],
      ["thu", false],
      ["fri", false],
    ]);
    expect(days[1].holiday).toBe(poya);
    expect(days[3].future).toBe(true);
  });

  it("opens every day of a past week except its holidays", () => {
    const days = updatesDays("2026-W38", { wed: poya }, WEDNESDAY);
    expect(days.filter((d) => !d.open).map((d) => d.weekday)).toEqual(["wed"]);
  });
});

describe("which day is shown", () => {
  it("is today by default", () => {
    expect(resolveUpdatesDay(null, THIS, {}, WEDNESDAY)).toBe("wed");
  });

  it("is Friday on a weekend", () => {
    expect(resolveUpdatesDay(null, THIS, {}, SATURDAY)).toBe("fri");
  });

  it("is the latest open day of a past week, skipping a holiday", () => {
    expect(resolveUpdatesDay(null, "2026-W38", {}, WEDNESDAY)).toBe("fri");
    expect(resolveUpdatesDay(null, "2026-W38", { fri: poya }, WEDNESDAY)).toBe(
      "thu",
    );
  });

  it("is the day in the URL when it can be chosen", () => {
    expect(resolveUpdatesDay("mon", THIS, {}, WEDNESDAY)).toBe("mon");
  });

  it("ignores a URL day that is a holiday, ahead, or not a day", () => {
    expect(resolveUpdatesDay("tue", THIS, { tue: poya }, WEDNESDAY)).toBe(
      "wed",
    );
    expect(resolveUpdatesDay("fri", THIS, {}, WEDNESDAY)).toBe("wed");
    expect(resolveUpdatesDay("sun", THIS, {}, WEDNESDAY)).toBe("wed");
  });

  it("falls back to the latest open day when today is a holiday", () => {
    expect(resolveUpdatesDay(null, THIS, { wed: poya }, WEDNESDAY)).toBe("tue");
  });

  it("is nothing when no day can be chosen", () => {
    const all = { mon: poya, tue: poya, wed: poya, thu: poya, fri: poya };
    expect(resolveUpdatesDay(null, "2026-W38", all, WEDNESDAY)).toBeNull();
  });
});
