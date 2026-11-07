/**
 * Optional drop-in assets, discovered at BUILD time with import.meta.glob — so the browser never
 * requests a file that doesn't exist (no 404s in the console, no HEAD probes).
 *
 *   src/assets/models/name.glb              → replaces the procedural balloon name
 *   src/assets/me.jpg | me.png              → About portrait (duotone shader applied)
 *   src/assets/projects/<project-id>.png    → replaces that project's generated mock
 */

const pick = (m: Record<string, unknown>) => Object.values(m)[0] as string | undefined;

const shots = import.meta.glob("/src/assets/projects/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const models = import.meta.glob("/src/assets/models/name.glb", { eager: true, query: "?url", import: "default" });
const portraits = import.meta.glob("/src/assets/me.{jpg,jpeg,png,webp}", { eager: true, query: "?url", import: "default" });

export const nameGlbUrl = pick(models);
export const portraitUrl = pick(portraits);

export function projectShot(id: string): string | undefined {
  for (const [path, url] of Object.entries(shots)) {
    const base = path.split("/").pop()!.replace(/\.[a-z]+$/i, "");
    if (base === id) return url;
  }
  return undefined;
}
