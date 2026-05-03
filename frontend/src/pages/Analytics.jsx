import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ShieldAlert, Globe, Smartphone, Monitor, Tablet } from "lucide-react";

const DeviceIcon = ({ d }) => {
  if (d === "Mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (d === "Tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
};

export default function Analytics() {
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    api.get("/analytics/recent-clicks?limit=100").then(({ data }) => setClicks(data));
  }, []);

  return (
    <AppLayout>
      <div className="mb-6" data-testid="analytics-page">
        <h1 className="font-heading font-semibold text-xl sm:text-2xl tracking-tight">Click analytics</h1>
        <p className="text-sm text-zinc-500">Every click, with fraud scoring and attribution data.</p>
      </div>

      <Card className="border-zinc-200 bg-white overflow-hidden" data-testid="clicks-table">
        {clicks.length === 0 ? (
          <div className="py-16 text-center">
            <Globe className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
            <div className="font-medium">No clicks yet</div>
            <div className="text-sm text-zinc-500 mt-1">Share one of your trackable links to see clicks stream in.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-50/50">
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Country</th>
                  <th className="text-left px-4 py-3 font-medium">Device</th>
                  <th className="text-left px-4 py-3 font-medium">Browser</th>
                  <th className="text-left px-4 py-3 font-medium">Referrer</th>
                  <th className="text-left px-4 py-3 font-medium">UTM</th>
                  <th className="text-right px-4 py-3 font-medium">Fraud</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((c) => {
                  const suspicious = c.is_suspicious;
                  return (
                    <tr key={c.click_id} className="border-b border-zinc-100 hover:bg-zinc-50/60" data-testid={`click-row-${c.click_id}`}>
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : "-"}
                      </td>
                      <td className="px-4 py-3">{c.country || "Unknown"}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><DeviceIcon d={c.device} /> {c.device}</span></td>
                      <td className="px-4 py-3">{c.browser}</td>
                      <td className="px-4 py-3 max-w-[240px] truncate text-zinc-600">{c.referrer}</td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-500">{[c.utm_source, c.utm_medium].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {suspicious ? (
                          <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200" data-testid={`fraud-${c.click_id}`}>
                            <ShieldAlert className="h-3 w-3 mr-1" /> {c.fraud_score}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                            {c.fraud_score}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
