import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarShapeProps } from "recharts";

import { formatDate } from "../lib/format";
import type { SeverityCounts, TrendPoint } from "../types/api";

const grid = "#e4e9ef";
const axis = { fontSize: 12, fill: "#526173" };

export function IncidentVolumeChart({ points }: { points: TrendPoint[] }) {
  const summary = points
    .map((point) => `${formatDate(point.day)}: ${point.incident_volume.toString()}`)
    .join(", ");
  return (
    <div className="chart" role="img" aria-label="Incident volume by UTC day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDate}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(value) => formatDate(String(value))} />
          <Bar
            dataKey="incident_volume"
            name="Incidents"
            fill="#0f766e"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <span className="sr-only">Fourteen-day values: {summary}.</span>
    </div>
  );
}

export function SeverityDistributionChart({ counts }: { counts: SeverityCounts }) {
  const data = [
    { level: "Low", count: counts.low, fill: "#15803d" },
    { level: "Guarded", count: counts.guarded, fill: "#0f766e" },
    { level: "Elevated", count: counts.elevated, fill: "#b45309" },
    { level: "High", count: counts.high, fill: "#d04a3b" },
    { level: "Critical", count: counts.critical, fill: "#8f1f17" },
  ];
  const renderSeverityBar = ({ x, y, width, height, payload }: BarShapeProps) => {
    const fill = (payload as { fill?: string } | undefined)?.fill ?? "#364152";
    return <rect x={x} y={y} width={width} height={height} rx={3} fill={fill} />;
  };
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Incident severity distribution. Low ${counts.low.toString()}, Guarded ${counts.guarded.toString()}, Elevated ${counts.elevated.toString()}, High ${counts.high.toString()}, Critical ${counts.critical.toString()}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 10, bottom: 0 }}
        >
          <CartesianGrid stroke={grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="level"
            width={62}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip />
          <Bar
            dataKey="count"
            name="Incidents"
            shape={renderSeverityBar}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskTrendChart({ points }: { points: TrendPoint[] }) {
  const normalized = points.map((point) => ({
    ...point,
    cyber: point.average_cyber_score === null ? null : Number(point.average_cyber_score),
    transaction:
      point.average_transaction_score === null
        ? null
        : Number(point.average_transaction_score),
    fused: point.average_fused_score === null ? null : Number(point.average_fused_score),
  }));
  const summary = normalized
    .map(
      (point) =>
        `${formatDate(point.day)}: cyber ${String(point.cyber ?? "not available")}, transaction ${String(point.transaction ?? "not available")}, fused ${String(point.fused ?? "not available")}`,
    )
    .join("; ");
  return (
    <div className="chart" role="img" aria-label="Daily average risk by stream">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={normalized}
          margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
        >
          <CartesianGrid stroke={grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDate}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(value) => formatDate(String(value))} />
          <Legend iconType="plainline" />
          <Line
            type="linear"
            dataKey="cyber"
            name="Cyber"
            stroke="#0e7490"
            strokeWidth={2}
            strokeDasharray="7 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="transaction"
            name="Transaction"
            stroke="#b45309"
            strokeWidth={2}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="fused"
            name="Fused"
            stroke="#182230"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className="sr-only">Exact daily values: {summary}.</span>
    </div>
  );
}

export function TransactionActionsChart({ points }: { points: TrendPoint[] }) {
  const totals = points.reduce(
    (result, point) => ({
      permitted: result.permitted + point.transaction_actions.permitted,
      held: result.held + point.transaction_actions.held,
      released: result.released + point.transaction_actions.released,
      declined: result.declined + point.transaction_actions.declined,
      pending: result.pending + point.transaction_actions.pending,
      cancelled: result.cancelled + point.transaction_actions.cancelled,
    }),
    { permitted: 0, held: 0, released: 0, declined: 0, pending: 0, cancelled: 0 },
  );
  const labels: Record<keyof typeof totals, string> = {
    permitted: "Allowed",
    held: "Held",
    released: "Released",
    declined: "Declined",
    pending: "Pending",
    cancelled: "Cancelled",
  };
  const data = Object.entries(totals).map(([action, count]) => ({
    action,
    label: labels[action as keyof typeof totals],
    count,
  }));
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Transaction action distribution. Allowed ${totals.permitted.toString()}, Held ${totals.held.toString()}, Released ${totals.released.toString()}, Declined ${totals.declined.toString()}, Pending ${totals.pending.toString()}, Cancelled ${totals.cancelled.toString()}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 6 }}>
          <CartesianGrid stroke={grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar
            dataKey="count"
            name="Transactions"
            fill="#364152"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
