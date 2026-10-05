import { format } from "date-fns";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "../../lib/constants.js";
import { Tabs } from "../ui/Tabs.jsx";

// The five-day strip at tab scale (design §3.16, §6.14): Mon–Fri, the chosen day
// underlined. A holiday is disabled and its name is the tooltip; so is a day that
// hasn't happened. `days` is lib/updatesDay's updatesDays().

export function DayTabs({ days, value, onChange }) {
  const items = days.map(({ weekday, date, holiday, future, open }) => ({
    value: weekday,
    label: `${WEEKDAY_SHORT[weekday]} ${format(date, "d")}`,
    disabled: !open,
    title: holiday
      ? holiday.name
      : future
        ? `${WEEKDAY_LABELS[weekday]} hasn’t happened yet`
        : undefined,
  }));
  return (
    <Tabs
      ariaLabel="Day"
      items={items}
      value={value}
      onChange={onChange}
      className="max-md:overflow-x-auto"
    />
  );
}
