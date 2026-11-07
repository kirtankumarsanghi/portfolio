import { certifications, education, profile, skillGroups } from "@/data/site";
import { projects } from "@/data/projects";

/** Minimal dependency-free PDF writer — builds the résumé from the same data the site renders. */

const A = (s: string) =>
  s
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00b7\u2022]/g, "|")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

type Line = { t: string; size: number; bold?: boolean; before?: number };

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + " " + w).length > max) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

function collect(): Line[] {
  const L: Line[] = [];
  const head = (t: string) => L.push({ t, size: 11, bold: true, before: 14 });
  const para = (t: string, size = 9.5, prefix = "", max = 100) =>
    wrap(A(t), max).forEach((s, i) => L.push({ t: (i === 0 ? prefix : " ".repeat(prefix.length)) + s, size }));

  L.push({ t: A(profile.name.toUpperCase()), size: 20, bold: true });
  L.push({ t: "Backend Engineering | Applied ML | Full-Stack", size: 10, before: 2 });
  L.push({ t: A(`${profile.location} | ${profile.email} | ${profile.phone}`), size: 9, before: 4 });
  L.push({ t: A(`${profile.linkedin.label} | ${profile.github.label}`), size: 9 });

  head("SUMMARY");
  para("CS undergrad at Manipal University Jaipur building FastAPI, Node.js and ML-powered products.");

  head("PROJECTS");
  projects.forEach((p) => {
    L.push({ t: A(`${p.title} - ${p.subtitle} (${p.year})`), size: 10, bold: true, before: 6 });
    para(`Stack: ${p.stack.join(", ")}`, 9);
    ;(p.approach.length ? p.approach : [p.subtitle]).forEach((b) => para(b, 9.5, "- ", 96));
  });

  head("SKILLS");
  skillGroups.forEach((g) => para(`${g.group}: ${g.items.join(", ")}`, 9.5, "", 98));

  head("EDUCATION");
  education.forEach((e) => para(`${e.school}, ${e.degree}, ${e.period}, ${e.score}`));

  head("CERTIFICATIONS");
  certifications.forEach((c) => para(`${c.name} (${c.issuer}${c.year ? `, ${c.year}` : ""})`, 9.5, "- "));
  return L;
}

export function buildResumePdf(): Blob {
  const lines = collect();
  const pages: string[] = [];
  let ops = "";
  let y = 800;
  const flush = () => {
    pages.push(ops);
    ops = "";
    y = 800;
  };
  for (const l of lines) {
    const lead = l.size * 1.42 + (l.before ?? 0);
    if (y - lead < 54) flush();
    y -= lead;
    ops += `BT /${l.bold ? "F2" : "F1"} ${l.size} Tf 50 ${y.toFixed(1)} Td (${esc(l.t)}) Tj ET\n`;
  }
  flush();

  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((s, i) => {
    objs[5 + i * 2] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    objs[6 + i * 2] = `<< /Length ${s.length} >>\nstream\n${s}endstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadResume() {
  const url = URL.createObjectURL(buildResumePdf());
  const a = document.createElement("a");
  a.href = url;
  a.download = "Kirtan-Kumar-Sanghi-Resume.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
