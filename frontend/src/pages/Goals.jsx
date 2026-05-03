import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Goals() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", value: "0" });

  const load = async () => {
    const { data } = await api.get("/goals");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/goals", { ...form, value: parseFloat(form.value || "0") });
    toast.success("Goal created");
    setOpen(false);
    setForm({ name: "", value: "0" });
    load();
  };

  const del = async (id) => {
    if (!window.confirm("Delete goal?")) return;
    await api.delete(`/goals/${id}`);
    load();
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6" data-testid="goals-page">
        <div>
          <h1 className="font-heading font-semibold text-2xl tracking-tight">Conversion goals</h1>
          <p className="text-sm text-zinc-500">Define what counts as success, then fire our pixel to track it.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-950 hover:bg-zinc-800" data-testid="create-goal-button"><Plus className="h-4 w-4 mr-1.5" /> New goal</Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader><DialogTitle className="font-heading">New goal</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div><Label>Goal name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="goal-name" placeholder="Signup" /></div>
              <div><Label>Default goal value ($)</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} data-testid="goal-value" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-zinc-950 hover:bg-zinc-800" data-testid="submit-goal">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center border-zinc-200 bg-white">
          <Target className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
          <div className="font-medium">No goals yet</div>
          <div className="text-sm text-zinc-500 mt-1">Add a goal to start tracking conversions.</div>
        </Card>
      ) : (
        <Card className="border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-50/50">
                <th className="text-left px-4 py-3 font-medium">Goal</th>
                <th className="text-right px-4 py-3 font-medium">Value</th>
                <th className="text-right px-4 py-3 font-medium">Conversions</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.goal_id} className="border-b border-zinc-100" data-testid={`goal-row-${g.goal_id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-zinc-400 font-mono mt-0.5">{g.goal_id}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">${g.value?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{g.conversions}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(g.goal_id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="p-6 mt-6 border-zinc-200 bg-white" data-testid="pixel-snippet">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Tracking snippet</div>
        <div className="font-heading font-medium text-lg mt-0.5">Fire a conversion</div>
        <p className="text-sm text-zinc-600 mt-2">Call this on your thank-you page. The <code className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">lk_click</code> param is automatically appended to every destination.</p>
        <pre className="mt-4 bg-zinc-950 text-zinc-100 rounded-lg p-4 text-xs overflow-x-auto font-mono">{`const params = new URLSearchParams(window.location.search);
fetch("${process.env.REACT_APP_BACKEND_URL}/api/track/conversion", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    click_id: params.get("lk_click"),
    goal_id: "YOUR_GOAL_ID",
    value: 29.00
  })
});`}</pre>
      </Card>
    </AppLayout>
  );
}
