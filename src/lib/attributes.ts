import type { Category } from "./demo-data";

/** RPG-style attributes derived from category XP. */
export const ATTRIBUTES = [
  { key: "STR", label: "Strength", from: ["fitness"] as Category[], hue: 25 },
  { key: "END", label: "Endurance", from: ["fitness", "football", "health"] as Category[], hue: 145 },
  { key: "INT", label: "Intellect", from: ["academics", "coding"] as Category[], hue: 200 },
  { key: "WIS", label: "Wisdom", from: ["academics", "lifestyle"] as Category[], hue: 285 },
  { key: "CHA", label: "Charisma", from: ["business", "relationships"] as Category[], hue: 45 },
  { key: "CRE", label: "Creativity", from: ["creativity"] as Category[], hue: 330 },
  { key: "LCK", label: "Fortune", from: ["finance"] as Category[], hue: 105 },
] as const;

export type AttrKey = (typeof ATTRIBUTES)[number]["key"];

/** ~1 point per 200 XP, softly capped. */
export function computeAttributes(categoryXp: Record<Category, number>) {
  return ATTRIBUTES.map((a) => {
    const raw = a.from.reduce((sum, c) => sum + (categoryXp[c] ?? 0), 0);
    const value = Math.floor(Math.sqrt(raw) * 1.6);
    return { ...a, xp: raw, value };
  });
}
