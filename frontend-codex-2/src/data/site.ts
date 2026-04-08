export type GalleryItem = {
  id: string;
  title: string;
  subtitle: string;
  year: string;
  image: string;
  accent: string;
  summary: string;
  bullets: string[];
};

export const marqueeRows = [
  "Hephaestus Forge - spatial product systems - scroll-driven cinema - live worlds - human rhythm - cinematic UI",
  "WebGPU atmospheres - GSAP camera language - Spline depth shifts - product storytelling - premium interactions",
];

export const galleryItems: GalleryItem[] = [
  {
    id: "atlas",
    title: "Atlas Launch World",
    subtitle: "Shopify-opener energy for a systems product landing page",
    year: "2026",
    image: "/reference/work/grillzzy.jpg",
    accent: "#ff8a3d",
    summary:
      "We staged product architecture like cinema: oversized panels, controlled depth, and copy that lands in beats instead of blocks.",
    bullets: ["GSAP section choreography", "Spline-backed hero atmosphere", "Idle-loaded visual layers"],
  },
  {
    id: "ember",
    title: "Ember Commerce Edit",
    subtitle: "Editorial motion with a colder luxury rhythm",
    year: "2025",
    image: "/reference/work/kic.jpg",
    accent: "#77f2e1",
    summary:
      "A shoppable storybook driven by scroll velocity, where the content feels physical instead of flat.",
    bullets: ["Split character reveals", "Blend-mode navigation", "Parallax image stacks"],
  },
  {
    id: "aion",
    title: "Aion Control Layer",
    subtitle: "Dense product messaging turned into a clean spatial system",
    year: "2026",
    image: "/reference/work/lcml.jpg",
    accent: "#f6e6b4",
    summary:
      "Information-heavy sections become breathy and premium when motion, hierarchy, and surface design pull together.",
    bullets: ["Progressive disclosure", "Pinned walkthroughs", "Responsive art direction"],
  },
  {
    id: "citadel",
    title: "Citadel Brand OS",
    subtitle: "A cinematic close with proof, systems, and momentum",
    year: "2024",
    image: "/reference/work/marymount.jpg",
    accent: "#c6a6ff",
    summary:
      "The finale lands with confidence: visual density relaxes, typography opens up, and the call to action feels earned.",
    bullets: ["Rive-ready CTA stage", "3D ambient systems scene", "Reduced-motion fallback"],
  },
  {
    id: "vault",
    title: "Vault Motion System",
    subtitle: "A reusable landing template with luxury pacing",
    year: "2026",
    image: "/reference/work/v1.jpg",
    accent: "#ffb86c",
    summary:
      "This is the reusable layer we can keep pushing: premium motion grammar, modular sections, and real browser-tested behavior.",
    bullets: ["Three + R3F system layer", "Playable transition language", "Reference-driven layout"],
  },
];
