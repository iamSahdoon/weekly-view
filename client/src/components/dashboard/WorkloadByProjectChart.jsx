import {
  Bar,
  BarChart,
  CartesianGrid,
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
  TASK_TYPES,
  axisLineProps,
  barCursorProps,
  gridProps,
  labelTickProps,
  tickProps,
  typeColor,
} from "../../lib/chartTheme.js";
import { TASK_TYPE_LABELS } from "../../lib/constants.js";
import { workloadEmptyText, workloadRows } from "../../lib/dashboardData.js";
import { weekNumberLabel } from "../../lib/dates.js";
import { formatHours } from "../../lib/format.js";
import { ChartBlock } from "./ChartContainer.jsx";
import { ChartTooltip } from "./ChartTooltip.jsx";

// Workload by project (design §7.4): a horizontal stacked bar, one row per project,
// segments coloured by task type, the total in mono at the row end. Hours come from the
// week's lines, Drafts included — they are shared as posted. A stack, never a pie.

const LEGEND = TASK_TYPES.map((type) => ({
  label: TASK_TYPE_LABELS[type],
  color: typeColor[type],
}));
const MAX_NAME = 16;

const shortName = (name) =>
  name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name;
const endLabel = (value) => `${formatHours(value)} h`;

export function WorkloadByProjectChart({ query, weekKey }) {
  const hasMounted = useHasMounted();
  const describe = (payload) => {
    const row = payload[0].payload;
    return {
      title: row.name,
      rows: TASK_TYPES.filter((type) => row[type] > 0).map((type) => ({
        color: typeColor[type],
        label: TASK_TYPE_LABELS[type],
        value: endLabel(row[type]),
      })),
    };
  };
  return (
    <ChartBlock
      query={query}
      title="Workload by project"
      legend={LEGEND}
      height={BARS_HEIGHT}
      className="min-[1200px]:col-span-6"
      empty={(data) => workloadEmptyText(data, weekKey)}
      summary={(data) => ({
        caption: `Hours by project, week ${weekNumberLabel(weekKey).slice(1)}`,
        head: [
          "Project",
          ...TASK_TYPES.map((t) => TASK_TYPE_LABELS[t]),
          "Total",
        ],
        rows: workloadRows(data).map((r) => [
          r.name,
          ...TASK_TYPES.map((t) => formatHours(r[t])),
          formatHours(r.totalHours),
        ]),
      })}
    >
      {(data) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={workloadRows(data)}
            layout="vertical"
            barSize={MAX_BAR}
            barCategoryGap="40%"
            margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
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
              dataKey="name"
              width={112}
              tick={labelTickProps}
              tickFormatter={shortName}
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
            {TASK_TYPES.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="hours"
                fill={typeColor[type]}
                isAnimationActive={hasMounted}
                animationDuration={ANIMATION_MS}
                animationEasing="ease-out"
              />
            ))}
            {/* Carries each row's total at its end. A row whose last type has no hours
                would otherwise lose its label, since a label hangs off a drawn bar. */}
            <Bar
              dataKey="end"
              stackId="hours"
              fill="none"
              isAnimationActive={false}
              legendType="none"
            >
              <LabelList
                position="right"
                valueAccessor={(entry) => entry.payload.totalHours}
                formatter={endLabel}
                fontFamily="var(--font-mono)"
                fontSize={11}
                fill="var(--body)"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartBlock>
  );
}
