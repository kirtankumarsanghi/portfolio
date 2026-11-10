/**
 * Everything the GitHub API can't know, merged onto the generated/snapshot repo data by repo name.
 * Case studies use facts from each repository's README only — never invent descriptions, metrics or features.
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
  mock?:
    | "nirixon"
    | "resqsync"
    | "cognivia"
    | "taalmel"
    | "evision"
    | "safepath"
    | "pricing"
    | "cerevia"
    | "locus"
    | "polarsync"
    | "taalmel-health"
    | "vestiq"
    | "thryve"
    | "unisphere"
    | "unbiased"
    | "echona"
    | "saarthi";
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
  resQsync: {
    repo: "resQsync",
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
  cognivia: {
    repo: "cognivia",
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
    liveUrl: "https://cogniviaa.netlify.app/",
    status: "shipped",
  },
  "TaalMel-Sync": {
    repo: "TaalMel-Sync",
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
  EVision: {
    repo: "EVision",
    title: "EVision",
    domain: "ai-ml",
    tags: ["fullstack"],
    year: "2026",
    role: "Data Science + Full-Stack",
    featured: false,
    accent: "#071c17",
    tagline: "EV charging siting without the EV-to-charger ratio.",
    problem:
      "The raw EV-to-charger ratio treats a home-charged scooter and a double-shift commercial auto as the same load. Capital then goes to cities where public fast charging is already adequate and misses the depots where it is genuinely scarce.",
    approach: [
      "Harmonized 3,519 city-month observations across 51 Indian cities from MoRTH Vahan, BEE, Census, MoSPI, PPAC and Open-Meteo ERA5 sources.",
      "Effective-demand metric weights 2W/3W/4W fleets by real public-charging reliance (0.05 / 0.85 / 0.50) instead of counting every EV equally.",
      "Three-model suite: Negative Binomial macro-driver regression, leakage-free Elastic-Net/LDA demand classification, and per-city SARIMA vs Holt-Winters forecast tournaments.",
      "Composite Demand Score (0–100) blends gap, 12-month growth, structural readiness and density, stress-tested with 1,000-run Monte Carlo weight perturbation.",
      "FastAPI service with offline JSON snapshots so the React plan wizard and evidence workbench run with or without the backend.",
    ],
    impact: [
      "3,519 city-months across 51 cities at a 96.9% observed data rate.",
      "M2 cross-validated AUC 0.861 (LDA) and 0.844 (logistic); LOOCV accuracy 78–80%.",
      "28 cities selected SARIMA and 23 selected Holt-Winters; 14–15 of the top 15 kept their ranking across 1,000 Monte Carlo runs.",
      "Commercial 3Ws and 4Ws are under 35% of registered EVs but over 80% of public depot kWh demand.",
    ],
    stack: ["Python", "FastAPI", "scikit-learn", "statsmodels", "pandas", "React", "TypeScript", "Vite", "Tailwind", "Recharts"],
    metrics: [
      { value: "3,519", label: "City-month observations" },
      { value: "51", label: "Cities analyzed" },
      { value: "0.861", label: "Cross-validated AUC" },
      { value: "1,000", label: "Monte Carlo runs" },
    ],
    mock: "evision",
    status: "shipped",
  },
  SafePath: {
    repo: "SafePath",
    title: "SafePath",
    domain: "fullstack",
    tags: ["ai-ml"],
    year: "2026",
    role: "Full-Stack",
    featured: false,
    accent: "#0a1626",
    tagline: "Upload a floor plan. Watch A* find the way out.",
    problem:
      "A floor-plan image is not a graph. Evacuation modelling needs a walkable grid, trustworthy exits and people, and a search you can inspect — otherwise the shortest path is just a line you have to take on faith.",
    approach: [
      "Sharp-based line detection plus offline Tesseract OCR converts a 12 MB / 40 MP floor-plan image into an editable grid; detected exits and coloured symbols stay review candidates, never auto-confirmed.",
      "Human-in-the-loop editor for walls, doors, exits, people and hazards, with threshold tuning, undo and full original-image retention.",
      "A* with Manhattan, Euclidean and Chebyshev heuristics, multi-person / multi-exit solving, and Dijkstra parity tests so no heuristic can silently produce a longer route.",
      "Search runs in a Web Worker and exposes every open/closed node plus g, h and f; fire can be dropped mid-run and the route either reroutes honestly or reports no route.",
      "Next.js 16 + React 19 app with JWT accounts, Drizzle/PGlite persistence, saved plans, run history and a demo fallback when no database is configured.",
    ],
    impact: [
      "17/17 unit tests pass with a strict typecheck and an independent Dijkstra baseline for every heuristic.",
      "Manhattan explored 29–40% fewer nodes than Euclidean across the three sample buildings.",
      "A clean grid costs 10.00; a fire on the route reroutes to 12.00; a sealed route reports 'no route' instead of drawing one.",
    ],
    stack: ["Next.js 16", "React 19", "TypeScript", "A*", "Drizzle ORM", "PGlite/PostgreSQL", "Sharp", "Tesseract.js", "JWT", "Playwright"],
    metrics: [
      { value: "17/17", label: "Unit tests passing" },
      { value: "3", label: "A* heuristics benchmarked" },
      { value: "10.00 → 12.00", label: "Live reroute cost" },
      { value: "29–40%", label: "Fewer nodes explored" },
    ],
    mock: "safepath",
    liveUrl: "https://safe-path-zeta.vercel.app",
    status: "shipped",
  },
  "Pricing-the-Game": {
    repo: "Pricing-the-Game",
    title: "Pricing the Game",
    domain: "creative",
    tags: ["fullstack"],
    year: "2026",
    role: "Frontend + Game Logic",
    featured: false,
    accent: "#1d1409",
    tagline: "A price war you can play, not a definition you memorize.",
    problem:
      "Pricing stops being arithmetic when a competitor can respond. A static spreadsheet cannot show why two rational firms both discount into a worse outcome, or why patience changes the equilibrium.",
    approach: [
      "Three playable chapters: one-shot Prisoner's Dilemma, a 10-week repeated game with Grim Trigger, and a flash-sale Matching Pennies game.",
      "Payoff matrices and equilibrium math live in a pure TypeScript module, separate from the UI, with 21 Vitest tests covering dominance, Nash, the 3/7 collusion threshold and pattern detection.",
      "A δ slider and 10-week auto-projection show when the discounted future punishment outweighs today's temptation; the rival AI reads the last six picks for alternation, repeats and frequency lean.",
      "A four-round debrief scores exploration and board confidence; progress and the top-8 leaderboard persist locally with no backend.",
    ],
    impact: [
      "Shows the one-shot equilibrium at (40, 40) against the cooperative (80, 80) — half the industry profit destroyed by dominant strategies.",
      "Collusion stays stable at δ ≥ 3/7 (≈ 42.9%), the exact threshold the game derives.",
      "21 unit tests cover the payoff tables, equilibrium math, threshold and pattern reader.",
    ],
    stack: ["React 19", "TypeScript", "Vite", "Tailwind v4", "Vitest", "Web Audio"],
    metrics: [
      { value: "3", label: "Playable chapters" },
      { value: "21", label: "Unit tests" },
      { value: "42.9%", label: "Collusion threshold δ" },
      { value: "10", label: "Weeks repeated game" },
    ],
    mock: "pricing",
    liveUrl: "https://pricing-the-game.vercel.app",
    status: "shipped",
  },
  cerevia: {
    repo: "cerevia",
    title: "Cerevia",
    domain: "fullstack",
    tags: ["civic", "creative"],
    year: "2026",
    role: "Full-Stack",
    featured: false,
    accent: "#0e1824",
    tagline: "A daily check-in that turns reflection into a record you can read back.",
    problem:
      "Mental-wellness tools often stop at a mood emoji. Without history, the mood, the journal entry and the task list stay separate signals that never add up to a picture.",
    approach: [
      "React 18 + Vite frontend with Google OAuth, a personal dashboard, mood logging and trend visualisation.",
      "Guided breathing and grounding routines, a journal with edit/delete history, and task planning with completion tracking.",
      "Express + MongoDB API with user-scoped moods, journals, tasks and chat; request-level user scoping and object-id validation keep accounts isolated.",
      "Analytics page combines mood, task, journal and chat activity into one view, with persisted in-app chat history.",
    ],
    impact: [
      "Mood, journal, task and chat activity all resolve to one signed-in user, not a shared demo account.",
      "Every wellness tool writes into the same history that the analytics page reads.",
      "Chat and analytics load from persisted conversations instead of resetting each visit.",
    ],
    stack: ["React 18", "Vite", "React Router", "Node.js", "Express", "MongoDB", "Mongoose", "Google OAuth"],
    metrics: [
      { value: "4", label: "Connected data streams" },
      { value: "Google", label: "OAuth sign-in" },
      { value: "MongoDB", label: "Persistent history" },
      { value: "React 18", label: "Frontend" },
    ],
    mock: "cerevia",
    status: "shipped",
  },
  Locus: {
    repo: "Locus",
    title: "Locus",
    domain: "fullstack",
    tags: ["backend"],
    year: "2026",
    role: "Full-Stack + Real-Time",
    featured: false,
    accent: "#101a31",
    tagline: "Your seat. Not your bag's.",
    problem:
      "Desks sit reserved by bags while students circle the floor, staff have no live occupancy view, and room bookings run on paper. The library has data everywhere except where decisions are made.",
    approach: [
      "Real-time occupancy engine with Socket.IO: available → occupied → away → abandoned → reset, with automated desk recovery and 13 live events.",
      "Student app with quick-select, QR and manual check-in, plus AI seat recommendations scored on usage history, preferred zone, availability, noise match and recent activity.",
      "Staff floor map and admin console for desk/room management, alerts, broadcasts, utilisation analytics and CSV/Excel/JSON/PDF exports.",
      "Node/Express + TypeScript API with SQLite WAL mode, indexed queries and 60+ endpoints across three roles.",
    ],
    impact: [
      "170+ features across student, staff and admin surfaces; 60+ API endpoints and 13 real-time events.",
      "Recommendation score is explicit: 40% previous usage, 25% preferred zone, 15% availability, 10% noise match, 10% recent activity.",
      "Abandoned desks return to the pool automatically instead of waiting for a staff sweep.",
    ],
    stack: ["React 18", "TypeScript", "Vite", "Tailwind", "Recharts", "Socket.IO", "Node.js", "Express", "SQLite"],
    metrics: [
      { value: "170+", label: "Features shipped" },
      { value: "60+", label: "API endpoints" },
      { value: "13", label: "Real-time events" },
      { value: "5", label: "Recommendation signals" },
    ],
    mock: "locus",
    liveUrl: "https://locus-mocha.vercel.app",
    status: "shipped",
  },
  "polarsync-edge": {
    repo: "polarsync-edge",
    title: "PolarSync Edge",
    domain: "backend",
    tags: ["ai-ml"],
    year: "2026",
    role: "Backend + ML",
    featured: false,
    accent: "#091a25",
    tagline: "An air-gapped microgrid that explains every shed decision.",
    problem:
      "At Bharati and Maitri, a wrong load decision can threaten life support. Cloud dashboards are unavailable, forecasts must run locally, and an automated system cannot be allowed to shed a critical circuit.",
    approach: [
      "Offline-first stack — Next.js PWA, Node/TypeScript backend, TimescaleDB, ONNX Runtime — packaged for a single Docker Compose cold start on station hardware.",
      "Runs PyTorch LSTM demand (~900 kWh/day) and XGBoost solar (~520 kWh/day) models natively in Node in under 20 ms, with a Python training/export pipeline alongside.",
      "Rules engine enforces Tier-1 life-safety invariants, Tier-2 science load shifting, Tier-3 curtailment and a 30% battery reserve ring-fence.",
      "Human-in-the-loop interlock keeps Tier-1 circuits hardware-locked; every decision is written to an immutable audit ledger and pushed to the commander tablet over 5-second WebSockets.",
    ],
    impact: [
      "Tier-1 habitat heating, medical oxygen and satellite comms can never be shed by automation.",
      "Forecasts execute locally in under 20 ms with no cloud dependency.",
      "Every load decision carries an explanation and an audit entry the commander can review.",
    ],
    stack: ["Next.js 14", "React 18", "TypeScript", "Node.js", "ONNX Runtime", "PyTorch", "XGBoost", "TimescaleDB", "Docker", "Socket.IO"],
    metrics: [
      { value: "<20 ms", label: "Local ONNX inference" },
      { value: "900 kWh/day", label: "Demand forecast" },
      { value: "520 kWh/day", label: "Solar forecast" },
      { value: "3", label: "Criticality tiers" },
    ],
    mock: "polarsync",
    status: "shipped",
  },
  "TaalMel-Health": {
    repo: "TaalMel-Health",
    title: "Taalmel Health",
    domain: "backend",
    tags: ["civic", "ai-ml"],
    year: "2026",
    role: "Backend + AI Tooling",
    featured: false,
    accent: "#0a1b1d",
    tagline: "Coordination across providers, without letting the AI guess.",
    problem:
      "Prescribed, dispensed and reported medications live in different providers' records. Conflicting doses and duplicate diagnoses stay invisible until someone checks by hand — and a model that invents a finding is worse than no model.",
    approach: [
      "Deterministic reconciliation engine for duplicate medications, dose conflicts, pairwise interactions, brand-to-generic aliasing and ICD-10 hierarchy distance.",
      "Free-text prescription parser handles lines like 'Tab. Dolo 650mg BD x 5 days' — no FHIR or structured EHR required.",
      "Point-of-prescribing check answers 'is it safe to give this now' and fails closed when a drug is not recognised; household mode flags cross-person bottle mix-ups.",
      "An MCP server exposes the same engine as tools, so an LLM can narrate findings but every claim must trace back to a returned JSON field.",
    ],
    impact: [
      "28 passing tests across reconciliation, parsing, point-of-care and household flows.",
      "Unknown drug coverage returns safe_to_proceed: false rather than a guessed 'safe'.",
      "AI narration is constrained to cited engine output — no invented interactions or diagnoses.",
    ],
    stack: ["Python 3", "FastAPI", "Pydantic", "MCP", "pytest", "SQLite", "uvicorn"],
    metrics: [
      { value: "28", label: "Tests passing" },
      { value: "6", label: "MCP tools" },
      { value: "Fail-closed", label: "Unknown drug handling" },
      { value: "3", label: "Input modes" },
    ],
    mock: "taalmel-health",
    status: "shipped",
  },
  vestiq: {
    repo: "vestiq",
    title: "VestIQ",
    domain: "fullstack",
    tags: ["backend"],
    year: "2026",
    role: "Full-Stack",
    featured: false,
    accent: "#0a1a15",
    tagline: "Goals, portfolio and insights in one place.",
    problem:
      "A portfolio view without goals is trivia, and a goal list without portfolio data is wishful thinking. The two need to be read together.",
    approach: [
      "Next.js 14 frontend with dashboard, goals, portfolio, insights, onboarding and profile routes.",
      "Recharts visualisations and a dark product shell shared across every authenticated view.",
      "Express + Mongoose API with JWT auth and user-scoped models.",
      "Onboarding captures the user's starting point before the dashboard renders.",
    ],
    impact: [
      "Dashboard, portfolio and goals share one authenticated user context.",
      "Insights are derived from the same records the user edits, not a separate sample dataset.",
      "JWT-protected API with Mongoose models for user-scoped data.",
    ],
    stack: ["Next.js 14", "React 18", "JavaScript", "Recharts", "Node.js", "Express", "MongoDB", "Mongoose", "JWT"],
    metrics: [
      { value: "6", label: "App routes" },
      { value: "JWT", label: "Protected API" },
      { value: "MongoDB", label: "User-scoped data" },
      { value: "Recharts", label: "Portfolio insights" },
    ],
    mock: "vestiq",
    status: "wip",
  },
  THRYVE: {
    repo: "THRYVE",
    title: "THRYVE",
    domain: "fullstack",
    tags: ["backend"],
    year: "2026",
    role: "Full-Stack",
    featured: false,
    accent: "#14151c",
    tagline: "Goals, approvals and audit trails in one workflow.",
    problem:
      "Goal tracking breaks when it lives in spreadsheets: approvals go stale, weightages drift, and nobody can reconstruct who changed what.",
    approach: [
      "Role-based goal lifecycle for employees, managers and admins, with a max of 8 goals, a 10% minimum weight and a 100% total weight cap.",
      "Manager approval queue that locks approved goals; admins can unlock through a governed action.",
      "Quarterly check-ins with Min/Max/Zero/Timeline UoM scoring and live completion percentages.",
      "FastAPI + SQLAlchemy + SQLite backend with JWT, bcrypt, audit logs and analytics endpoints; React + Recharts frontend.",
    ],
    impact: [
      "Every approval, rejection, check-in and unlock is written to the audit log.",
      "Weightage validation runs before a goal can enter review.",
      "Department, team and quarterly trends come from live API queries.",
    ],
    stack: ["React 18", "Vite", "Tailwind", "Recharts", "Framer Motion", "FastAPI", "SQLAlchemy", "SQLite", "JWT"],
    metrics: [
      { value: "3", label: "Governed roles" },
      { value: "8", label: "Goal cap" },
      { value: "100%", label: "Weightage cap" },
      { value: "Audit", label: "Every action logged" },
    ],
    mock: "thryve",
    liveUrl: "https://thryve-ruddy.vercel.app/",
    status: "shipped",
  },
  UNISPHERE: {
    repo: "UNISPHERE",
    title: "UNISPHERE",
    domain: "fullstack",
    tags: ["edtech"],
    year: "2026",
    role: "Full-Stack",
    featured: false,
    accent: "#0d1426",
    tagline: "177 institutions, one comparable dataset.",
    problem:
      "College choice is scattered across PDFs, forums and outdated cutoff tables. Students compare fees from one page with placements from another and call it research.",
    approach: [
      "Seeded 177 institutions — all 23 IITs, 31 NITs, 26 IIITs, 47 GFTIs and 50+ private/deemed colleges — with courses, placements, reviews and cutoffs.",
      "Server Components query Prisma directly for listing and detail pages; URL search params own search, filters, sort and pagination.",
      "Side-by-side comparison for up to three colleges, with best-value highlighting per row and Zustand compare-tray state.",
      "Rank-based predictor maps JEE Advanced/JEE Main/BITSAT/GATE/CAT rank to historical closing ranks; Gemini 2.5 Flash powers a college-aware campus guide.",
      "NextAuth credentials, bcrypt, saved colleges/comparisons, and an in-memory fallback when Neon is unavailable.",
    ],
    impact: [
      "1,239 courses, 531 reviews and ~1,000 cutoffs sit behind one searchable dataset.",
      "Comparison holds up to three colleges and highlights the best value per row.",
      "Predictor groups matches by college and orders by closest closing rank.",
    ],
    stack: ["Next.js 14", "TypeScript", "Tailwind", "PostgreSQL", "Prisma", "NextAuth", "Zustand", "Gemini", "Vercel AI SDK"],
    metrics: [
      { value: "177", label: "Institutions seeded" },
      { value: "1,239", label: "Courses" },
      { value: "3-way", label: "College comparison" },
      { value: "5", label: "Exams supported" },
    ],
    mock: "unisphere",
    liveUrl: "https://unisphere-xi.vercel.app",
    status: "shipped",
  },
  "Unbiased-ai": {
    repo: "Unbiased-ai",
    title: "Unbiased AI",
    domain: "ai-ml",
    tags: ["backend"],
    year: "2026",
    role: "Full-Stack + ML",
    featured: false,
    accent: "#111429",
    tagline: "A governance console that also helps people reason.",
    problem:
      "AI dashboards audit models but leave the person on the other side of the decision with a one-sided recommendation and no visibility into uncertainty.",
    approach: [
      "Fairness auditing across demographic parity, equalized odds, disparate impact, calibration and subgroup slices.",
      "Model registry with versions, deployment tracking and drift/telemetry views; SHAP and proxy-variable explainability.",
      "Public decision tools for purchases, news, careers and arguments that compare both sides and surface bias and uncertainty.",
      "FastAPI + PostgreSQL + Redis + Celery with WebSocket telemetry, policy thresholds, incident workflows and compliance exports; React command-center UI.",
    ],
    impact: [
      "Implemented: dashboards, auth flows, fairness auditing, model registry, realtime infrastructure, report generation and intervention flows.",
      "Partially implemented: explainability studio, public intelligence suite, policy engine and realtime websocket UI.",
      "Documented as a pre-production MVP rather than claiming production coverage.",
    ],
    stack: ["React 18", "TypeScript", "Vite", "Tailwind", "FastAPI", "SQLAlchemy", "PostgreSQL", "Redis", "Celery", "Docker", "Kubernetes", "Prometheus", "Grafana"],
    metrics: [
      { value: "5", label: "Fairness metrics" },
      { value: "4", label: "Mitigation modes" },
      { value: "Docker + K8s", label: "Deployment targets" },
      { value: "MVP", label: "Pre-production stage" },
    ],
    mock: "unbiased",
    status: "wip",
  },
  Echona: {
    repo: "Echona",
    title: "Echona",
    domain: "creative",
    tags: ["ai-ml", "fullstack"],
    year: "2026",
    role: "Full-Stack + ML",
    featured: false,
    accent: "#1b1024",
    tagline: "Emotion in, music out.",
    problem:
      "A playlist labelled 'sad' is a genre guess. Real emotional state is multimodal — face, voice and text can disagree, and the recommendation should know which signal it trusted.",
    approach: [
      "Three-service architecture: React frontend, Express session/API layer, and a Flask ML service.",
      "Multimodal emotion inference across face, voice and text, with a fusion endpoint that returns confidence and source metadata for every prediction.",
      "Mood-based music recommendations with therapy context (goal, strategy, energy, tags) and Spotify OAuth for playlists and playback.",
      "Wellness loop of mood history, journal, planner, habits, guided chat and a music-intelligence panel; the backend proxy adds retry and timeout around cold ML services.",
    ],
    impact: [
      "Every prediction carries confidence and provenance instead of a bare label.",
      "Backend proxy retries and times out cold ML calls so the UI stays usable.",
      "Session auth, CSRF protection, rate limiting and security headers guard the API.",
    ],
    stack: ["React 19", "Vite", "Tailwind", "Framer Motion", "Node.js", "Express", "MongoDB", "Flask", "TensorFlow", "OpenCV", "Librosa", "Spotify API"],
    metrics: [
      { value: "3", label: "Emotion modalities" },
      { value: "3", label: "Services" },
      { value: "Confidence + source", label: "Every prediction" },
      { value: "Spotify", label: "OAuth playback" },
    ],
    mock: "echona",
    liveUrl: "https://echona-qanj.vercel.app",
    status: "shipped",
  },
  Saarthi_Smart_Resource_Allocation_Platform: {
    repo: "Saarthi_Smart_Resource_Allocation_Platform",
    title: "Saarthi",
    domain: "civic",
    tags: ["fullstack"],
    year: "2026",
    role: "Fork — Operations Dashboard",
    featured: false,
    accent: "#0c1c21",
    tagline: "Match relief needs to volunteers while the window is open.",
    problem:
      "In a district control room, needs, volunteers, alerts and reports sit in separate spreadsheets. By the time a match is made by hand, the urgency window has moved.",
    approach: [
      "React + Vite operations dashboard with React Query caching and Socket.IO live awareness for needs, volunteers, alerts and activity.",
      "AI-assisted need-to-volunteer matching with confidence and reasoning; operators confirm or reject each suggestion.",
      "Express + Mongoose API under /api/v1 with JWT auth and node-cron checks that raise alerts for critical pressure zones.",
      "Analytics and report generation from live operational data, with in-memory-safe behaviour when MongoDB is unavailable.",
    ],
    impact: [
      "Needs, volunteers, matches, alerts, analytics and reports share one operational data layer.",
      "Critical zone pressure can raise alerts automatically instead of waiting for a manual review.",
      "Dashboard refreshes are driven by mutations and cache invalidation, not manual reloads.",
    ],
    stack: ["React", "Vite", "React Router", "React Query", "Socket.IO", "Node.js", "Express", "MongoDB", "Mongoose", "JWT", "node-cron"],
    metrics: [
      { value: "10", label: "API areas" },
      { value: "Live", label: "Socket awareness" },
      { value: "AI", label: "Need matching" },
      { value: "Fork", label: "Original by OmWattamwar2911" },
    ],
    mock: "saarthi",
    status: "fork",
  },
};
