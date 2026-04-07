"use client";

import { useState, useCallback } from "react";
import LoadingScreen from "@/components/loading/LoadingScreen";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/hero/HeroSection";
import FleetSection from "@/components/sections/FleetSection";
import IncidentSection from "@/components/sections/IncidentSection";
import SimulationSection from "@/components/sections/SimulationSection";
import CTASection from "@/components/sections/CTASection";
import Footer from "@/components/Footer";
import Marquee from "@/components/marquee/Marquee";
import ParticleOverlay from "@/components/ParticleOverlay";
import CursorGlow from "@/components/CursorGlow";
import ScrollProgress from "@/components/ScrollProgress";
import FeatureCarousel from "@/components/FeatureCarousel";
import SmoothScroll from "@/components/SmoothScroll";
import AmbientBackground from "@/components/AmbientBackground";

const marqueeItems1 = [
  "PREDICTIVE MAINTENANCE",
  "AI-POWERED ANALYTICS",
  "FLEET INTELLIGENCE",
  "RISK VISIBILITY",
  "EQUIPMENT MONITORING",
  "FAILURE PREDICTION",
];

const marqueeItems2 = [
  "INDUSTRIAL AUTOMATION",
  "ROOT CAUSE ANALYSIS",
  "DECISION OPTIMIZATION",
  "DOWNTIME PREVENTION",
  "SMART MAINTENANCE",
  "ASSET MANAGEMENT",
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <SmoothScroll>
      <>
        <AmbientBackground />
        {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
        <Navigation />
        <ScrollProgress />
        <ParticleOverlay />
        <CursorGlow />
        <main className="relative">
          <HeroSection isLoaded={isLoaded} />

          <div className="py-12 overflow-hidden">
            <Marquee items={marqueeItems1} direction="left" speed={30} />
          </div>

          <FleetSection />

          <div className="py-12 overflow-hidden">
            <Marquee items={marqueeItems2} direction="right" speed={25} />
          </div>

          <section className="py-24 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <span className="font-mono text-sm text-amber-500 tracking-widest uppercase">
                  Platform Features
                </span>
                <h2 className="mt-4 text-4xl md:text-5xl font-bold text-white">
                  Explore the <span className="text-gradient">ecosystem</span>
                </h2>
              </div>
              <FeatureCarousel />
            </div>
          </section>

          <IncidentSection />
          <SimulationSection />
          <CTASection />
          <Footer />
        </main>
      </>
    </SmoothScroll>
  );
}
