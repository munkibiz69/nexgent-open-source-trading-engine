'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { StopLossMode, TrailingLevel } from '@nexgent/shared';
import {
  generateStopLossPreviewPoints,
  getZoneForChange,
} from '@/shared/utils/stop-loss-calculator';

interface StopLossChartProps {
  mode: StopLossMode;
  customLevels?: TrailingLevel[];
  maxChange?: number;
  defaultPercentage?: number;
}

/**
 * Stop Loss Chart Component
 * 
 * Visual chart showing stop loss progression based on selected mode.
 * Adapts visualization style based on mode (step line, smooth curve, etc.)
 */
export function StopLossChart({
  mode,
  customLevels = [],
  maxChange = 300,
  defaultPercentage = -32,
}: StopLossChartProps) {
  const chartData = generateStopLossPreviewPoints(mode, maxChange, customLevels, defaultPercentage);

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {mode === 'custom'
            ? 'Add trailing levels to see the chart visualization'
            : 'Generating chart...'}
        </p>
      </div>
    );
  }

  // Determine chart type based on mode
  const isStepChart = mode === 'fixed' || mode === 'zones' || mode === 'custom';
  const chartType = isStepChart ? 'step' : 'monotone';

  // Get zone boundaries for zones mode
  const zoneBoundaries =
    mode === 'zones' ? [0, 25, 50, 100, 200].filter((b) => b <= maxChange) : [];

  // Calculate Y-axis domain and ticks based on data
  const stopLossValues = chartData.map(d => d.stopLoss);
  const minY = Math.floor(Math.min(...stopLossValues) / 50) * 50;
  const maxY = Math.ceil(Math.max(...stopLossValues) / 50) * 50;
  
  // Generate sensible ticks
  const yTicks: number[] = [];
  for (let i = minY; i <= maxY; i += 50) {
    yTicks.push(i);
  }
  // Ensure we have at least a few ticks
  if (yTicks.length < 3) {
    const step = Math.ceil((maxY - minY) / 4 / 10) * 10;
    yTicks.length = 0;
    for (let i = minY; i <= maxY; i += step) {
      yTicks.push(i);
    }
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 10,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="change"
            type="number"
            domain={[0, maxChange]}
            tickFormatter={(value) => `${value}%`}
            className="text-xs"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[minY, maxY]}
            ticks={yTicks}
            tickFormatter={(value) => `${value}%`}
            className="text-xs"
            tick={{ fontSize: 11 }}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                let extraInfo = '';
                
                if (mode === 'zones') {
                  const zoneInfo = getZoneForChange(data.change);
                  extraInfo = ` (${zoneInfo.description})`;
                }
                
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-md">
                    <p className="text-sm font-medium">
                      Price Increase: {data.change.toFixed(1)}%
                    </p>
                    <p className="text-sm">
                      Stop Loss: {data.stopLoss.toFixed(1)}%{extraInfo}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Zone boundary reference lines for zones mode */}
          {mode === 'zones' &&
            zoneBoundaries.map((boundary, index) => (
              <ReferenceLine
                key={`zone-${boundary}`}
                x={boundary}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
                label={{
                  value: index > 0 ? `Zone ${index}` : '',
                  position: 'top',
                  className: 'text-xs fill-muted-foreground',
                }}
              />
            ))}
          <Line
            type={chartType}
            dataKey="stopLoss"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={
              mode === 'custom'
                ? { fill: 'hsl(var(--primary))', r: 4 }
                : false
            }
            activeDot={{ r: 6 }}
            name="Stop Loss %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

