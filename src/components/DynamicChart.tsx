import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function DynamicChart({ spec }: { spec: ChartSpec }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{spec.title}</CardTitle>
        {spec.description && <CardDescription>{spec.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(spec)}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function renderChart(spec: ChartSpec) {
  const tickStyle = { fontSize: 11, fill: "var(--color-muted-foreground)" };

  if (spec.type === "pie") {
    return (
      <PieChart>
        <Pie
          data={spec.data}
          dataKey="value"
          nameKey="name"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={2}
        >
          {spec.data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    );
  }

  if (spec.type === "line") {
    return (
      <LineChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={spec.xKey} tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {spec.yKeys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    );
  }

  if (spec.type === "area") {
    return (
      <AreaChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={spec.xKey} tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {spec.yKeys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.2}
          />
        ))}
      </AreaChart>
    );
  }

  if (spec.type === "scatter") {
    return (
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={spec.xKey} tick={tickStyle} />
        <YAxis dataKey={spec.yKeys[0]} tick={tickStyle} />
        <Tooltip />
        <Scatter data={spec.data} fill={COLORS[0]} />
      </ScatterChart>
    );
  }

  // bar (default)
  return (
    <BarChart data={spec.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
      <XAxis dataKey={spec.xKey} tick={tickStyle} />
      <YAxis tick={tickStyle} />
      <Tooltip />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {spec.yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
      ))}
    </BarChart>
  );
}
