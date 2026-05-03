import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { api, getShortLinkUrl } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Copy, ExternalLink, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function Links() {
  const [links, setLinks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ destination: "", title: "", project_id: "", utm_source: "", utm_medium: "", utm_campaign: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const [l, p] = await Promise.all([api.get("/links"), api.get("/projects")]);
      setLinks(l.data); setProjects(p.data);
    } catch (_e) { toast.error("Failed to load"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.destination) return;
    setCreating(true);
    try {
      const payload = { ...form };
      if (!payload.project_id) delete payload.project_id;
      await api.post("/links", payload);
      toast.success("Link created");
      setOpen(false);
      setForm({ destination: "", title: "", project_id: "", utm_source: "", utm_medium: "", utm_campaign: "" });
      load();
    } catch (_e) { toast.error("Failed to create"); } finally { setCreating(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this link?")) return;
    await api.delete(`/links/${id}`);
    toast.success("Deleted");
    load();
  };

  const copy = (code) => {
    navigator.clipboard.writeText(getShortLinkUrl(code));
    toast.success("Short link copied");
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6" data-testid="links-page">
        <div>
          <h1 className="font-heading font-semibold text-2xl tracking-tight">Links</h1>
          <p className="text-sm text-zinc-500">Shorten, track and attribute every link.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-950 hover:bg-zinc-800" data-testid="create-link-button">
              <Plus className="h-4 w-4 mr-1.5" /> New link
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">Create tracking link</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4" data-testid="create-link-form">
              <div>
                <Label>Destination URL *</Label>
                <Input data-testid="link-destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="https://example.com/landing" required />
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input data-testid="link-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Homepage CTA" />
              </div>
              <div>
                <Label>Project</Label>
                <Select value={form.project_id || "__none"} onValueChange={(v) => setForm({ ...form, project_id: v === "__none" ? "" : v })}>
                  <SelectTrigger data-testid="link-project"><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No project</SelectItem>
                    {projects.map((p) => <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>UTM Source</Label><Input data-testid="link-utm-source" value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="google" /></div>
                <div><Label>UTM Medium</Label><Input data-testid="link-utm-medium" value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="cpc" /></div>
                <div><Label>UTM Campaign</Label><Input data-testid="link-utm-campaign" value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="spring-2026" /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creating} className="bg-zinc-950 hover:bg-zinc-800" data-testid="submit-link">
                  {creating ? "Creating…" : "Create link"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden" data-testid="links-table-card">
        {links.length === 0 ? (
          <div className="py-16 text-center">
            <Link2 className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
            <div className="text-zinc-900 font-medium">No links yet</div>
            <div className="text-sm text-zinc-500 mt-1">Create your first trackable link to start measuring.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-50/50">
                <th className="text-left px-4 py-3 font-medium">Short link</th>
                <th className="text-left px-4 py-3 font-medium">Destination</th>
                <th className="text-right px-4 py-3 font-medium">Clicks</th>
                <th className="text-right px-4 py-3 font-medium">Conv.</th>
                <th className="text-right px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const rate = l.clicks ? ((l.conversions / l.clicks) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={l.link_id} className="border-b border-zinc-100 hover:bg-zinc-50/60" data-testid={`link-row-${l.link_id}`}>
                    <td className="px-4 py-3">
                      <div className="font-mono text-blue-600 font-medium">/{l.code}</div>
                      {l.title && <div className="text-xs text-zinc-500 mt-0.5">{l.title}</div>}
                    </td>
                    <td className="px-4 py-3 max-w-[360px] truncate text-zinc-700">{l.destination}</td>
                    <td className="px-4 py-3 text-right font-medium">{l.clicks}</td>
                    <td className="px-4 py-3 text-right">{l.conversions}</td>
                    <td className="px-4 py-3 text-right text-zinc-500">{rate}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => copy(l.code)} className="p-1.5 rounded hover:bg-zinc-100" data-testid={`copy-${l.code}`}><Copy className="h-4 w-4 text-zinc-500" /></button>
                        <a href={getShortLinkUrl(l.code)} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-zinc-100"><ExternalLink className="h-4 w-4 text-zinc-500" /></a>
                        <button onClick={() => del(l.link_id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" data-testid={`delete-${l.link_id}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  );
}
