export type PennantKey = "yale" | "mit" | "generated";

const curatedPennants: Record<string, PennantKey> = {
  "yale": "yale",
  "yale university": "yale",
  "mit": "mit",
  "massachusetts institute of technology": "mit",
};

const pennantColors = [
  { background: "#28734e", foreground: "#f4e8c1" },
  { background: "#f4e8c1", foreground: "#205b3e" },
  { background: "#205b3e", foreground: "#ffffff" },
  { background: "#c6a45c", foreground: "#173d2b" },
];

export function getPennantKey(schoolName: string): PennantKey {
  return curatedPennants[schoolName.trim().toLowerCase()] ?? "generated";
}

export function getPennantInitials(schoolName: string): string {
  const words = schoolName
    .trim()
    .split(/\s+/)
    .filter((word) => !["and", "of", "the", "at"].includes(word.toLowerCase()));

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function getGeneratedPennantColors(schoolName: string) {
  const hash = Array.from(schoolName).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );

  return pennantColors[hash % pennantColors.length];
}

export function addPennantMetadata<T extends { name: string; pennantKey?: string }>(
  school: T,
): T & { pennantKey: PennantKey } {
  return { ...school, pennantKey: getPennantKey(school.name) };
}
