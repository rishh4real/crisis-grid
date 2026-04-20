import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accentColor: "cyan" | "red" | "green" | "amber";
  metric: string;
  metricLabel: string;
  status: "Active" | "Idle" | "Standby" | "Alert";
  progress: number; // 0-100
  onClick?: () => void;
}

const colorMap = {
  cyan: {
    bg: "bg-tactical-cyan/10",
    text: "text-tactical-cyan",
    glow: "glow-cyan",
    bar: "bg-tactical-cyan",
  },
  red: {
    bg: "bg-alert-red/10",
    text: "text-alert-red",
    glow: "glow-red",
    bar: "bg-alert-red",
  },
  green: {
    bg: "bg-status-green/10",
    text: "text-status-green",
    glow: "glow-green",
    bar: "bg-status-green",
  },
  amber: {
    bg: "bg-alert-amber/10",
    text: "text-alert-amber",
    glow: "glow-amber",
    bar: "bg-alert-amber",
  },
};

const statusColor = {
  Active: "bg-status-green",
  Idle: "bg-tactical-cyan-dim",
  Standby: "bg-alert-amber",
  Alert: "bg-alert-red",
};

export function ModuleCard({
  title,
  description,
  icon: Icon,
  accentColor,
  metric,
  metricLabel,
  status,
  progress,
  onClick,
}: ModuleCardProps) {
  const colors = colorMap[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`group relative rounded-xl bg-card border border-border p-6 cursor-pointer transition-shadow duration-300 hover:${colors.glow}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusColor[status]} ${status === "Active" || status === "Alert" ? "animate-tactical-pulse" : ""}`}
              />
              <span className="text-xs text-muted-foreground">{status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>

      {/* Metric */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-2xl font-bold ${colors.text} font-display`}>{metric}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {metricLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          className={`h-full ${colors.bar} rounded-full`}
        />
      </div>

      {/* Hover arrow */}
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={`text-sm ${colors.text}`}>→</span>
      </div>
    </motion.div>
  );
}
