import { Shield, MessageSquare, BarChart3, Swords, LayoutDashboard, Radio } from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  id: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Crowd Safety", icon: Shield, id: "crowd-safety" },
  { label: "Queue Intel", icon: BarChart3, id: "queue-intel" },
  { label: "Event Assistant", icon: MessageSquare, id: "assistant" },
  { label: "Prompt Battle", icon: Swords, id: "prompt-battle" },
];

interface EventMindSidebarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

export function EventMindSidebar({ activeSection, onNavigate }: EventMindSidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 bg-surface-overlay border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-tactical-cyan/15 flex items-center justify-center">
            <Radio className="w-5 h-5 text-tactical-cyan" />
          </div>
          <span className="text-xl font-bold tracking-tight font-display text-tactical-cyan">
            EventMind
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground tracking-wide uppercase">
          Command Center v1.0
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-tactical-cyan/10 text-tactical-cyan"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-tactical-cyan animate-tactical-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-status-green animate-tactical-pulse" />
          <span>All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
