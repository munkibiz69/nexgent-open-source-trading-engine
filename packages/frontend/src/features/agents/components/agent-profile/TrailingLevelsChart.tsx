'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TrailingLevel } from '@nexgent/shared';

interface TrailingLevelsChartProps {
  levels: TrailingLevel[];
}

/**
 * Trailing Levels Chart Component
 * 
 * Visual line chart showing stop loss progression as price increases.
 */
export function TrailingLevelsChart({ levels }: TrailingLevelsChartProps) {
  // Sort levels by change (ascending for chart display)
  const sortedLevels = [...levels].sort((a, b) => a.change - b.change);

  // Transform data for chart
  const chartData = sortedLevels.map((level) => ({
    change: level.change,
    stopLoss: level.stopLoss,
    label: `${level.change}%`,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Add trailing levels to see the chart visualization
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="change"
            label={{ value: 'Price Change %', position: 'insideBottom', offset: -5 }}
            className="text-xs"
          />
          <YAxis
            label={{ value: 'Stop Loss %', angle: -90, position: 'insideLeft' }}
            className="text-xs"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-md">
                    <p className="text-sm font-medium">
                      Price Change: {data.change}%
                    </p>
                    <p className="text-sm">
                      Stop Loss: {data.stopLoss}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="stopLoss"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Stop Loss %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

