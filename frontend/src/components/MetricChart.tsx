'use client';

import { HealthSnapshot } from '@/lib/types';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface MetricChartProps {
  snapshots: HealthSnapshot[];
  type?: 'latency' | 'error_rate';
  height?: number;
}

function formatTime(ts: string) {
  try {
    return format(parseISO(ts), 'HH:mm');
  } catch {
    return ts;
  }
}

/* ─── Latency Area Chart ─────────────────────────────────────────────────── */

function LatencyChart({ data, height }: { data: HealthSnapshot[]; height: number }) {
  // Defensive: If data isn't an array, convert to empty array to prevent filter error
  const safeData: HealthSnapshot[] = Array.isArray(data) ? data : [];
  const chartData = safeData
    .filter((s: HealthSnapshot) => s.is_online && s.latency_ms != null)
    .map((s: HealthSnapshot) => ({
      time: formatTime(s.checked_at),
      latency: Math.round(s.latency_ms!),
    }))
    .slice(-40);

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[#8b949e] text-sm"
        style={{ height }}
      >
        No latency data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#39d353" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#39d353" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit="ms"
        />
        <Tooltip
          contentStyle={{
            background: '#1c2128',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#e6edf3',
            fontSize: 12,
          }}
          formatter={(v: any) => [`${v} ms`, 'Latency']}
        />
        <Area
          type="monotone"
          dataKey="latency"
          stroke="#39d353"
          strokeWidth={1.5}
          fill="url(#latencyGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#39d353' }}
          animationDuration={300}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Error Rate Bar Chart ───────────────────────────────────────────────── */

function ErrorRateChart({ data, height }: { data: HealthSnapshot[]; height: number }) {
  // Bucket into groups of ~5 probes, compute success/fail per bucket
  const BUCKET = 5;
  const chartData: { time: string; errorPct: number; successPct: number }[] = [];
  for (let i = 0; i < data.length; i += BUCKET) {
    const bucket = data.slice(i, i + BUCKET);
    const fails = bucket.filter((s) => !s.is_online).length;
    const errorPct = Math.round((fails / bucket.length) * 100);
    chartData.push({
      time: formatTime(bucket[0].checked_at),
      errorPct,
      successPct: 100 - errorPct,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            background: '#1c2128',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#e6edf3',
            fontSize: 12,
          }}
          formatter={(v: any, name: any) => [
            `${v}%`,
            name === 'errorPct' ? 'Errors' : 'Success',
          ]}
        />
        <Bar dataKey="successPct" stackId="a" fill="#39d353" opacity={0.7} radius={[0, 0, 0, 0]} />
        <Bar dataKey="errorPct"   stackId="a" fill="#f85149" opacity={0.8} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Public Component ───────────────────────────────────────────────────── */

export function MetricChart({
  snapshots,
  type = 'latency',
  height = 160,
}: MetricChartProps) {
  if (type === 'error_rate') {
    return <ErrorRateChart data={snapshots} height={height} />;
  }
  return <LatencyChart data={snapshots} height={height} />;
}
