"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceArea,
} from "recharts";
import {
  Play,
  Pause,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

function generateSimulationData(seed = 12345) {
  // Seeded random for SSR consistency
  let s = seed;
  const random = () => {
    s = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    planA: 87 - i * 2.5 + random() * 5,
    planB: 87 - i * 1.2 + random() * 8,
    planC: 87 - i * 2.0 + random() * 6,
    uncertaintyUpper: 87 - i * 2.5 + 15,
    uncertaintyLower: 87 - i * 2.5 - 15,
  }));
}

export default function SimulationSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDay, setSelectedDay] = useState(30);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [simulationData, setSimulationData] = useState(() =>
    generateSimulationData(),
  );

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const triggers: ScrollTrigger[] = [];

      triggers.push(
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top 80%",
          onEnter: () => {
            gsap.fromTo(
              ".sim-title",
              { y: 60, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
            );
            gsap.fromTo(
              ".sim-panel",
              { y: 40, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: "power3.out",
                delay: 0.2,
              },
            );
          },
          once: true,
        }),
      );

      return () => {
        triggers.forEach((t) => t.kill());
      };
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const currentData = simulationData[selectedDay - 1];
  const riskTrajectory = [
    {
      label: "Plan A (Immediate)",
      value: currentData?.planA.toFixed(1) || "0",
      color: "text-emerald-400",
      trend: "down",
    },
    {
      label: "Plan B (Monitor)",
      value: currentData?.planB.toFixed(1) || "0",
      color: "text-amber-400",
      trend: "down",
    },
    {
      label: "Plan C (Overhaul)",
      value: currentData?.planC.toFixed(1) || "0",
      color: "text-blue-400",
      trend: "down",
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="simulation"
      className="relative min-h-screen w-full py-32 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="sim-title mb-16">
          <span className="font-mono text-sm text-amber-500 tracking-widest uppercase">
            Zone 03 — Simulation Core
          </span>
          <h2 className="mt-4 text-4xl md:text-6xl font-bold text-white">
            Predict outcomes before
            <span className="text-gradient"> you act</span>
          </h2>
          <p className="mt-4 max-w-2xl text-neutral-400 text-lg">
            Run Monte Carlo simulations on every intervention plan. See 30-day
            risk trajectories, cost projections, and uncertainty bands updated
            in real-time.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 sim-panel glass-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                30-Day Risk Trajectory
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowUncertainty(!showUncertainty)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    showUncertainty
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  Uncertainty Bands
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="h-[300px] w-full min-w-[300px]">
              {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={simulationData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="day"
                      stroke="#525252"
                      tick={{ fill: "#737373", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "Days",
                        position: "insideBottom",
                        fill: "#737373",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      stroke="#525252"
                      tick={{ fill: "#737373", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      label={{
                        value: "Risk Score",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#737373",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#171717",
                        border: "1px solid #404040",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                      labelStyle={{ color: "#a3a3a3" }}
                    />
                    {showUncertainty && (
                      <ReferenceArea
                        x1={0}
                        x2={30}
                        y1={30}
                        y2={70}
                        fill="#f59e0b"
                        fillOpacity={0.05}
                        stroke="none"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="planA"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Plan A"
                    />
                    <Line
                      type="monotone"
                      dataKey="planB"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Plan B"
                    />
                    <Line
                      type="monotone"
                      dataKey="planC"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Plan C"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-neutral-900/50 rounded-lg flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-800">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 rounded-full bg-emerald-500" />
                  <span className="text-sm text-neutral-400">Plan A</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 rounded-full bg-amber-500" />
                  <span className="text-sm text-neutral-400">Plan B</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 rounded-full bg-blue-500" />
                  <span className="text-sm text-neutral-400">Plan C</span>
                </div>
              </div>
              <div className="font-mono text-sm text-neutral-500">
                Day {selectedDay}/30
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="sim-panel glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-500" />
                Projected Risk
              </h3>
              <div className="space-y-3">
                {riskTrajectory.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50"
                  >
                    <span className="text-sm text-neutral-400">
                      {item.label}
                    </span>
                    <span className={`font-mono font-bold ${item.color}`}>
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sim-panel glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Cost Projection
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Intervention Cost</span>
                  <span className="font-mono text-white">$12,400</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Avoided Downtime</span>
                  <span className="font-mono text-emerald-400">$89,000</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold text-white">Net ROI</span>
                  <span className="font-mono text-2xl font-bold text-emerald-400">
                    617%
                  </span>
                </div>
              </div>
            </div>

            <div className="sim-panel glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Timeline
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-neutral-400">
                    Plan approval
                  </span>
                  <span className="ml-auto text-sm text-white">Today</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-neutral-400">
                    Parts procurement
                  </span>
                  <span className="ml-auto text-sm text-white">+2 days</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-neutral-400">
                    Maintenance window
                  </span>
                  <span className="ml-auto text-sm text-white">+5 days</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neutral-600" />
                  <span className="text-sm text-neutral-400">
                    Risk eliminated
                  </span>
                  <span className="ml-auto text-sm text-white">+6 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
