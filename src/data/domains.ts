/** Domains for the Work explorer. Edit freely — the UI is driven by this list. */

export type DomainId =
  | "ai-ml"
  | "backend"
  | "fullstack"
  | "civic"
  | "edtech"
  | "creative"
  | "playground";

export type Domain = {
  id: string;
  name: string;
  /** short label for the chip filter bar */
  chip: string;
  description: string;
  accent: string;
  glyph: string;
};

export const domains: Domain[] = [
  {
    id: "ai-ml",
    name: "AI & Machine Learning",
    chip: "AI & ML",
    description: "NLP pipelines, LLM applications and fairness work.",
    accent: "#1b2fe0",
    glyph: "◈",
  },
  {
    id: "backend",
    name: "Backend & Systems",
    chip: "BACKEND",
    description: "APIs, event sourcing, data integrity and infrastructure.",
    accent: "#0f3d91",
    glyph: "▤",
  },
  {
    id: "fullstack",
    name: "Full-Stack Web Apps",
    chip: "FULL-STACK",
    description: "Typed end-to-end products with React frontends.",
    accent: "#123a63",
    glyph: "◫",
  },
  {
    id: "civic",
    name: "Civic-Tech & Social Impact",
    chip: "CIVIC-TECH",
    description: "Emergency response, resource allocation and health.",
    accent: "#0d5c52",
    glyph: "✚",
  },
  {
    id: "edtech",
    name: "EdTech & Campus",
    chip: "EDTECH",
    description: "Classroom intelligence, tutoring and campus tooling.",
    accent: "#3a2a7a",
    glyph: "◇",
  },
  {
    id: "creative",
    name: "Creative & Consumer",
    chip: "CREATIVE",
    description: "Music, experiments and things built for delight.",
    accent: "#7a2a5c",
    glyph: "✧",
  },
  {
    id: "playground",
    name: "Playground",
    chip: "PLAYGROUND",
    description: "Coursework, practice and everything not yet sorted.",
    accent: "#3d4450",
    glyph: "⬚",
  },
];

export const domainById = (id: string) => domains.find((d) => d.id === id);
