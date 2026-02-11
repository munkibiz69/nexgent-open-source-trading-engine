'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import type { TakeProfitLevel, TakeProfitMode, MoonBagConfig } from '@nexgent/shared';
import { getTakeProfitLevelsForMode, getMoonBagForMode } from '@nexgent/shared';

interface TakeProfitChartProps {
  mode: TakeProfitMode;
  customLevels?: TakeProfitLevel[];
  moonBag?: MoonBagConfig;
}

/**
 * Generate chart data points for take-profit visualization
 * Creates a step-style area chart showing cumulative sell % at each price level
 */
function generateTakeProfitChartData(
  levels: TakeProfitLevel[],
  moonBagConfig: MoonBagConfig
): Array<{ priceIncrease: number; cumulativeSold: number; isLevel?: boolean; levelIndex?: number }> {
  if (levels.length === 0) return [];

  const data: Array<{ priceIncrease: number; cumulativeSold: number; isLevel?: boolean; levelIndex?: number }> = [];
  
  // Start at 0% price increase with 0% sold
  data.push({ priceIncrease: 0, cumulativeSold: 0 });

  let cumulativeSold = 0;
  
  // Add points for each level (step chart style)
  levels.forEach((level, index) => {
    // Point just before the level (same cumulative as previous) - use exact level value for clean steps
    data.push({ 
      priceIncrease: level.targetPercent, 
      cumulativeSold,
    });
    
    // Add this level's sell percentage
    cumulativeSold += level.sellPercent;
    
    // Point at the level (after selling)
    data.push({ 
      priceIncrease: level.targetPercent, 
      cumulativeSold,
      isLevel: true,
      levelIndex: index + 1,
    });
  });

  // Extend the chart a bit beyond the last level
  const lastLevel = levels[levels.length - 1];
  const extension = Math.max(100, lastLevel.targetPercent * 0.25);
  data.push({ priceIncrease: lastLevel.targetPercent + extension, cumulativeSold });

  return data;
}

/**
 * Take-Profit Chart Component
 * 
 * Area chart showing cumulative sell percentage vs price increase.
 * Similar style to StopLossChart but for take-profit levels.
 */
export function TakeProfitChart({
  mode,
  customLevels = [],
  moonBag,
}: TakeProfitChartProps) {
  // Get levels based on mode
  const levels = mode === 'custom' ? customLevels : getTakeProfitLevelsForMode(mode);
  const moonBagConfig = moonBag ?? getMoonBagForMode(mode);

  if (levels.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {mode === 'custom'
            ? 'Add take-profit levels to see the chart visualization'
            : 'Generating chart...'}
        </p>
      </div>
    );
  }

  const chartData = generateTakeProfitChartData(levels, moonBagConfig);
  const totalSellPercent = levels.reduce((sum, l) => sum + l.sellPercent, 0);
  const maxY = Math.min(100, totalSellPercent + 10);
  
  // Generate clean X-axis ticks based on levels
  const xTicks = [0, ...levels.map(l => l.targetPercent)];
  const lastLevel = levels[levels.length - 1];
  const maxX = lastLevel.targetPercent + Math.max(100, lastLevel.targetPercent * 0.25);

  return (
    <div className="space-y-3">
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              left: 10,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="takeProfitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="priceIncrease"
              type="number"
              domain={[0, maxX]}
              ticks={xTicks}
              tickFormatter={(value) => `${value}%`}
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              domain={[0, maxY]}
              ticks={[0, 25, 50, 75, 100].filter(t => t <= maxY)}
              tickFormatter={(value) => `${value}%`}
              className="text-xs"
              tick={{ fontSize: 11 }}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const level = levels.find(l => l.targetPercent === data.priceIncrease);
                  
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="text-sm font-medium">
                        Price Increase: +{data.priceIncrease}%
                      </p>
                      <p className="text-sm">
                        Total Sold: {data.cumulativeSold}%
                      </p>
                      {level && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sells {level.sellPercent}% at this level
                        </p>
                      )}
                      {moonBagConfig.enabled && data.priceIncrease >= moonBagConfig.triggerPercent && (
                        <p className="text-xs text-yellow-600 mt-1 font-medium">
                          Moon bag active ({moonBagConfig.retainPercent}% retained)
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Moon bag trigger reference line */}
            {moonBagConfig.enabled && (
              <ReferenceLine
                x={moonBagConfig.triggerPercent}
                stroke="hsl(45 93% 47%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `🌙 ${moonBagConfig.retainPercent}%`,
                  position: 'top',
                  fill: 'hsl(45 93% 47%)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Reference dots at each take-profit level */}
            {levels.map((level, index) => {
              // Find the cumulative sold at this level
              let cumSold = 0;
              for (let i = 0; i <= index; i++) {
                cumSold += levels[i].sellPercent;
              }
              
              return (
                <ReferenceDot
                  key={`level-${index}`}
                  x={level.targetPercent}
                  y={cumSold}
                  r={5}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              );
            })}

            <Area
              type="stepAfter"
              dataKey="cumulativeSold"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#takeProfitGradient)"
              name="Cumulative Sold %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Take-profit levels</span>
        </div>
        {moonBagConfig.enabled && (
          <div className="flex items-center gap-2">
            <div className="w-5 border-t-2 border-dashed border-yellow-500" />
            <span>Moon bag trigger at {moonBagConfig.triggerPercent}%</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-primary/20 border border-primary/30 rounded-sm" />
          <span>Cumulative sold</span>
        </div>
      </div>
    </div>
  );
}
