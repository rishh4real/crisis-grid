import { motion } from "framer-motion";
import { Activity, Users, Clock, Zap } from "lucide-react";

interface StatItem {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

const stats: StatItem[] = [
  { icon: Users, label: "Total Attendees", value: "12,847", color: "text-tactical-cyan" },
  { icon: Activity, label: "Active Alerts", value: "3", color: "text-alert-red" },
  { icon: Clock, label: "Avg Wait Time", value: "3.2m", color: "text-alert-amber" },
  { icon: Zap, label: "AI Uptime", value: "99.97%", color: "text-status-green" },
];

export function StatusBar() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 rounded-lg bg-surface-elevated border border-border px-4 py-3"
        >
          <stat.icon className={`w-4 h-4 ${stat.color}`} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-lg font-bold font-display ${stat.color}`}>{stat.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
