"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Shield, Activity } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface RiskAsset {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  status: "critical" | "warning" | "healthy";
  lastMaintenance: string;
  predictedFailure: string | null;
}

const mockAssets: RiskAsset[] = [
  { id: "HVAC-001", name: "Main Chiller Unit A", type: "HVAC", riskScore: 87, status: "critical", lastMaintenance: "2025-11-15", predictedFailure: "2026-04-12" },
  { id: "GEN-002", name: "Backup Generator 2", type: "Power", riskScore: 72, status: "warning", lastMaintenance: "2025-12-01", predictedFailure: "2026-05-20" },
  { id: "PUMP-003", name: "Cooling Pump B", type: "Fluid", riskScore: 34, status: "healthy", lastMaintenance: "2026-01-10", predictedFailure: null },
  { id: "COMP-004", name: "Air Compressor 1", type: "Pneumatic", riskScore: 56, status: "warning", lastMaintenance: "2025-10-20", predictedFailure: "2026-07-01" },
  { id: "CONV-005", name: "Assembly Line C", type: "Production", riskScore: 23, status: "healthy", lastMaintenance: "2026-02-05", predictedFailure: null },
];

export default function FleetSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedAsset, setSelectedAsset] = useState<RiskAsset | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const triggers: ScrollTrigger[] = [];
      
      triggers.push(
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top 80%",
          onEnter: () => {
            gsap.fromTo(
              ".fleet-title",
              { y: 60, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
            );
            gsap.fromTo(
              ".fleet-card",
              { y: 40, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 }
            );
          },
          once: true,
        })
      );

      return () => {
        triggers.forEach(t => t.kill());
      };
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const getStatusColor = (status: RiskAsset["status"]) => {
    switch (status) {
      case "critical": return "bg-red-500/20 border-red-500/50 text-red-400";
      case "warning": return "bg-amber-500/20 border-amber-500/50 text-amber-400";
      case "healthy": return "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
    }
  };

  const getStatusIcon = (status: RiskAsset["status"]) => {
    switch (status) {
      case "critical": return <AlertTriangle className="w-4 h-4" />;
      case "warning": return <Clock className="w-4 h-4" />;
      case "healthy": return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <section
      ref={sectionRef}
      id="fleet"
      className="relative min-h-screen w-full py-32 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="fleet-title mb-16">
          <span className="font-mono text-sm text-amber-500 tracking-widest uppercase">
            Zone 01 — Fleet Command
          </span>
          <h2 className="mt-4 text-4xl md:text-6xl font-bold text-white">
            Risk visibility across
            <span className="text-gradient"> every asset</span>
          </h2>
          <p className="mt-4 max-w-2xl text-neutral-400 text-lg">
            Real-time fleet health monitoring with AI-predicted failure windows.
            Prioritize interventions by risk score and business impact.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500" />
                  Risk Heatmap
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Critical
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Warning
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Healthy
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`fleet-card text-left p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                      selectedAsset?.id === asset.id
                        ? "border-amber-500 bg-amber-500/10"
                        : getStatusColor(asset.status)
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs opacity-70">{asset.id}</span>
                        <h4 className="font-semibold">{asset.name}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(asset.status)}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Risk Score</span>
                        <span className="font-mono font-bold">{asset.riskScore}%</span>
                      </div>
                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            asset.riskScore > 70 ? "bg-red-500" : asset.riskScore > 40 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${asset.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Fleet Metrics
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="text-3xl font-bold text-red-400">12</div>
                  <div className="text-sm text-neutral-400">Assets at Risk</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-3xl font-bold text-amber-400">48h</div>
                  <div className="text-sm text-neutral-400">Avg. Response Time</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-3xl font-bold text-emerald-400">94%</div>
                  <div className="text-sm text-neutral-400">Prediction Accuracy</div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Impact Summary
              </h3>
              <p className="text-neutral-400 text-sm">
                Projected downtime avoided this quarter through predictive interventions:
              </p>
              <div className="mt-4 text-4xl font-bold text-gradient">
                1,247 hours
              </div>
              <div className="text-sm text-neutral-500 mt-1">
                Estimated value: $4.2M
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
