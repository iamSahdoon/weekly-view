import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHasMounted } from "../../hooks/useHasMounted.js";
import {
  ANIMATION_MS,
  MAX_Y_TICKS,
  TREND_HEIGHT,
  axisLineProps,
  cursorProps,
  gridProps,
  seriesColor,
  tickProps,
  xTicks,
} from "../../lib/chartTheme.js";
import { TREND_WINDOWS } from "../../lib/dashboardParams.js";
import { trendEmptyText, trendRows } from "../../lib/dashboardData.js";
import { formatWeekRange } from "../../lib/format.js";
import { Select } from "../ui/Select.jsx";
import { ChartBlock } from "./ChartContainer.jsx";
import { ChartTooltip } from "./ChartTooltip.jsx";

// Tasks completed over time (design §7.4): a line, one team series and an optional
// person's, ending at the week in the picker. Two scope controls live in the header: the
// window (4 · 8 · 12 weeks, default 8 — it replaces a page-wide date range) and the person
// to draw beside the team. 2px lines, no markers at rest, no area fill.

const WINDOWS = TREND_WINDOWS;

export function TasksTrendChart({
  query,
  weeks,
  onWeeks,
  personId,
  onPerson,
  people,
}) {
  const hasMounted = useHasMounted();
  const personName = people.find((p) => p.value === personId)?.label;
  const legend =
    personId && personName
      ? [
          { label: "Team", color: seriesColor.team },
          { label: personName, color: seriesColor.person },
        ]
      : undefined;
  const describe = (payload) => {
    const row = payload[0].payload;
    return {
      title: `${row.label} · ${formatWeekRange(row.weekKey)}`,
      rows: [
        { color: seriesColor.team, label: "Team", value: row.team },
        ...(row.person != null
          ? [
              {
                color: seriesColor.person,
                label: personName ?? "Person",
                value: row.person,
              },
            ]
          : []),
      ],
    };
  };

  return (
    <ChartBlock
      query={query}
      title="Tasks completed"
      legend={legend}
      height={TREND_HEIGHT}
      className="min-[1200px]:col-span-8"
      scope={
        <>
          <Select
            size="sm"
            aria-label="Compare a person"
            className="w-[168px]"
            value={personId}
            options={[{ value: "", label: "Team only" }, ...people]}
            onChange={(event) => onPerson(event.target.value)}
          />
          <Select
            size="sm"
            aria-label="Weeks shown"
            className="w-[108px]"
            value={weeks}
            options={WINDOWS.map((n) => ({ value: n, label: `${n} weeks` }))}
            onChange={(event) => onWeeks(Number(event.target.value))}
          />
        </>
      }
      empty={(data) => trendEmptyText(trendRows(data))}
      summary={(data) => {
        const rows = trendRows(data);
        const hasPerson = rows.some((r) => r.person != null);
        return {
          caption: "Tasks completed per week",
          head: [
            "Week",
            "Team",
            ...(hasPerson ? [personName ?? "Person"] : []),
          ],
          rows: rows.map((r) => [
            r.label,
            r.team,
            ...(hasPerson ? [r.person ?? 0] : []),
          ]),
        };
      }}
    >
      {(data) => {
        const rows = trendRows(data);
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="label"
                ticks={xTicks(rows.map((r) => r.label))}
                interval={0}
                tick={tickProps}
                tickLine={false}
                axisLine={axisLineProps}
              />
              <YAxis
                width={32}
                allowDecimals={false}
                tickCount={MAX_Y_TICKS}
                domain={[0, "auto"]}
                tick={tickProps}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                offset={12}
                cursor={cursorProps}
                isAnimationActive={false}
                content={<ChartTooltip describe={describe} />}
              />
              <Line
                dataKey="team"
                name="Team"
                type="linear"
                stroke={seriesColor.team}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: seriesColor.team,
                  stroke: "var(--card)",
                }}
                isAnimationActive={hasMounted}
                animationDuration={ANIMATION_MS}
                animationEasing="ease-out"
              />
              {rows.some((r) => r.person != null) && (
                <Line
                  dataKey="person"
                  name={personName}
                  type="linear"
                  stroke={seriesColor.person}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: seriesColor.person,
                    stroke: "var(--card)",
                  }}
                  isAnimationActive={hasMounted}
                  animationDuration={ANIMATION_MS}
                  animationEasing="ease-out"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      }}
    </ChartBlock>
  );
}
