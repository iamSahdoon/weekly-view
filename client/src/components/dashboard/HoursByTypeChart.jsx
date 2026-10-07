import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHasMounted } from "../../hooks/useHasMounted.js";
import {
  ANIMATION_MS,
  BARS_HEIGHT,
  MAX_BAR,
  MAX_Y_TICKS,
  axisLineProps,
  barCursorProps,
  gridProps,
  labelTickProps,
  tickProps,
  typeColor,
} from "../../lib/chartTheme.js";
import { hoursEmptyText, hoursRows } from "../../lib/dashboardData.js";
import { weekNumberLabel } from "../../lib/dates.js";
import { formatHours } from "../../lib/format.js";
import { ChartBlock } from "./ChartContainer.jsx";
import { ChartTooltip } from "./ChartTooltip.jsx";

// Time spent by task type, team-wide (design §7.4): horizontal bars, seven rows in the
// fixed order of the task types, the value in mono at each bar's end. Horizontal because
// the category names are words. One series, so no legend; each bar wears its category's
// colour, the same one the day panel and the form use.

const endLabel = (value) => `${formatHours(value)} h`;

export function HoursByTypeChart({ query, weekKey }) {
  const hasMounted = useHasMounted();
  const describe = (payload) => {
    const row = payload[0].payload;
    return {
      title: "Hours",
      rows: [
        {
          color: typeColor[row.type],
          label: row.label,
          value: endLabel(row.hours),
        },
      ],
    };
  };
  return (
    <ChartBlock
      query={query}
      title="Hours by task type"
      subtitle="Hours logged this week. Each number is that type’s total."
      height={BARS_HEIGHT}
      className="min-[1200px]:col-span-4"
      empty={(data) => hoursEmptyText(data, weekKey)}
      summary={(data) => ({
        caption: `Hours by task type, week ${weekNumberLabel(weekKey).slice(1)}`,
        head: ["Task type", "Hours"],
        rows: hoursRows(data).map((r) => [r.label, formatHours(r.hours)]),
      })}
    >
      {(data) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={hoursRows(data)}
            layout="vertical"
            barSize={MAX_BAR}
            barCategoryGap="40%"
            margin={{ top: 0, right: 64, bottom: 0, left: 0 }}
          >
            <CartesianGrid {...gridProps} />
            <XAxis
              type="number"
              allowDecimals={false}
              tickCount={MAX_Y_TICKS}
              domain={[0, "auto"]}
              tickFormatter={(n) => `${n} h`}
              tick={tickProps}
              tickLine={false}
              axisLine={axisLineProps}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={112}
              tick={labelTickProps}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip
              offset={12}
              cursor={barCursorProps}
              isAnimationActive={false}
              content={<ChartTooltip describe={describe} />}
            />
            <Bar
              dataKey="hours"
              isAnimationActive={hasMounted}
              animationDuration={ANIMATION_MS}
              animationEasing="ease-out"
            >
              {hoursRows(data).map((row) => (
                <Cell key={row.type} fill={typeColor[row.type]} />
              ))}
              <LabelList
                dataKey="hours"
                position="right"
                formatter={endLabel}
                fontFamily="var(--font-mono)"
                fontSize={12}
                fontWeight={600}
                fill="var(--ink)"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartBlock>
  );
}
