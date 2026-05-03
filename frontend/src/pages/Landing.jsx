import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, Link2, BarChart3, Target, ShieldCheck, Globe2, Zap, Check } from "lucide-react";

const features = [
  { icon: Link2, title: "Smart link tracking", desc: "Generate trackable short links with auto-appended UTMs. Every click is captured with device, country and referrer." },
  { icon: BarChart3, title: "Clean, crisp charts", desc: "Combo charts for visits vs. conversions. KPI tiles for visits, people, revenue, CPA and more — no clutter." },
  { icon: Target, title: "Conversion goals", desc: "Define goals, drop a pixel, and attribute revenue back to the exact click and campaign." },
  { icon: ShieldCheck, title: "Fraud detection", desc: "Score every click in real time. Filter bots, crawlers and repeat offenders from your real traffic." },
  { icon: Globe2, title: "Geography & device", desc: "See traffic by country, device, browser and OS — all out of the box, no setup." },
  { icon: Zap, title: "Built for speed", desc: "302 redirects in milliseconds. Your users never wait." },
];

const plans = [
  { id: "free", name: "Free", price: 0, desc: "For kicking the tires", features: ["100 clicks / mo", "1 campaign", "Basic analytics"] },
  { id: "starter", name: "Starter", price: 29, desc: "For indie marketers", features: ["10,000 clicks / mo", "5 campaigns", "Conversion goals", "Email support"] },
  { id: "pro", name: "Pro", price: 79, popular: true, desc: "For growing teams", features: ["100,000 clicks / mo", "Unlimited campaigns", "Fraud detection", "Priority support", "API access"] },
  { id: "business", name: "Business", price: 179, desc: "For serious operators", features: ["1,000,000 clicks / mo", "Team seats", "Custom domains", "Dedicated support"] },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-zinc-900" data-testid="landing-page">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-8 h-8 rounded-md bg-zinc-950 text-white grid place-items-center font-heading font-bold">L</div>
            <span className="font-heading font-semibold text-lg tracking-tight">Linkly</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-600">
            <a href="#features" className="hover:text-zinc-900" data-testid="nav-features">Features</a>
            <a href="#pricing" className="hover:text-zinc-900" data-testid="nav-pricing">Pricing</a>
            <Link to="/login" className="hover:text-zinc-900" data-testid="nav-signin">Sign in</Link>
          </nav>
          <Link to="/login" data-testid="nav-get-started">
            <Button className="bg-zinc-950 hover:bg-zinc-800 rounded-md">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 mb-6 animate-fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> New · Fraud score on every click
            </div>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-zinc-950 animate-fade-up">
              Tracking links and conversions,<br />
              <span className="text-zinc-500">finally</span> easy to read.
            </h1>
            <p className="mt-6 text-lg text-zinc-600 leading-relaxed max-w-2xl animate-fade-up" style={{ animationDelay: "80ms" }}>
              Linkly shortens your links, watches every click, and attributes every conversion back to the exact campaign — with clean charts you'll actually want to share in the standup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
              <Link to="/login" data-testid="hero-cta-primary">
                <Button size="lg" className="bg-zinc-950 hover:bg-zinc-800 h-11 px-6">
                  Start for free <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing" data-testid="hero-cta-pricing">
                <Button size="lg" variant="outline" className="h-11 px-6 border-zinc-300">See pricing</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-zinc-500">No credit card required · 100 free clicks every month</p>
          </div>

          {/* Dashboard preview */}
          <div className="mt-16 relative rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5 overflow-hidden animate-fade-up" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
              <div className="ml-3 text-xs text-zinc-500 font-mono">app.linkly.io/dashboard</div>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l: "People", v: "15,257" }, { l: "Visits", v: "33,025" }, { l: "Conversions", v: "719" }, { l: "Conv. Rate", v: "4.1%" }, { l: "Revenue", v: "$41,452" },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-zinc-200 p-4 bg-white">
                  <div className="text-xs uppercase tracking-[0.15em] text-zinc-500">{k.l}</div>
                  <div className="font-heading font-semibold text-2xl mt-1 text-zinc-950">{k.v}</div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="h-56 rounded-lg border border-zinc-200 bg-white p-4">
                <svg viewBox="0 0 600 180" className="w-full h-full" preserveAspectRatio="none">
                  {/* horizontal grid */}
                  {[0.2, 0.4, 0.6, 0.8].map((p) => (
                    <line key={p} x1="0" x2="600" y1={180 * p} y2={180 * p} stroke="#e4e4e7" strokeWidth="1" strokeDasharray="3 3" />
                  ))}
                  {/* visits area */}
                  <path
                    d="M0,120 L20,90 L40,110 L60,70 L80,85 L100,55 L120,75 L140,40 L160,65 L180,30 L200,55 L220,45 L240,70 L260,35 L280,60 L300,25 L320,50 L340,40 L360,65 L380,30 L400,55 L420,20 L440,45 L460,35 L480,60 L500,40 L520,55 L540,25 L560,50 L580,35 L600,55 L600,180 L0,180 Z"
                    fill="#2563eb" fillOpacity="0.08"
                  />
                  {/* visits line */}
                  <path
                    d="M0,120 L20,90 L40,110 L60,70 L80,85 L100,55 L120,75 L140,40 L160,65 L180,30 L200,55 L220,45 L240,70 L260,35 L280,60 L300,25 L320,50 L340,40 L360,65 L380,30 L400,55 L420,20 L440,45 L460,35 L480,60 L500,40 L520,55 L540,25 L560,50 L580,35 L600,55"
                    fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {/* conversions line */}
                  <path
                    d="M0,150 L20,140 L40,145 L60,130 L80,135 L100,120 L120,128 L140,110 L160,118 L180,100 L200,108 L220,115 L240,125 L260,108 L280,115 L300,95 L320,105 L340,110 L360,120 L380,100 L400,108 L420,90 L440,100 L460,105 L480,115 L500,108 L520,118 L540,98 L560,110 L580,103 L600,112"
                    fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600 rounded-full" /> Visits</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded-full" /> Conversions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-200 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Everything you need</div>
            <h2 className="font-heading font-semibold text-3xl lg:text-4xl tracking-tight mt-3">
              A complete toolkit for link & conversion tracking
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border border-zinc-200 bg-white p-6 hover:border-zinc-300 transition-colors" data-testid={`feature-${f.title.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="w-10 h-10 rounded-md bg-zinc-950 text-white grid place-items-center">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading font-medium text-lg mt-4">{f.title}</h3>
                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Pricing</div>
            <h2 className="font-heading font-semibold text-3xl lg:text-4xl tracking-tight mt-3">Pay for the traffic you track</h2>
            <p className="text-zinc-600 mt-3">Start free. Upgrade the minute you need more. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-6 bg-white flex flex-col ${p.popular ? "border-zinc-950 ring-1 ring-zinc-950 relative" : "border-zinc-200"}`}
                data-testid={`pricing-card-${p.id}`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-6 rounded-full bg-zinc-950 text-white text-xs px-2.5 py-0.5 font-medium">Most popular</div>
                )}
                <div className="font-heading font-medium text-lg">{p.name}</div>
                <div className="text-sm text-zinc-500">{p.desc}</div>
                <div className="mt-5 flex items-end gap-1">
                  <div className="font-heading font-bold text-4xl tracking-tight">${p.price}</div>
                  <div className="text-sm text-zinc-500 mb-1">/mo</div>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-zinc-700 flex-1">
                  {p.features.map((ft) => (
                    <li key={ft} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{ft}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login" className="mt-6 block" data-testid={`pricing-cta-${p.id}`}>
                  <Button
                    className={`w-full ${p.popular ? "bg-zinc-950 hover:bg-zinc-800 text-white" : "bg-white text-zinc-950 border border-zinc-300 hover:bg-zinc-50"}`}
                    variant={p.popular ? "default" : "outline"}
                  >
                    {p.price === 0 ? "Start free" : "Choose plan"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200 bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 text-center">
          <h2 className="font-heading font-semibold text-3xl lg:text-5xl tracking-tight">Know which links actually pay.</h2>
          <p className="text-zinc-400 mt-4 max-w-xl mx-auto">Get your first trackable link in under 60 seconds.</p>
          <Link to="/login" className="inline-block mt-8" data-testid="footer-cta">
            <Button size="lg" className="bg-white text-zinc-950 hover:bg-zinc-100 h-11 px-6">
              Sign in with Google <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-sm text-zinc-500 flex items-center justify-between">
          <span>© 2026 Linkly</span>
          <span>Built on Emergent</span>
        </div>
      </footer>
    </div>
  );
}
