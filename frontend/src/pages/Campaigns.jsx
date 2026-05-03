import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Plus, FolderKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Campaigns() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    const { data } = await api.get("/projects");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/projects", form);
    toast.success("Campaign created");
    setForm({ name: "", description: "" });
    setOpen(false);
    load();
  };

  const del = async (id) => {
    if (!window.confirm("Delete campaign?")) return;
    await api.delete(`/projects/${id}`);
    load();
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6" data-testid="campaigns-page">
        <div>
          <h1 className="font-heading font-semibold text-xl sm:text-2xl tracking-tight">Campaigns</h1>
          <p className="text-sm text-zinc-500">Group links by project or campaign.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-950 hover:bg-zinc-800" data-testid="create-campaign-button"><Plus className="h-4 w-4 mr-1.5" /> New campaign</Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader><DialogTitle className="font-heading">New campaign</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="campaign-name" /></div>
              <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="campaign-description" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-zinc-950 hover:bg-zinc-800" data-testid="submit-campaign">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center border-zinc-200 bg-white">
          <FolderKanban className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
          <div className="font-medium">No campaigns yet</div>
          <div className="text-sm text-zinc-500 mt-1">Create a campaign to organize your links.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Card key={p.project_id} className="p-5 border-zinc-200 bg-white" data-testid={`campaign-${p.project_id}`}>
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-md bg-zinc-100 grid place-items-center"><FolderKanban className="h-4 w-4 text-zinc-700" /></div>
                <button onClick={() => del(p.project_id)} className="p-1 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="font-heading font-medium text-lg mt-4">{p.name}</div>
              <div className="text-sm text-zinc-500 mt-1 line-clamp-2 min-h-[40px]">{p.description || "—"}</div>
              <div className="text-xs text-zinc-400 mt-3 font-mono">{p.project_id}</div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
