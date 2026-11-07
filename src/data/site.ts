/** data/site.ts — profile + copy for every section. Resume facts only. */

export const profile = {
  name: "Kirtan Kumar Sanghi",
  brand: "KIRTAN.DEV",
  timezone: "Asia/Kolkata",
  tzLabel: "GMT+5:30 IN",
  email: "kirtansanghi@gmail.com",
  phone: "+91-6309071111",
  phoneHref: "tel:+916309071111",
  location: "Hyderabad, Telangana, India",
  linkedin: { label: "linkedin.com/in/kirtan-kumar-sanghi", href: "https://linkedin.com/in/kirtan-kumar-sanghi" },
  github: { label: "github.com/kirtankumarsanghi", href: "https://github.com/kirtankumarsanghi" },
};

export const nav = [
  { id: "work", label: "WORK" },
  { id: "contact", label: "CONTACT" },
];

/* ---------------- hero ---------------- */
export const heroTop = {
  left: ["Backend & ML", "Engineering"],
  middle: ["Thinking in systems.", "Shipping with care."],
  right: "CS undergrad at Manipal University Jaipur building FastAPI, Node.js and ML-powered products.",
};
export const heroHeadline = ["I BUILD INTELLIGENT", "BACKENDS WITH", "CRAFT & CARE"];

/* ---------------- about ---------------- */
export const aboutLead =
  "I build backend systems and applied ML products that are reliable, auditable and fast, from clinical NLP to disaster-response platforms.";

export type Seg = { t: string; kind?: "project" | "kw"; id?: string };
export const aboutSecondary: Seg[] = [
  { t: "I'm a Computer Science undergraduate (CGPA 7.88/10) at Manipal University Jaipur, building " },
  { t: "Nirixon", kind: "project", id: "nirixon" },
  { t: ", " },
  { t: "ResQSync", kind: "project", id: "resqsync" },
  { t: ", " },
  { t: "Cognivia", kind: "project", id: "cognivia" },
  { t: " and " },
  { t: "Taalmel Sync", kind: "project", id: "taalmel" },
  { t: ". Day to day I work in " },
  { t: "Python", kind: "kw" },
  { t: ", " },
  { t: "FastAPI", kind: "kw" },
  { t: ", " },
  { t: "TypeScript", kind: "kw" },
  { t: ", " },
  { t: "Node.js", kind: "kw" },
  { t: ", " },
  { t: "React", kind: "kw" },
  { t: ", " },
  { t: "PostgreSQL", kind: "kw" },
  { t: ", " },
  { t: "Redis", kind: "kw" },
  { t: " and " },
  { t: "Docker", kind: "kw" },
  { t: "." },
];

/* ---------------- warp ---------------- */
export const warpWords: string[][] = [
  ["ENGINEER WITH", "PURPOSE"],
  ["SHIP SMALL", "LOOPS"],
  ["FUTURE-FIRST", "ALWAYS"],
];
export const warpMantras: string[][] = [
  ["Clarity first.", "Delight second."],
  ["Secure by", "default."],
  ["Test it. Trace it.", "Ship it."],
  ["Ship small loops.", "Aim for long arcs."],
];

/* ---------------- skills ---------------- */
export const skillGroups: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["Python 3", "TypeScript", "JavaScript", "C/C++", "Java", "SQL", "HTML5", "CSS3"] },
  {
    group: "Backend & APIs",
    items: [
      "FastAPI",
      "Node.js",
      "Express.js",
      "Flask",
      "REST",
      "Pydantic",
      "Zod",
      "SQLAlchemy",
      "Prisma",
      "Alembic",
      "JWT",
      "Rate Limiting",
      "Event Sourcing",
      "Event-Driven Architecture",
      "Async Processing",
    ],
  },
  { group: "Frontend", items: ["React", "Next.js", "Vite", "Tailwind CSS", "Framer Motion", "Recharts", "Axios"] },
  {
    group: "ML & AI",
    items: [
      "NLP",
      "Scikit-Learn",
      "TensorFlow",
      "TF-IDF",
      "Logistic Regression",
      "Feature Engineering",
      "Model Evaluation",
      "LLMs",
      "Prompt Engineering",
      "Gemini API",
    ],
  },
  { group: "Databases", items: ["PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Supabase"] },
  {
    group: "DevOps & Testing",
    items: [
      "Git",
      "GitHub Actions",
      "Docker",
      "Docker Compose",
      "Postman",
      "Swagger/OpenAPI",
      "Pytest",
      "Vercel",
      "Render",
      "Google Cloud",
    ],
  },
  {
    group: "Concepts & Security",
    items: [
      "RBAC",
      "Audit Logging",
      "GDPR/DPDP",
      "Request Tracing",
      "State Machines",
      "Network Security",
      "Vulnerability Assessment",
      "Incident Response",
      "SIEM",
    ],
  },
];

/* ---------------- education ---------------- */
export const education = [
  { school: "Manipal University Jaipur", degree: "B.Tech CSE", period: "08/2024–05/2028", score: "CGPA 7.88/10" },
  { school: "International Junior College", degree: "12th", period: "04/2023–05/2024", score: "95%" },
  { school: "Bharatiya Vidya Bhavans Public School", degree: "10th", period: "04/2021–05/2022", score: "88%" },
];

export const certifications = [
  { name: "Design and Analysis of Algorithms", issuer: "NPTEL, IIT", year: "2026" },
  { name: "Getting Started with Software Engineering", issuer: "Coursera", year: "" },
  { name: "Crash Course on Python", issuer: "Google", year: "" },
  { name: "Database Foundations", issuer: "Oracle", year: "" },
  { name: "Database Design", issuer: "Oracle", year: "" },
  { name: "Junior Cybersecurity Analyst", issuer: "Cisco", year: "" },
  { name: "Cybersecurity Essentials", issuer: "Cisco", year: "" },
];

/* ---------------- contact ---------------- */
export type HeadWord = { t: string; layer: "front" | "back" };
export type HeadLine = { indent: number; justify: "flex-start" | "flex-end" | "space-between"; gap?: string; words: HeadWord[] };

/* line 1: LET'S left / BUILD right, wide gap. line 2 shifted left, line 3 shifted right.
   `layer` decides whether that word renders under or over the inflated 3D letters. */
export const contactHeadline: HeadLine[] = [
  { indent: 0, justify: "space-between", gap: "6vw", words: [{ t: "LET'S", layer: "front" }, { t: "BUILD", layer: "back" }] },
  { indent: 2, justify: "flex-start", words: [{ t: "SOMETHING", layer: "back" }] },
  { indent: 0, justify: "flex-end", words: [{ t: "EXTRAORDINARY", layer: "front" }] },
];
