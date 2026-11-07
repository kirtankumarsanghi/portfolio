/**
 * Everything the GitHub API can't know, merged onto the generated/snapshot repo data by repo name.
 * Featured case studies use résumé facts only — never invent descriptions, metrics or features.
 * Projects without an override render with auto data and the label "DETAILS COMING SOON".
 */

import type { DomainId } from "./domains";

export type ProjectOverride = {
  repo: string;
  title: string;
  /** primary domain */
  domain: DomainId;
  /** secondary domains — the project appears in each of these too */
  tags: DomainId[];
  year: string;
  role?: string;
  featured: boolean;
  /** solid page colour for the detail view */
  accent: string;
  tagline?: string;
  problem?: string;
  approach?: string[];
  impact?: string[];
  stack?: string[];
  metrics?: { value: string; label: string }[];
  mock?: "nirixon" | "resqsync" | "cognivia" | "taalmel";
  liveUrl?: string;
  status: "shipped" | "wip" | "fork" | "archived";
};

export const overrides: Record<string, ProjectOverride> = {
  Nirixon: {
    repo: "Nirixon",
    title: "Nirixon",
    domain: "ai-ml",
    tags: ["civic"],
    year: "2026",
    role: "ML + Backend",
    featured: true,
    accent: "#0d1230",
    tagline: "Screening free-text into clinical signal, then adapting the assessment.",
    problem:
      "Parent concerns arrive as unstructured, multilingual free text. Triage needs structured risk signal across clinical domains, and an assessment long enough to be thorough is long enough that families abandon it.",
    approach: [
      "Async NLP intake engine classifying parent free-text into 8 clinical neurodevelopmental domains, trained on 32,700+ multilingual samples (English, Hindi, Hinglish).",
      "Hybrid triage classifier (TF-IDF n-grams, Logistic Regression, rule-based safeguards) with regex negation handling and crisis detection with 100% recall on acute safety triggers.",
      "Computerized Adaptive Testing engine over 2,400+ psychometric items (405 constructs) cutting question burden 25–40% at >0.97 domain F1.",
      "Pytest suites for edge cases and 4xx/422 validation.",
    ],
    impact: [
      "Crisis detection held 100% recall on acute safety triggers across evaluation runs.",
      "Question burden reduced 25–40% against a fixed-length battery at >0.97 domain F1.",
      "Coverage extended across English, Hindi and Hinglish intake in one pipeline.",
    ],
    stack: ["Python 3", "FastAPI", "Scikit-Learn", "Pydantic", "SQLAlchemy", "Pytest"],
    metrics: [
      { value: "32,700+", label: "Multilingual samples" },
      { value: "100%", label: "Recall, acute safety triggers" },
      { value: ">0.97", label: "Domain F1" },
      { value: "2,400+", label: "Psychometric items" },
    ],
    mock: "nirixon",
    status: "shipped",
  },
  ResQSync: {
    repo: "ResQSync",
    title: "ResQSync",
    domain: "civic",
    tags: ["fullstack", "backend"],
    year: "2026",
    role: "Full-Stack",
    featured: true,
    accent: "#0f1a2c",
    tagline: "Disaster response is a concurrency problem with human stakes.",
    problem:
      "During a multi-district emergency, several coordinators request the same constrained supply at once. Without deterministic contention handling, allocations double-count and the audit trail cannot explain what was decided.",
    approach: [
      "Multi-district supply coordination resolving concurrent contention via database locks and a transactional outbox.",
      "RBAC workspaces (Incident Commanders, Coordinators, Field Responders), map-based incident tracking, GDPR/DPDP governance (PII export/scrubbing, session revocation, tamper-resistant audit logs).",
      "X-Request-ID tracing, rate limiting, 77+ Pytest tests across a PostgreSQL/SQLite matrix in CI.",
    ],
    impact: [
      "Concurrent resource contention resolves deterministically instead of last-write-wins.",
      "77+ tests run across a PostgreSQL and SQLite matrix on every push.",
      "Every allocation decision is traceable to a user, a workspace and a request id.",
    ],
    stack: ["Python 3", "FastAPI", "React 18", "TypeScript", "PostgreSQL", "SQLite", "Pytest", "GitHub Actions"],
    metrics: [
      { value: "77+", label: "Pytest tests" },
      { value: "3", label: "RBAC workspaces" },
      { value: "PG + SQLite", label: "CI matrix" },
      { value: "X-Request-ID", label: "Request tracing" },
    ],
    mock: "resqsync",
    status: "shipped",
  },
  Cognivia: {
    repo: "Cognivia",
    title: "Cognivia",
    domain: "edtech",
    tags: ["fullstack", "ai-ml"],
    year: "2026",
    role: "Full-Stack + AI",
    featured: true,
    accent: "#141031",
    tagline: "Read the room, then teach to what is actually confusing.",
    problem:
      "Classroom telemetry exists but is not actionable. A teacher needs to know which concept is failing and for whom, during the lesson rather than after it.",
    approach: [
      "Real-time classroom telemetry and concept-mastery tracking for students and educators.",
      "Gemini structured JSON output for explanations, diagnostic questions, adaptive analogies.",
      "Weighted-recency confusion index (10-signal rolling window with decay) feeding heatmaps and revision queues; 14+ PostgreSQL tables with RBAC.",
    ],
    impact: [
      "Confusion surfaces as a per-concept heatmap a teacher can act on mid-lesson.",
      "Revision queues are generated from the same rolling index, not from raw scores.",
      "14+ PostgreSQL tables with role-based access for student and educator views.",
    ],
    stack: ["React", "TypeScript", "Node.js", "Express", "Supabase", "Google Gemini API", "Tailwind", "Vite", "Recharts"],
    metrics: [
      { value: "10", label: "Signal rolling window" },
      { value: "14+", label: "PostgreSQL tables" },
      { value: "JSON", label: "Structured Gemini output" },
      { value: "RBAC", label: "Student & educator roles" },
    ],
    mock: "cognivia",
    status: "shipped",
  },
  "Taalmel-Sync": {
    repo: "Taalmel-Sync",
    title: "Taalmel Sync",
    domain: "backend",
    tags: ["civic"],
    year: "2026",
    role: "Backend",
    featured: true,
    accent: "#0b1526",
    tagline: "Three sources of medication truth that disagree.",
    problem:
      "Prescribed, observed and patient-reported medication data arrive separately and conflict. Reconciliation has to be deterministic, auditable and must never guess when coverage is unknown.",
    approach: [
      "Append-only event store reconciling prescribed, observed and patient-reported medication data with full audit provenance.",
      "Deterministic conflict-detection pipeline (7-category discrepancy taxonomy, brand-to-generic normalization, fail-closed NOT_COVERED validation) with Redis-backed async jobs and idempotent handlers.",
      "Zod validation, JWT RBAC, rate limiting, Helmet; 10+ unit/integration test suites; Docker Compose.",
    ],
    impact: [
      "Every reconciliation outcome carries full audit provenance back to the source event.",
      "Unknown coverage resolves fail-closed rather than silently passing.",
      "10+ unit and integration suites run against a reproducible Compose environment.",
    ],
    stack: ["TypeScript", "Node.js", "Express", "Prisma", "PostgreSQL", "SQLite", "Redis", "Zod", "Docker", "Postman"],
    metrics: [
      { value: "7", label: "Discrepancy categories" },
      { value: "10+", label: "Test suites" },
      { value: "Redis", label: "Async jobs" },
      { value: "Fail-closed", label: "NOT_COVERED validation" },
    ],
    mock: "taalmel",
    status: "shipped",
  },
  Echona: {
    repo: "Echona",
    title: "Echona",
    domain: "creative",
    tags: [],
    year: "—",
    featured: false,
    accent: "#3a1030",
    status: "shipped",
  },
  Saarthi_Smart_Resource_Allocation_Platform: {
    repo: "Saarthi_Smart_Resource_Allocation_Platform",
    title: "Saarthi",
    domain: "civic",
    tags: [],
    year: "—",
    featured: false,
    accent: "#123340",
    status: "fork",
  },
  "Unbiased-ai": {
    repo: "Unbiased-ai",
    title: "Unbiased-ai",
    domain: "ai-ml",
    tags: [],
    year: "—",
    featured: false,
    accent: "#131a3a",
    status: "wip",
  },
  THRYVE: {
    repo: "THRYVE",
    title: "THRYVE",
    domain: "playground",
    tags: [],
    year: "—",
    featured: false,
    accent: "#23262e",
    status: "wip",
  },
  UNISPHERE: {
    repo: "UNISPHERE",
    title: "UNISPHERE",
    domain: "playground",
    tags: [],
    year: "—",
    featured: false,
    accent: "#23262e",
    status: "wip",
  },
};
