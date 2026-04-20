import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, MessageSquare, BarChart3, Swords, Bell, Settings } from "lucide-react";
import { EventMindSidebar } from "@/components/EventMindSidebar";
import { ModuleCard } from "@/components/ModuleCard";
import { StatusBar } from "@/components/StatusBar";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <EventMindSidebar activeSection={activeSection} onNavigate={setActiveSection} />

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface-overlay/50">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Dashboard Overview
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-status-green/15 text-status-green text-xs font-medium">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-tactical-cyan/15 flex items-center justify-center text-tactical-cyan text-sm font-bold">
              EM
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Status bar */}
          <StatusBar />

          {/* Module cards */}
          <div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4"
            >
              Active Modules
            </motion.h2>
            <div className="grid grid-cols-2 gap-5">
              <ModuleCard
                title="Crowd Safety Analyzer"
                description="Real-time analysis of crowd density, movement patterns, and anomaly detection across all event zones."
                icon={Shield}
                accentColor="red"
                metric="72"
                metricLabel="Severity Index"
                status="Alert"
                progress={72}
              />
              <ModuleCard
                title="Queue Intelligence"
                description="Optimize entry and exit points with predictive analytics on queue lengths and wait time forecasting."
                icon={BarChart3}
                accentColor="cyan"
                metric="3.2"
                metricLabel="Avg Wait (Min)"
                status="Active"
                progress={32}
              />
              <ModuleCard
                title="Event Assistant"
                description="AI-powered Jarvis mode for attendee support — navigation, safety info, and real-time event data."
                icon={MessageSquare}
                accentColor="green"
                metric="98.5%"
                metricLabel="Response Rate"
                status="Active"
                progress={98}
              />
              <ModuleCard
                title="Prompt Battle Judge"
                description="Score attendee-submitted prompts on creativity, clarity, and impact. Declare winners in real-time."
                icon={Swords}
                accentColor="amber"
                metric="0"
                metricLabel="Active Battles"
                status="Standby"
                progress={0}
              />
            </div>
          </div>

          {/* Live feed */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Recent Alerts
            </h2>
            <div className="space-y-2">
              {[
                {
                  time: "14:32:08",
                  msg: "Section B density exceeding 80% threshold",
                  level: "warning",
                },
                {
                  time: "14:28:45",
                  msg: "Gate 3 queue redistributed — wait time reduced by 40%",
                  level: "info",
                },
                { time: "14:25:12", msg: "Medical team dispatched to Zone A-4", level: "critical" },
                {
                  time: "14:20:00",
                  msg: "Prompt Battle Round 3 completed — 847 votes cast",
                  level: "info",
                },
              ].map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-4 rounded-lg bg-surface-elevated border border-border px-4 py-3"
                >
                  <span className="text-xs text-muted-foreground font-mono">{alert.time}</span>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      alert.level === "critical"
                        ? "bg-alert-red animate-tactical-pulse"
                        : alert.level === "warning"
                          ? "bg-alert-amber"
                          : "bg-tactical-cyan-dim"
                    }`}
                  />
                  <span className="text-sm text-foreground">{alert.msg}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
