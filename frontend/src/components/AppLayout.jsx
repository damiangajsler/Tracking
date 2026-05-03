import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Link2, FolderKanban, Target, BarChart3, CreditCard, LogOut, Settings2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/links", label: "Links", icon: Link2, testid: "nav-links" },
  { to: "/campaigns", label: "Campaigns", icon: FolderKanban, testid: "nav-campaigns" },
  { to: "/goals", label: "Goals", icon: Target, testid: "nav-goals" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
  { to: "/billing", label: "Billing", icon: CreditCard, testid: "nav-billing" },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || user?.email || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="app-layout">
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-zinc-200 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-zinc-200">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2" data-testid="sidebar-logo">
            <div className="w-7 h-7 rounded-md bg-zinc-950 text-white grid place-items-center font-heading font-bold text-sm">L</div>
            <span className="font-heading font-semibold tracking-tight">Linkly</span>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? "bg-zinc-100 text-zinc-950 font-medium" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`
              }
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="text-xs bg-zinc-100">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-xs text-zinc-500 truncate capitalize">{user?.plan || "free"} plan</div>
            </div>
            <button onClick={logout} className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500" data-testid="logout-button" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="ml-60 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
