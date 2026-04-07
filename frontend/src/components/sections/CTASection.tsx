"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Terminal, Send, Check, Sparkles } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
              ".cta-title",
              { y: 60, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
            );
            gsap.fromTo(
              ".cta-form",
              { y: 40, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.2 }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const splitText = (text: string) => {
    return text.split("").map((char, i) => (
      <span
        key={i}
        className={`inline-block ${char === " " ? "" : "animate-pulse"}`}
        style={{ 
          animationDelay: `${i * 50}ms`,
          textShadow: "0 0 20px rgba(245, 158, 11, 0.5)"
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  return (
    <section
      ref={sectionRef}
      id="cta"
      className="relative min-h-screen w-full py-32 px-6 flex items-center"
    >
      <div className="max-w-4xl mx-auto w-full">
        <div className="cta-title text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Early Access Program
          </div>
          <h2 className="text-5xl md:text-7xl font-bold">
            <span className="text-white">Start preventing</span>
            <br />
            <span className="text-gradient">{splitText("failure today")}</span>
          </h2>
          <p className="mt-6 text-xl text-neutral-400 max-w-2xl mx-auto">
            Join industrial leaders using Hephaestus to eliminate unplanned downtime.
            Get early access and a dedicated implementation specialist.
          </p>
        </div>

        <div className="cta-form max-w-xl mx-auto">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <Terminal className="w-5 h-5" />
                </div>
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-900/80 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Processing</span>
                      </>
                    ) : (
                      <>
                        <span>Request Demo</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-center text-sm text-neutral-500">
                No credit card required. Full platform access for 14 days.
              </p>
            </form>
          ) : (
            <div className="text-center p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Request Received</h3>
              <p className="text-neutral-400">
                Our team will contact you at {email} within 24 hours.
              </p>
            </div>
          )}
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white">500+</div>
            <div className="text-sm text-neutral-500 mt-1">Assets Monitored</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">99.7%</div>
            <div className="text-sm text-neutral-500 mt-1">Uptime Achieved</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">$12M+</div>
            <div className="text-sm text-neutral-500 mt-1">Downtime Avoided</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">14 days</div>
            <div className="text-sm text-neutral-500 mt-1">Avg. Time to Value</div>
          </div>
        </div>
      </div>
    </section>
  );
}
