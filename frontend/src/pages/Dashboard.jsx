import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Sparkles, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart, Legend, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const fmt = (n) => (n ?? 0).toLocaleString();
const fmtMoney = (n) => "$" + (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KpiTile = ({ label, value, sub, trend }) => (
  <Card className="p-4 sm:p-5 border-zinc-200 shadow-sm rounded-lg bg-white min-w-0" data-testid={`kpi-${label.replace(/\s+/g, "-").toLowerCase()}`}>
    <div className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-zinc-500 truncate">{label}</div>
    <div className="font-heading text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-950 mt-1.5 truncate">{value}</div>
    {sub && (
      <div className={`text-xs mt-1.5 flex items-center gap-1 ${trend === "down" ? "text-red-600" : "text-emerald-600"}`}>
        {trend === "down" ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />} {sub}
      </div>
    )}
  </Card>
);

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [seeding, setSeeding] = useState(false);

  const load = async (d = days) => {
    try {
      const { data } = await api.get(`/analytics/overview?days=${d}`);
      setData(data);
    } catch (_e) {
      toast.error("Failed to load analytics");
    }
  };

  useEffect(() => { load(days); /* eslint-disable-next-line */ }, [days]);

  const seed = async () => {
    setSeeding(true);
    try {
      await api.post("/seed-demo");
      toast.success("Demo data added");
      await load(days);
    } catch (_e) {
      toast.error("Failed to seed");
    } finally { setSeeding(false); }
  };

  const k = data?.kpis;
  const hasData = k && k.visits > 0;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6" data-testid="dashboard-page">
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-xl sm:text-2xl tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">An overview of your traffic and conversions.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[140px] bg-white" data-testid="date-range-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7" data-testid="range-7">Last 7 days</SelectItem>
              <SelectItem value="30" data-testid="range-30">Last 30 days</SelectItem>
              <SelectItem value="90" data-testid="range-90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={seed} disabled={seeding} variant="outline" className="border-zinc-300" data-testid="seed-demo-button">
            <Sparkles className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">{seeding ? "Seeding…" : "Add demo data"}</span><span className="sm:hidden">{seeding ? "…" : "Demo"}</span>
          </Button>
        </div>
      </div>

      {/* KPIs row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <KpiTile label="People" value={fmt(k?.people)} />
        <KpiTile label="Visits" value={fmt(k?.visits)} />
        <KpiTile label="Conversions" value={fmt(k?.conversions)} />
        <KpiTile label="Conv. Rate" value={`${k?.conversion_rate ?? 0}%`} />
        <KpiTile label="Revenue" value={fmtMoney(k?.revenue)} />
      </div>
      {/* KPIs row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <KpiTile label="Cost" value={fmtMoney(k?.cost)} />
        <KpiTile label="CPA" value={fmtMoney(k?.cpa)} />
        <KpiTile label="CPC" value={fmtMoney(k?.cpc)} />
        <KpiTile label="Avg Goal Value" value={fmtMoney(k?.avg_goal_value)} />
        <Card className="p-4 sm:p-5 border-zinc-200 shadow-sm bg-white min-w-0" data-testid="kpi-fraud">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Fraud</div>
          <div className="font-heading text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-950 mt-1.5">{fmt(k?.suspicious_clicks)}</div>
          <div className="text-xs text-zinc-500 mt-1.5">{fmt(k?.clean_clicks)} clean clicks</div>
        </Card>
      </div>

      {/* Main chart */}
      <Card className="p-4 sm:p-6 border-zinc-200 shadow-sm bg-white mb-6" data-testid="traffic-chart">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Traffic report</div>
            <div className="font-heading text-lg font-medium mt-0.5">Visits & conversions</div>
          </div>
          <div className="flex gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600 rounded-full" /> Visits</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded-full" /> Conversions</span>
          </div>
        </div>
        <div className="h-[260px] sm:h-[320px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" orientation="right" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                />
                <Line yAxisId="l" type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={false} />
                <Line yAxisId="r" type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState onSeed={seed} seeding={seeding} />
          )}
        </div>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-zinc-200 shadow-sm bg-white" data-testid="countries-chart">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-4">Top countries</div>
          <div className="h-[220px]">
            {(data?.by_country?.length || 0) > 0 ? (
              <ResponsiveContainer>
                <BarChart data={data.by_country} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{ fill: "#f4f4f5" }} contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e4e4e7" }} />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyMini />}
          </div>
        </Card>

        <Card className="p-6 border-zinc-200 shadow-sm bg-white" data-testid="devices-chart">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-4">Devices</div>
          <div className="h-[220px]">
            {(data?.by_device?.length || 0) > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.by_device} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} stroke="none" activeShape={null}>
                    {data.by_device.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e4e4e7" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyMini />}
          </div>
        </Card>

        <Card className="p-6 border-zinc-200 shadow-sm bg-white" data-testid="referrers-chart">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-4">Top referrers</div>
          <div className="space-y-2.5">
            {(data?.by_referrer?.length || 0) > 0 ? data.by_referrer.slice(0, 6).map((r) => {
              const max = data.by_referrer[0].value || 1;
              return (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="truncate max-w-[70%] text-zinc-700">{r.name}</span>
                    <span className="font-mono text-zinc-900">{r.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${(r.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            }) : <div className="text-sm text-zinc-400 text-center pt-8">No referrer data</div>}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

const EmptyState = ({ onSeed, seeding }) => (
  <div className="h-full grid place-items-center">
    <div className="text-center max-w-sm">
      <div className="text-sm text-zinc-500 mb-3">No traffic yet.</div>
      <div className="text-xs text-zinc-400 mb-4">Create a link or add demo data to see your dashboard light up.</div>
      <Button onClick={onSeed} disabled={seeding} className="bg-zinc-950 hover:bg-zinc-800" data-testid="empty-seed-button">
        <Sparkles className="h-4 w-4 mr-1.5" /> {seeding ? "Seeding…" : "Add demo data"}
      </Button>
    </div>
  </div>
);
const EmptyMini = () => <div className="h-full grid place-items-center text-sm text-zinc-400">No data</div>;
