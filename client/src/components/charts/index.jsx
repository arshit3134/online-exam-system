import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const COLORS = { brand: '#8B5CF6', brand2: '#6366F1', ok: '#22C55E', bad: '#EF4444', warn: '#F59E0B', grid: '#27272A', text: '#A1A1AA' };

const axis = { stroke: COLORS.grid, tick: { fill: COLORS.text, fontSize: 11 }, tickLine: false };

const TooltipBox = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-card/95 backdrop-blur px-3 py-2 text-xs shadow-card">
      {label !== undefined && <p className="font-medium text-fg mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-mute">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {p.name}: <span className="text-fg font-semibold tabular-nums">{p.value}{suffix}</span>
        </p>
      ))}
    </div>
  );
};

const short = (s, n = 14) => (s?.length > n ? `${s.slice(0, n - 1)}…` : s);

export const NoData = ({ text = 'No attempt data yet' }) => (
  <div className="h-full min-h-[200px] grid place-items-center text-sm text-dim">{text}</div>
);

export function AvgMarksChart({ data }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="title" {...axis} tickFormatter={(v) => short(v, 12)} />
        <YAxis {...axis} domain={[0, 100]} unit="%" />
        <Tooltip content={<TooltipBox suffix="%" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="averagePercentage" name="Average score" fill={COLORS.brand} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PassFailChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <NoData />;
  const fills = [COLORS.ok, COLORS.bad];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={96} paddingAngle={3} stroke="none">
            {data.map((d, i) => <Cell key={d.name} fill={fills[i]} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: COLORS.text }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 pb-8 grid place-items-center pointer-events-none">
        <div className="text-center"><p className="text-2xl font-bold tabular-nums">{Math.round((data[0].value / total) * 100)}%</p><p className="text-[11px] text-dim">pass rate</p></div>
      </div>
    </div>
  );
}

export function ScoreDistributionChart({ data }) {
  if (!data.some((d) => d.count)) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="range" {...axis} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" name="Attempts" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((d, i) => <Cell key={d.range} fill={i < 4 ? COLORS.bad : i < 6 ? COLORS.warn : COLORS.brand} fillOpacity={0.9} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StudentPerformanceChart({ data }) {
  if (!data.some((d) => d.students)) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" {...axis} allowDecimals={false} />
        <YAxis type="category" dataKey="band" {...axis} width={72} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="students" name="Students" fill={COLORS.brand2} radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExamWiseChart({ data }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="title" {...axis} tickFormatter={(v) => short(v, 12)} />
        <YAxis yAxisId="l" {...axis} allowDecimals={false} />
        <YAxis yAxisId="r" orientation="right" {...axis} domain={[0, 100]} unit="%" />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: COLORS.text }} />
        <Bar yAxisId="l" dataKey="attempts" name="Attempts" fill={COLORS.brand2} radius={[6, 6, 0, 0]} maxBarSize={36} />
        <Line yAxisId="r" type="monotone" dataKey="passRate" name="Pass rate %" stroke={COLORS.ok} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.ok }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ResultDonut({ correct, incorrect, unanswered }) {
  const data = [
    { name: 'Correct', value: correct, fill: COLORS.ok },
    { name: 'Incorrect', value: incorrect, fill: COLORS.bad },
    { name: 'Unanswered', value: unanswered, fill: '#52525B' },
  ].filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={data.length > 1 ? 3 : 0} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Pie>
        <Tooltip content={<TooltipBox />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
