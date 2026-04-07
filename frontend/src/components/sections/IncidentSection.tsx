"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Search, Target, Lightbulb, ChevronRight, AlertCircle } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface Hypothesis {
  id: string;
  title: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
}

const mockHypothesis: Hypothesis = {
  id: "H-2847",
  title: "Bearing wear pattern indicates imminent failure",
  confidence: 89,
  evidence: [
    "Vibration frequency shifted to 120Hz harmonic",
    "Temperature rise of 8°C over 72 hours",
    "Oil analysis shows metallic particle increase",
    "Acoustic signature matches bearing distress pattern"
  ],
  recommendation: "Schedule replacement within 48 hours. Parts available in inventory.",
};

const candidatePlans = [
  {
    id: "A",
    name: "Immediate Replacement",
    riskReduction: 95,
    cost: "$12,400",
    downtime: "4 hours",
    confidence: 92,
  },
  {
    id: "B",
    name: "Monitored Operation",
    riskReduction: 45,
    cost: "$2,100",
    downtime: "0 hours",
    confidence: 67,
  },
  {
    id: "C",
    name: "Preventive Overhaul",
    riskReduction: 78,
    cost: "$8,900",
    downtime: "2 hours",
    confidence: 84,
  },
];

export default function IncidentSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedPlan, setSelectedPlan] = useState("A");

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
              ".incident-title",
              { y: 60, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
            );
            gsap.fromTo(
              ".incident-panel",
              { y: 40, opacity: 0, scale: 0.95 },
              { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 }
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

  return (
    <section
      ref={sectionRef}
      id="incident"
      className="relative min-h-screen w-full py-32 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="incident-title mb-16">
          <span className="font-mono text-sm text-amber-500 tracking-widest uppercase">
            Zone 02 — Incident Lab
          </span>
          <h2 className="mt-4 text-4xl md:text-6xl font-bold text-white">
            AI-powered root cause
            <span className="text-gradient"> analysis</span>
          </h2>
          <p className="mt-4 max-w-2xl text-neutral-400 text-lg">
            Every incident is automatically analyzed. The AI presents hypotheses ranked by confidence,
            with full evidence chains and recommended action plans.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="incident-panel glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <span className="font-mono text-xs text-neutral-500">INCIDENT #{mockHypothesis.id}</span>
                <h3 className="text-lg font-semibold text-white">Chiller Unit Anomaly Detected</h3>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-white">Root Cause Hypothesis</span>
                <span className="ml-auto px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-mono">
                  {mockHypothesis.confidence}% confidence
                </span>
              </div>
              <p className="text-neutral-300 mb-4">{mockHypothesis.title}</p>
              
              <div className="space-y-2">
                {mockHypothesis.evidence.map((evidence, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Search className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                    <span className="text-neutral-400">{evidence}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-400">AI Recommendation</span>
                  <p className="text-neutral-300 mt-1">{mockHypothesis.recommendation}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="incident-panel space-y-4">
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-white">Candidate Plans</h3>
              </div>

              <div className="space-y-3">
                {candidatePlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                      selectedPlan === plan.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          selectedPlan === plan.id ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
                        }`}>
                          {plan.id}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{plan.name}</div>
                          <div className="text-sm text-neutral-500">
                            {plan.cost} • {plan.downtime} downtime
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gradient">{plan.riskReduction}%</div>
                        <div className="text-xs text-neutral-500">risk reduction</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500">AI confidence:</span>
                        <span className="font-mono text-amber-400">{plan.confidence}%</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-neutral-600 transition-transform ${
                        selectedPlan === plan.id ? "rotate-90" : ""
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h4 className="font-semibold text-white mb-4">Constraint Check</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Budget Available</span>
                  <span className="text-emerald-400 font-mono">$50,000</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Maintenance Window</span>
                  <span className="text-emerald-400 font-mono">48 hours</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-400">Required Certifications</span>
                  <span className="text-emerald-400">✓ Available</span>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                ✓ Plan {selectedPlan} is feasible within constraints
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
