import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, checkAuth } = useAuth();
  const [poll, setPoll] = useState(null);

  useEffect(() => {
    api.get("/plans").then(({ data }) => setPlans(data));
  }, []);

  const pollStatus = useCallback(async (sid, attempts = 0) => {
    if (attempts >= 6) { setPoll({ status: "timeout" }); return; }
    try {
      const { data } = await api.get(`/payments/status/${sid}`);
      if (data.payment_status === "paid") {
        setPoll({ status: "paid", plan_id: data.plan_id });
        toast.success("Payment successful! Plan upgraded.");
        await checkAuth();
        setSearchParams({});
        return;
      }
      if (data.status === "expired") {
        setPoll({ status: "expired" });
        toast.error("Checkout session expired");
        return;
      }
      setPoll({ status: "pending" });
      setTimeout(() => pollStatus(sid, attempts + 1), 2000);
    } catch (_e) {
      setPoll({ status: "error" });
    }
  }, [checkAuth, setSearchParams]);

  useEffect(() => {
    const sid = searchParams.get("session_id");
    if (sid) { setPoll({ status: "pending" }); pollStatus(sid); }
  }, [searchParams, pollStatus]);

  const upgrade = async (plan_id) => {
    if (plan_id === "free") return;
    setLoadingPlan(plan_id);
    try {
      const { data } = await api.post("/payments/checkout", { plan_id, origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (_e) {
      toast.error("Failed to start checkout");
      setLoadingPlan(null);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6" data-testid="billing-page">
        <h1 className="font-heading font-semibold text-xl sm:text-2xl tracking-tight">Billing</h1>
        <p className="text-sm text-zinc-500">Choose the plan that fits your traffic.</p>
      </div>

      {poll?.status === "pending" && (
        <Card className="p-4 mb-6 border-blue-200 bg-blue-50 flex items-center gap-3" data-testid="payment-pending-banner">
          <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
          <div className="text-sm text-blue-900">Verifying payment…</div>
        </Card>
      )}
      {poll?.status === "paid" && (
        <Card className="p-4 mb-6 border-emerald-200 bg-emerald-50 flex items-center gap-3" data-testid="payment-success-banner">
          <Check className="h-4 w-4 text-emerald-700" />
          <div className="text-sm text-emerald-900">Payment received — your plan has been upgraded.</div>
        </Card>
      )}

      <Card className="p-5 mb-6 border-zinc-200 bg-white flex items-center justify-between" data-testid="current-plan-card">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Current plan</div>
          <div className="font-heading font-semibold text-xl mt-1 capitalize">{user?.plan || "free"}</div>
        </div>
        <div className="text-sm text-zinc-500">{user?.email}</div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const current = user?.plan === p.id;
          return (
            <Card
              key={p.id}
              className={`p-6 flex flex-col border ${p.id === "pro" ? "border-zinc-950 ring-1 ring-zinc-950 relative" : "border-zinc-200"} bg-white`}
              data-testid={`plan-${p.id}`}
            >
              {p.id === "pro" && <div className="absolute -top-3 left-6 rounded-full bg-zinc-950 text-white text-xs px-2.5 py-0.5 font-medium">Most popular</div>}
              <div className="font-heading font-medium text-lg">{p.name}</div>
              <div className="flex items-end gap-1 mt-3">
                <div className="font-heading font-bold text-4xl tracking-tight">${p.price}</div>
                <div className="text-sm text-zinc-500 mb-1">/mo</div>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-700 flex-1">
                {p.features.map((ft) => (
                  <li key={ft} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> <span>{ft}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => upgrade(p.id)}
                disabled={current || loadingPlan === p.id || p.id === "free"}
                className={`w-full mt-6 ${p.id === "pro" ? "bg-zinc-950 hover:bg-zinc-800" : "bg-white border border-zinc-300 text-zinc-950 hover:bg-zinc-50"}`}
                variant={p.id === "pro" ? "default" : "outline"}
                data-testid={`upgrade-${p.id}`}
              >
                {current ? "Current plan" : loadingPlan === p.id ? "Redirecting…" : p.price === 0 ? "Included" : "Upgrade"}
              </Button>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
